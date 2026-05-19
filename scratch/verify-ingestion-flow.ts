import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!supabaseUrl || !supabaseKey || !apiKey) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

async function getOrCreateCourse(courseCode: string): Promise<string | null> {
  const normalized = courseCode.replace(/\s+/g, '').toUpperCase();
  
  // 1. Try selecting existing course
  const { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('code', normalized)
    .maybeSingle();
    
  if (existing?.id) return existing.id;
  
  // Also check with space (e.g. "BIO 102")
  const spaced = normalized.replace(/^([A-Z]+)(\d+)$/, '$1 $2');
  const { data: existingSpaced } = await supabase
    .from('courses')
    .select('id')
    .eq('code', spaced)
    .maybeSingle();
    
  if (existingSpaced?.id) return existingSpaced.id;
  
  // 2. Create the course if missing
  console.log(`[getOrCreateCourse] Course "${normalized}" not found in DB. Creating automatically...`);
  const { data: newCourse, error } = await supabase
    .from('courses')
    .insert([
      {
        code: normalized,
        title: `Course ${normalized}`,
        description: `Automatically generated course space for ${normalized}.`
      }
    ])
    .select('id')
    .single();
    
  if (error) {
    console.error(`[getOrCreateCourse] Failed to create course "${normalized}":`, error.message);
    return null;
  }
  
  return newCourse.id;
}

async function test() {
  const courseCode = 'BIO102';
  console.log(`Starting JIT Ingestion verify script for ${courseCode}...`);

  // 1. Resolve/create course ID
  const courseId = await getOrCreateCourse(courseCode);
  if (!courseId) {
    console.error("Failed to get/create course ID");
    return;
  }
  console.log(`Course context ID: ${courseId}`);

  // 2. Scan Storage folders
  const BUCKET = 'materials';
  const scannedPaths = [
    `${courseCode}/Question`,
    `${courseCode}/Questions`
  ];
  const allStorageFiles: { name: string; fullPath: string }[] = [];

  for (const folderPath of scannedPaths) {
    console.log(`Scanning storage folder: ${folderPath}`);
    const { data: fileList, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(folderPath, { limit: 50 });

    if (listError) {
      console.warn(`Folder list error for ${folderPath}:`, listError.message);
      continue;
    }

    if (fileList && fileList.length > 0) {
      fileList
        .filter((f: any) => f.id && f.name !== '.emptyFolderPlaceholder' && f.name.endsWith('.pdf'))
        .forEach((f: any) => {
          allStorageFiles.push({
            name: f.name,
            fullPath: `${folderPath}/${f.name}`
          });
        });
    }
  }

  if (allStorageFiles.length === 0) {
    console.error("No question PDFs found in storage!");
    return;
  }

  console.log(`Found ${allStorageFiles.length} storage question papers:`, allStorageFiles.map(f => f.fullPath));

  const firstFile = allStorageFiles[0];
  console.log(`\nTesting Gemini vision ingestion on first file: ${firstFile.fullPath}`);

  // Determine material tracker row
  const { data: existingMat } = await supabase
    .from('course_materials')
    .select('id, parsed_content')
    .eq('file_url', firstFile.fullPath)
    .maybeSingle();

  let materialId = existingMat?.id;
  let parsedString = existingMat?.parsed_content;

  if (!existingMat) {
    const { data: newMat, error: insertMatErr } = await supabase
      .from('course_materials')
      .insert([
        {
          course_id: courseId,
          title: firstFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') + ' (Questions)',
          file_url: firstFile.fullPath,
          is_active: true
        }
      ])
      .select('id')
      .single();

    if (!insertMatErr && newMat) {
      materialId = newMat.id;
      console.log(`Created new material row tracker with ID: ${materialId}`);
    } else {
      console.error("Failed to insert material tracker row:", insertMatErr?.message);
      return;
    }
  } else {
    console.log(`Found existing material row tracker: ${materialId}`);
  }

  if (parsedString) {
    console.log("File is already parsed! Questions preview from database:");
    try {
      const parsed = JSON.parse(parsedString);
      console.log(parsed.slice(0, 3));
      return;
    } catch {
      console.warn("Cached JSON is invalid, re-parsing...");
    }
  }

  // Download and run Gemini
  console.log("Downloading PDF file...");
  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(firstFile.fullPath);
  if (dlErr || !blob) {
    console.error("Download failed:", dlErr?.message);
    return;
  }

  console.log("Converting buffer to Base64...");
  const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');

  console.log("Sending to Gemini Vision...");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
    You are an advanced academic OCR coordinator.
    Carefully analyse this scanned exam/question paper document.
    Extract a maximum of 15 multiple-choice questions from this document to prevent response truncation and speed up the run.
    
    Return ONLY a JSON array. No preamble, no explanation, no markdown fencing.
    Format strictly as:
    [{ "question_text": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation": "..." }]
    
    Rules:
    - Extract a MAXIMUM of 15 questions.
    - question_text must be the full question sentence.
    - options must be exactly 4 strings prefixed with A), B), C), D).
    - correct_answer must be a single uppercase letter (A, B, C, or D). If not stated, infer or default to "A".
  `;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType: 'application/pdf' } },
    ]);
    const responseText = stripFences(result.response.text());
    const parsed = JSON.parse(responseText);

    console.log(`Gemini successfully extracted ${parsed.length} questions!`);
    console.log("First question preview:", parsed[0]);

    // Save to database
    console.log("Caching parsed questions back into course_materials...");
    const { error: updateErr } = await supabase
      .from('course_materials')
      .update({ parsed_content: responseText })
      .eq('id', materialId);

    if (updateErr) {
      console.error("Failed to cache questions inside DB:", updateErr.message);
    } else {
      console.log("✓ Successfully cached questions! JIT Ingestion workflow works 100%!");
    }

  } catch (err: any) {
    console.error("Vision ingestion execution failed:", err.message);
  }
}

test();
