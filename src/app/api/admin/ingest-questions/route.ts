import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAdminRole } from '@/lib/admin';
import { rateLimit } from '@/lib/rate-limit';
import { htmlToPlainText } from '@/lib/utils';

// Allow up to 60 seconds on Vercel
export const maxDuration = 60;

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'html' || ext === 'htm') return 'text/html';
  if (ext === 'txt') return 'text/plain';
  return 'application/octet-stream';
}

/**
 * Normalizes course codes (e.g. "BIO 102" -> "BIO102") and checks or inserts 
 * the course dynamically in the database to satisfy the foreign key constraint.
 */
async function getOrCreateCourse(supabase: any, courseCode: string): Promise<string | null> {
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

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error: GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY is not set in Vercel settings.' }, { status: 500 });
    }

    const supabase = await createClient();
    const { isAdmin, userId } = await verifyAdminRole(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate Limiting: 2 requests per admin per 10 minutes (bulk ingestion is expensive)
    const limitRes = await rateLimit(`admin_ingest_${userId}`, 2, 10 * 60 * 1000);
    if (!limitRes.success) {
      return NextResponse.json(
        { error: 'Too many ingestion requests. Please wait 10 minutes before running another bulk ingestion.' },
        { status: 429 }
      );
    }

    const { bucket = 'materials' } = await req.json().catch(() => ({}));

    // 1. List all folders in the bucket to find courses
    const { data: rootFolders, error: listError } = await supabase.storage.from(bucket).list('', {
      limit: 100,
      offset: 0,
    });

    if (listError) {
      console.error('Bucket list error:', listError);
      throw listError;
    }

    console.log('Found root folders:', rootFolders?.map(f => f.name));
    const results: any[] = [];

    // Initialize Gemini SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    for (const folder of rootFolders || []) {
      if (!folder.id) continue; // Skip files at root, we want folders (courses)
      
      const courseCode = folder.name;
      console.log(`\n--- Scanning course: ${courseCode} ---`);

      // Resolve or create course ID
      const courseId = await getOrCreateCourse(supabase, courseCode);
      if (!courseId) {
        console.warn(`[${courseCode}] Could not resolve or create course ID — skipping folder`);
        continue;
      }

      // Fetch course details for smart prompt scoping
      const { data: dbCourseObj } = await supabase
        .from('courses')
        .select('code, title')
        .eq('id', courseId)
        .single();
      
      const dbCourseCode = dbCourseObj?.code || courseCode;
      const dbCourseTitle = dbCourseObj?.title || `Course ${courseCode}`;

      // 2. List files in both Questions and Question subfolders
      const qFolders = [`${courseCode}/Questions`, `${courseCode}/Question`];
      const allFiles: { name: string; fullPath: string }[] = [];

      for (const qFolder of qFolders) {
        const { data: questionFiles, error: qListError } = await supabase.storage
          .from(bucket)
          .list(qFolder, { limit: 50 });

        if (!qListError && questionFiles) {
          questionFiles
            .filter(f => {
              if (!f.id) return false;
              const ext = f.name.split('.').pop()?.toLowerCase();
              return ['pdf', 'html', 'htm', 'txt'].includes(ext || '');
            })
            .forEach(f => {
              allFiles.push({
                name: f.name,
                fullPath: `${qFolder}/${f.name}`
              });
            });
        }
      }

      console.log(`[${courseCode}] Found ${allFiles.length} files in scanned folders:`, allFiles.map(f => f.fullPath));

      for (const file of allFiles) {
        console.log(`\n[${courseCode}] Processing file: ${file.fullPath}`);

        try {
          // Check if course_materials row already exists for this file_url
          const { data: existingMat } = await supabase
            .from('course_materials')
            .select('id')
            .eq('file_url', file.fullPath)
            .maybeSingle();

          let materialId = existingMat?.id;

          // If not existing, create row linked to courseId
          if (!existingMat) {
            const { data: newMat, error: insertMatErr } = await supabase
              .from('course_materials')
              .insert([
                {
                  course_id: courseId,
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
              console.error(`[${courseCode}] Failed to insert material tracker row:`, insertMatErr?.message);
              continue;
            }
          }

          // 3. Download the raw file buffer directly from Supabase Storage
          const { data: fileBlob, error: downloadError } = await supabase.storage.from(bucket).download(file.fullPath);
          if (downloadError || !fileBlob) {
            console.error(`[${courseCode}] Download error for ${file.name}:`, downloadError);
            throw downloadError || new Error('Downloaded file is empty');
          }

          const fileMimeType = getMimeType(file.name);
          let base64Data: string;
          let mimeTypeToSend = fileMimeType;
          if (fileMimeType === 'text/html') {
            const textContent = Buffer.from(await fileBlob.arrayBuffer()).toString('utf-8');
            const cleaned = htmlToPlainText(textContent);
            base64Data = Buffer.from(cleaned, 'utf-8').toString('base64');
            mimeTypeToSend = 'text/plain';
          } else {
            base64Data = Buffer.from(await fileBlob.arrayBuffer()).toString('base64');
          }
          console.log(`[${courseCode}] File downloaded, size: ${fileBlob.size} bytes. Launching Gemini multimodal OCR...`);

          // 4. Route to Gemini Vision Interface to read scanned PDFs natively
          const prompt = `
            You are an advanced academic OCR coordinator. 
            Carefully analyze every page of this scanned document. 
            Extract all questions, multiple-choice options, and answers verbatim.
            
            CRITICAL CONSTRAINT: You must ONLY extract questions that belong to the course "${dbCourseCode} - ${dbCourseTitle}".
            For example, if this is GST101, only extract English grammar/comprehension questions. If MTH101, only math questions.
            If this document does not contain questions for this specific course, or contains questions for a different course, return an empty JSON array []. Do NOT bleed questions from other subjects or courses.
            
            Return the data strictly as a structured JSON array. 
            Do not include any chat prefix, suffix, explanations, or wrapping metadata outside the JSON array.
            
            Format your response strictly as a JSON array of question objects matching this TypeScript schema:
            Array<{
              question_text: string;
              options: string[];
              correct_answer: string; // Verbatim letter (A, B, C, or D). If not clearly specified in the text, infer it or default to "A".
              explanation?: string;
            }>
          `;

          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeTypeToSend
              }
            }
          ]);

          let rawResponseText = result.response.text();
          console.log(`[${courseCode}] Gemini Vision response received.`);

          // Bulletproof extraction: Strip markdown code fences if present
          rawResponseText = rawResponseText.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
          const parsedQuestions = JSON.parse(rawResponseText);

          if (!Array.isArray(parsedQuestions)) {
            throw new Error('Gemini response did not return a valid JSON array');
          }

          const formattedQuestions = parsedQuestions.map((q: any) => ({
            question_text: q.question_text || q.question || '',
            options: Array.isArray(q.options) ? q.options : [],
            correct_answer: q.correct_answer || q.correct_option || 'A',
            explanation: q.explanation || null
          })).filter(q => q.question_text.length > 5);

          console.log(`[${courseCode}] Successfully extracted ${formattedQuestions.length} questions.`);

          // 5. Update course_materials row
          if (formattedQuestions.length > 0 && materialId) {
            const { error: updateError } = await supabase
              .from('course_materials')
              .update({ parsed_content: JSON.stringify(formattedQuestions) })
              .eq('id', materialId);
            
            if (updateError) {
              console.error(`[${courseCode}] Database update error:`, updateError.message);
            } else {
              console.log(`[${courseCode}] Successfully cached ${formattedQuestions.length} questions in course_materials.`);
              results.push({
                file: file.fullPath,
                course: courseCode,
                count: formattedQuestions.length
              });
            }
          }
        } catch (fileErr: any) {
          console.error(`[${courseCode}] Critical error processing ${file.name}:`, fileErr.message);
        }
      }
    }

    console.log(`\n=== Bulk Multimodal Ingestion Complete. Total Processed: ${results.length} files ===\n`);

    return NextResponse.json({
      success: true,
      processed: results,
      totalFiles: results.length,
      totalQuestions: results.reduce((acc, curr) => acc + curr.count, 0)
    });

  } catch (error: any) {
    console.error('Ingestion API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
