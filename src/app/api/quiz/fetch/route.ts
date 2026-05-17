import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Allow up to 60 seconds for Gemini vision processing on Vercel
export const maxDuration = 60;

const BUCKET = 'materials';

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get('courseCode');

    if (!courseCode) {
      return NextResponse.json({ error: 'Course code is required' }, { status: 400 });
    }

    // Normalize: strip spaces for storage path matching (DB codes may have spaces like "BIO 102",
    // but storage folders are "BIO102")
    const storageCode = courseCode.replace(/\s+/g, '');

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Try fetching existing questions from the database
    //    Check both the raw courseCode AND the normalized storageCode
    const { data, error } = await supabase
      .from('exam_questions')
      .select('*')
      .or(`course_code.eq.${courseCode},course_code.eq.${storageCode}`)
      .limit(60);

    if (error) {
      console.error('[quiz/fetch] Fetch questions error:', error);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    // 2. If questions already exist in DB, shuffle and return them
    if (data && data.length > 0) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, 20);

      return NextResponse.json({
        courseCode,
        questions: selectedQuestions,
        totalAvailable: data.length,
        source: 'database',
      });
    }

    // 3. No questions in DB — attempt on-demand vision ingestion from storage
    console.log(`[quiz/fetch] No DB questions for "${courseCode}" (storage: "${storageCode}"). Starting on-demand ingestion...`);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('[quiz/fetch] Cannot auto-ingest: GOOGLE_GENERATIVE_AI_API_KEY not set.');
      return NextResponse.json({
        questions: [],
        message: 'No questions found for this course yet.',
      });
    }

    // Use the normalized storage code (no spaces) for the bucket path
    const questionPath = `${storageCode}/Questions`;
    console.log(`[quiz/fetch] Scanning storage path: "${BUCKET}/${questionPath}"`);

    const { data: fileList, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(questionPath, { limit: 50 });

    if (listError) {
      console.error(`[quiz/fetch] Storage list error for "${questionPath}":`, listError.message);
      return NextResponse.json({
        questions: [],
        message: `Storage listing failed: ${listError.message}`,
      });
    }

    if (!fileList || fileList.length === 0) {
      console.warn(`[quiz/fetch] Empty folder: "${questionPath}"`);
      return NextResponse.json({
        questions: [],
        message: `No files found in storage at ${questionPath}/`,
      });
    }

    console.log(`[quiz/fetch] Files found in "${questionPath}":`, fileList.map(f => ({ name: f.name, id: f.id })));

    // Accept any file with an id (real files, not folders) — not just .pdf
    const realFiles = fileList.filter((f: any) => f.id && f.name !== '.emptyFolderPlaceholder');

    if (realFiles.length === 0) {
      console.warn(`[quiz/fetch] No real files under "${questionPath}" (only folders or placeholders)`);
      return NextResponse.json({
        questions: [],
        message: 'No question papers found in storage for this course.',
      });
    }

    // 4. Download, vision-parse, and insert each file
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    let totalInserted = 0;

    for (const file of realFiles) {
      const storagePath = `${questionPath}/${file.name}`;
      console.log(`[quiz/fetch] Downloading: ${storagePath}`);

      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(storagePath);
      if (dlErr || !blob) {
        console.error(`[quiz/fetch] Download failed for ${storagePath}:`, dlErr?.message);
        continue;
      }

      const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
      console.log(`[quiz/fetch] File size: ${blob.size} bytes. Sending to Gemini vision...`);

      const prompt = `
        You are an advanced academic OCR coordinator.
        Carefully analyse every page of this scanned exam/question paper document.
        Extract every multiple-choice question, all answer options, and the correct answer verbatim.
        
        Return ONLY a JSON array. No preamble, no explanation, no markdown fencing.
        Format strictly as:
        [{ "question_text": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A" }]
        
        Rules:
        - question_text must be the full question sentence.
        - options must be exactly 4 strings prefixed with A), B), C), D).
        - correct_answer must be a single uppercase letter (A, B, C, or D). If not stated, infer or default to "A".
        - Filter out any text that is not a question (e.g. instructions, headers).
      `;

      let rawResponse: string;
      try {
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64, mimeType: 'application/pdf' } },
        ]);
        rawResponse = stripFences(result.response.text());
        console.log(`[quiz/fetch] Gemini responded (${rawResponse.length} chars)`);
      } catch (geminiErr: any) {
        console.error(`[quiz/fetch] Gemini error for ${storagePath}:`, geminiErr.message);
        continue;
      }

      let parsedQuestions: Array<{ question_text: string; options: string[]; correct_answer: string }>;
      try {
        parsedQuestions = JSON.parse(rawResponse);
        if (!Array.isArray(parsedQuestions)) throw new Error('Not an array');
      } catch {
        console.error(`[quiz/fetch] JSON parse failed for ${storagePath}. First 300 chars:`, rawResponse.slice(0, 300));
        continue;
      }

      // Store under the normalized storage code so both lookups work
      const formatted = parsedQuestions
        .map((q: any) => ({
          course_code: storageCode,
          question_text: (q.question_text || '').trim(),
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer: (q.correct_answer || 'A').trim(),
        }))
        .filter(q => q.question_text.length > 5);

      if (formatted.length > 0) {
        const { error: insertErr } = await supabase.from('exam_questions').insert(formatted);
        if (insertErr) {
          console.error(`[quiz/fetch] DB insert error:`, insertErr.message);
        } else {
          totalInserted += formatted.length;
          console.log(`[quiz/fetch] ✓ Inserted ${formatted.length} questions from ${file.name}`);
        }
      }
    }

    // 5. Re-fetch the freshly inserted questions and return them
    if (totalInserted > 0) {
      const { data: freshData } = await supabase
        .from('exam_questions')
        .select('*')
        .or(`course_code.eq.${courseCode},course_code.eq.${storageCode}`)
        .limit(60);

      const shuffled = [...(freshData || [])].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, 20);

      return NextResponse.json({
        courseCode,
        questions: selectedQuestions,
        totalAvailable: freshData?.length || 0,
        source: 'live-ingestion',
        filesProcessed: realFiles.length,
        questionsExtracted: totalInserted,
      });
    }

    return NextResponse.json({
      questions: [],
      message: 'No questions could be extracted from the available documents.',
      debug: { storageCode, questionPath, filesFound: realFiles.map(f => f.name) },
    });

  } catch (error: any) {
    console.error('[quiz/fetch] Fatal error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
