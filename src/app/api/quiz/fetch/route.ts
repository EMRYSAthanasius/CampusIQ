import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Allow up to 60 seconds for Gemini vision processing on Vercel
export const maxDuration = 60;

const BUCKET = 'materials';

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'html' || ext === 'htm') return 'text/html';
  if (ext === 'txt') return 'text/plain';
  return 'application/octet-stream';
}

function cleanHtml(html: string): string {
  let cleaned = html;
  // 1. Remove style, script, head, link, meta, svg, iframe, noscript tags
  cleaned = cleaned.replace(/<head[^>]*?>[\s\S]*?<\/head>/gi, '');
  cleaned = cleaned.replace(/<style[^>]*?>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*?>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<svg[^>]*?>[\s\S]*?<\/svg>/gi, '');
  cleaned = cleaned.replace(/<iframe[^>]*?>[\s\S]*?<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<noscript[^>]*?>[\s\S]*?<\/noscript>/gi, '');
  cleaned = cleaned.replace(/<link[^>]*?>/gi, '');
  cleaned = cleaned.replace(/<meta[^>]*?>/gi, '');
  
  // 2. Remove inline attributes that add massive bloat (class, style, id, data-*)
  cleaned = cleaned.replace(/\s(class|style|id|onclick|onhover|data-[a-zA-Z0-9\-]+)=["\'][^"\']*?["\']/gi, '');
  
  // 3. Remove base64 images inside src attributes
  cleaned = cleaned.replace(/src="data:image\/[^;]+;base64,[^"]+"/gi, 'src=""');
  cleaned = cleaned.replace(/src='data:image\/[^;]+;base64,[^']+'/gi, "src=''");
  
  // 4. Remove empty tags
  cleaned = cleaned.replace(/<span[^>]*?>\s*<\/span>/gi, '');
  
  // 5. Normalize newlines and spaces
  cleaned = cleaned.replace(/\n\s*\n/g, '\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  return cleaned.trim();
}

/**
 * Normalizes course codes (e.g. "BIO 102" -> "BIO102") and checks or inserts 
 * the course dynamically in the database to satisfy the foreign key constraint.
 */
async function getOrCreateCourse(supabase: any, adminSupabase: any, courseCode: string): Promise<string | null> {
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
  
  // 2. Create the course if missing (using only basic physical columns in remote DB)
  console.log(`[getOrCreateCourse] Course "${normalized}" not found in DB. Creating automatically...`);
  const { data: newCourse, error } = await adminSupabase
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get('courseCode');

    if (!courseCode) {
      return NextResponse.json({ error: 'Course code is required' }, { status: 400 });
    }

    const storageCode = courseCode.replace(/\s+/g, '').toUpperCase();
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Resolve or create course ID
    const courseId = await getOrCreateCourse(supabase, adminSupabase, courseCode);
    if (!courseId) {
      return NextResponse.json({ error: 'Could not find or create course context' }, { status: 500 });
    }

    // 1.5 Get or create dynamic mock quiz record for this course
    const { data: existingQuiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('course_id', courseId)
      .eq('type', 'mock_exam')
      .maybeSingle();

    let quizId = existingQuiz?.id;
    if (!quizId) {
      const { data: newQuiz, error: newQuizErr } = await adminSupabase
        .from('quizzes')
        .insert([{
          course_id: courseId,
          title: `${storageCode} Dynamic Mock Exam`,
          description: 'Automatically generated mock exam from course materials.',
          type: 'mock_exam',
          difficulty: 'medium'
        }])
        .select('id')
        .single();
        
      if (!newQuizErr && newQuiz) {
        quizId = newQuiz.id;
      } else {
        const errorMsg = newQuizErr?.message || 'No quiz returned';
        console.error('[quiz/fetch] Failed to create mock quiz record:', errorMsg);
        return NextResponse.json({ error: `Database Error: ${errorMsg}` }, { status: 500 });
      }
    }

    // 2. Query existing course_materials matching "/Questions/" or "/Question/"
    const { data: materials, error: matErr } = await supabase
      .from('course_materials')
      .select('*')
      .eq('course_id', courseId);

    if (matErr) {
      console.error('[quiz/fetch] course_materials query error:', matErr.message);
      return NextResponse.json({ error: 'Failed to fetch course materials' }, { status: 500 });
    }

    // Filter materials for question files (case insensitive URL check)
    const questionMaterials = (materials || []).filter((m: any) => 
      m.file_url.toLowerCase().includes('/question/') || 
      m.file_url.toLowerCase().includes('/questions/')
    );

    // 3. If matching materials have parsed_content questions, parse and return them
    const cachedQuestions: any[] = [];
    for (const m of questionMaterials) {
      if (m.parsed_content) {
        try {
          const parsed = JSON.parse(m.parsed_content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Transform questions into structured format
            parsed.forEach((q: any) => {
              cachedQuestions.push({
                id: q.id || `${m.id}-${cachedQuestions.length}`,
                course_code: storageCode,
                question_text: q.question_text || q.question || '',
                options: Array.isArray(q.options) ? q.options : [],
                correct_answer: q.correct_answer || q.correct_option || 'A',
                explanation: q.explanation || null
              });
            });
          }
        } catch (e) {
          console.warn(`[quiz/fetch] Failed to parse cached questions JSON for material ID ${m.id}`);
        }
      }
    }

    if (cachedQuestions.length > 0) {
      console.log(`[quiz/fetch] Found ${cachedQuestions.length} cached questions in course_materials for ${storageCode}`);
      const shuffled = [...cachedQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 20);

      return NextResponse.json({
        courseCode,
        quizId,
        questions: selected,
        totalAvailable: cachedQuestions.length,
        source: 'database-cache',
      });
    }

    // 4. No cached questions — perform JIT vision ingestion from storage bucket
    console.log(`[quiz/fetch] No cached questions for "${courseCode}". Starting JIT ingestion...`);
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('[quiz/fetch] Cannot run vision ingestion: GOOGLE_GENERATIVE_AI_API_KEY not set.');
      return NextResponse.json({
        questions: [],
        message: 'No questions found for this course yet.',
      });
    }

    // Scan both "Question" and "Questions" subfolders under this course in storage
    const scannedPaths = [
      `${storageCode}/Question`,
      `${storageCode}/Questions`,
      `${storageCode.toLowerCase()}/question`,
      `${storageCode.toLowerCase()}/questions`
    ];

    const allStorageFiles: { name: string; fullPath: string }[] = [];

    for (const folderPath of scannedPaths) {
      const { data: fileList, error: listError } = await supabase.storage
        .from(BUCKET)
        .list(folderPath, { limit: 100 });

      if (!listError && fileList && fileList.length > 0) {
        fileList
          .filter((f: any) => {
            if (!f.id || f.name === '.emptyFolderPlaceholder') return false;
            const ext = f.name.split('.').pop()?.toLowerCase();
            return ['pdf', 'html', 'htm', 'txt'].includes(ext || '');
          })
          .forEach((f: any) => {
            allStorageFiles.push({
              name: f.name,
              fullPath: `${folderPath}/${f.name}`
            });
          });
      }
    }

    if (allStorageFiles.length === 0) {
      console.warn(`[quiz/fetch] No question papers found in storage scanned paths:`, scannedPaths);
      return NextResponse.json({
        questions: [],
        message: 'No question papers found in storage for this course.',
      });
    }

    console.log(`[quiz/fetch] Found ${allStorageFiles.length} storage files for processing:`, allStorageFiles.map(f => f.fullPath));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const liveQuestions: any[] = [];

    for (const file of allStorageFiles) {
      // Check if course_materials row already exists for this file_url
      const { data: existingMat } = await supabase
        .from('course_materials')
        .select('*')
        .eq('file_url', file.fullPath)
        .maybeSingle();

      let materialId = existingMat?.id;
      let parsedString = existingMat?.parsed_content;

      // If the row doesn't exist, create it linked to courseId
      if (!existingMat) {
        const { data: newMat, error: insertMatErr } = await adminSupabase
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
          console.error('[quiz/fetch] Failed to insert material tracker row:', insertMatErr?.message);
        }
      }

      // If already parsed inside existing row, use it
      if (parsedString) {
        try {
          const parsed = JSON.parse(parsedString);
          if (Array.isArray(parsed)) {
            parsed.forEach((q: any) => {
              liveQuestions.push({
                id: q.id || `${materialId}-${liveQuestions.length}`,
                course_code: storageCode,
                question_text: q.question_text || q.question || '',
                options: Array.isArray(q.options) ? q.options : [],
                correct_answer: q.correct_answer || q.correct_option || 'A',
                explanation: q.explanation || null
              });
            });
            continue; // Skip calling Gemini for this file
          }
        } catch {
          // JSON parse failed, fall through to re-ingest
        }
      }

      // Ingest the file using Gemini Vision
      console.log(`[quiz/fetch] Processing live file: ${file.fullPath}`);
      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(file.fullPath);
      if (dlErr || !blob) {
        console.error(`[quiz/fetch] Download failed for ${file.fullPath}:`, dlErr?.message);
        continue;
      }

      const fileMimeType = getMimeType(file.name);
      let base64: string;
      if (fileMimeType === 'text/html') {
        const textContent = Buffer.from(await blob.arrayBuffer()).toString('utf-8');
        const cleaned = cleanHtml(textContent);
        base64 = Buffer.from(cleaned, 'utf-8').toString('base64');
      } else {
        base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
      }

      const prompt = `
        You are an advanced academic OCR coordinator.
        Carefully analyse this scanned exam/question paper document.
        Extract a maximum of 35 multiple-choice questions from this document to prevent response truncation.
        Choose a balanced sample representing different topics covered in the document.
        
        Return ONLY a JSON array. No preamble, no explanation, no markdown fencing.
        Format strictly as:
        [{ "question_text": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation": "..." }]
        
        Rules:
        - Extract a MAXIMUM of 35 questions.
        - question_text must be the full question sentence.
        - options must be exactly 4 strings prefixed with A), B), C), D).
        - correct_answer must be a single uppercase letter (A, B, C, or D). If not stated, infer or default to "A".
        - explanation should be a short explanation of the answer, if possible.
        - Filter out any text that is not a question (e.g. instructions, headers).
      `;

      try {
        const fileMimeType = getMimeType(file.name);
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64, mimeType: fileMimeType } },
        ]);
        const responseText = stripFences(result.response.text());
        const parsed = JSON.parse(responseText);

        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[quiz/fetch] Gemini successfully parsed ${parsed.length} questions from ${file.name}`);
          
          // Cache the parsed JSON string inside the course_materials row
          if (materialId) {
            await adminSupabase
              .from('course_materials')
              .update({ parsed_content: responseText })
              .eq('id', materialId);
          }

          // Add to accumulated live questions
          parsed.forEach((q: any) => {
            liveQuestions.push({
              id: q.id || `${materialId || 'temp'}-${liveQuestions.length}`,
              course_code: storageCode,
              question_text: q.question_text || q.question || '',
              options: Array.isArray(q.options) ? q.options : [],
              correct_answer: q.correct_answer || q.correct_option || 'A',
              explanation: q.explanation || null
            });
          });
        }
      } catch (err: any) {
        console.error(`[quiz/fetch] Failed vision ingestion for file "${file.fullPath}":`, err.message);
      }
    }

    if (liveQuestions.length > 0) {
      const shuffled = [...liveQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 20);

      return NextResponse.json({
        courseCode,
        quizId,
        questions: selected,
        totalAvailable: liveQuestions.length,
        source: 'live-ingestion-caching',
      });
    }

    return NextResponse.json({
      questions: [],
      message: 'No questions could be extracted from the available documents.',
    });

  } catch (error: any) {
    console.error('[quiz/fetch] Fatal error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
