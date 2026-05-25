import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'html' || ext === 'htm') return 'text/html';
  if (ext === 'txt') return 'text/plain';
  return 'application/octet-stream';
}

function htmlToPlainText(html: string): string {
  let text = html;
  text = text.replace(/<head[^>]*?>[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<style[^>]*?>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*?>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<svg[^>]*?>[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<iframe[^>]*?>[\s\S]*?<\/iframe>/gi, '');
  text = text.replace(/<noscript[^>]*?>[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<header[^>]*?>[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<footer[^>]*?>[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<nav[^>]*?>[\s\S]*?<\/nav>/gi, '');

  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<br[^>]*?>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');

  text = text.replace(/<[^>]*?>/g, '');

  const entities: Record<string, string> = {
    '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"',
    '&apos;': "'", '&#39;': "'", '&cent;': '¢', '&pound;': '£',
    '&yen;': '¥', '&euro;': '€', '&copy;': '©', '&reg;': '®', '&deg;': '°'
  };
  text = text.replace(/&[a-z0-9#]+;/gi, (match) => entities[match.toLowerCase()] || match);
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');

  return text.trim();
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

async function ingestFileSmart(courseCode: string, courseTitle: string, file: { name: string; fullPath: string }) {
  console.log(`\n--- SMART Ingesting ${courseCode} ("${courseTitle}"): ${file.name} ---`);
  
  // Resolve or create course in database
  const normalized = courseCode.replace(/\s+/g, '').toUpperCase();
  let { data: course } = await supabase.from('courses').select('id').eq('code', normalized).maybeSingle();
  if (!course) {
    const spaced = normalized.replace(/^([A-Z]+)(\d+)$/, '$1 $2');
    const { data: cSpaced } = await supabase.from('courses').select('id').eq('code', spaced).maybeSingle();
    course = cSpaced;
  }
  
  if (!course) {
    console.error(`Course record not found for ${courseCode} in DB.`);
    return;
  }

  // Find or create material tracker
  const { data: existingMat } = await supabase
    .from('course_materials')
    .select('*')
    .eq('file_url', file.fullPath)
    .maybeSingle();

  let materialId = existingMat?.id;

  if (!existingMat) {
    const { data: newMat, error: insertMatErr } = await supabase
      .from('course_materials')
      .insert([
        {
          course_id: course.id,
          title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') + ' (Questions)',
          file_url: file.fullPath,
          is_active: true
        }
      ])
      .select('id')
      .single();

    if (!insertMatErr && newMat) {
      materialId = newMat.id;
    } else {
      console.error('Failed to create material tracker:', insertMatErr?.message);
      return;
    }
  }

  console.log('Downloading file...');
  const { data: blob, error: dlErr } = await supabase.storage.from('materials').download(file.fullPath);
  if (dlErr || !blob) {
    console.error('Download failed:', dlErr?.message);
    return;
  }

  const fileMimeType = getMimeType(file.name);
  let base64: string;
  let mimeTypeToSend = fileMimeType;

  if (fileMimeType === 'text/html') {
    const textContent = Buffer.from(await blob.arrayBuffer()).toString('utf-8');
    const cleaned = htmlToPlainText(textContent);
    base64 = Buffer.from(cleaned, 'utf-8').toString('base64');
    mimeTypeToSend = 'text/plain';
    console.log(`HTML stripped. Size: ${Buffer.byteLength(cleaned)} bytes.`);
  } else {
    base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
    console.log(`Direct payload size: ${blob.size} bytes.`);
  }

  // Smart scoped prompt
  const prompt = `
    You are an advanced academic OCR coordinator.
    Carefully analyse this exam/question paper document.
    Extract a maximum of 35 multiple-choice questions from this document.
    
    CRITICAL CONSTRAINT: You must ONLY extract questions that belong to the course "${courseCode} - ${courseTitle}".
    - If this course is GST 101: Use of English I, ONLY extract English grammar, vocabulary, or comprehension questions.
    - If this course is GST 103: Use of Library and ICT, ONLY extract library science, cataloging, citation, or computer/ICT questions.
    - If this course is GST 105: Entrepreneurship, ONLY extract entrepreneurship, startup, cantillon, or business questions.
    - If this course is MTH 101: Elementary Mathematics I, ONLY extract math, algebra, surds, sequences, or calculus questions.
    
    If this document does not contain questions for this specific course, or contains questions for a different course, return an empty JSON array []. Do NOT bleed questions from other subjects or courses.
    
    Return ONLY a JSON array. No preamble, no explanation, no markdown fencing.
    Format strictly as:
    [{ "question_text": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation": "..." }]
    
    Rules:
    - Extract a MAXIMUM of 35 questions.
    - question_text must be the full question sentence.
    - options must be exactly 4 strings prefixed with A), B), C), D).
    - correct_answer must be a single uppercase letter (A, B, C, or D).
  `;

  console.log('Calling Gemini...');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType: mimeTypeToSend } }
    ]);

    const responseText = stripFences(result.response.text());
    let cleanedResponse = responseText.replace(/\\x[0-9a-fA-F]{2}/g, '');
    const parsed = JSON.parse(cleanedResponse);

    if (Array.isArray(parsed)) {
      console.log(`Success! Parsed ${parsed.length} questions.`);
      const { error: updateError } = await supabase
        .from('course_materials')
        .update({ parsed_content: JSON.stringify(parsed) })
        .eq('id', materialId);

      if (updateError) {
        console.error('Database update failed:', updateError.message);
      } else {
        console.log('Saved successfully to DB cache.');
      }
    } else {
      console.error('Parsed result is not an array.');
    }
  } catch (err: any) {
    console.error('Gemini processing failed:', err.message);
  }
}

async function main() {
  const { data: dbCourses } = await supabase.from('courses').select('*');
  if (!dbCourses) return;

  const { data: root } = await supabase.storage.from('materials').list('', { limit: 100 });
  if (!root) return;

  // Let's run smart sweeps specifically on the courses reported to bleed: GST101, GST103, GST105, MTH101
  const targets = ['GST101'];
  
  for (const item of root) {
    if (!item.id && item.name !== '.emptyFolderPlaceholder') {
      const courseCode = item.name.replace(/\s+/g, '').toUpperCase();
      if (!targets.includes(courseCode)) continue;
      
      const dbCourse = dbCourses.find((c: any) => c.code.replace(/\s+/g, '').toUpperCase() === courseCode);
      const courseTitle = dbCourse?.title || `Course ${courseCode}`;
      
      const scannedPaths = [`${item.name}/Questions`, `${item.name}/Question`];
      
      for (const p of scannedPaths) {
        const { data: files } = await supabase.storage.from('materials').list(p, { limit: 100 });
        if (files) {
          for (const f of files) {
            if (f.id && f.name !== '.emptyFolderPlaceholder') {
              const ext = f.name.split('.').pop()?.toLowerCase();
              if (['html', 'htm'].includes(ext || '')) {
                await ingestFileSmart(item.name, courseTitle, { name: f.name, fullPath: `${p}/${f.name}` });
              }
            }
          }
        }
      }
    }
  }
}

main().catch(console.error);
