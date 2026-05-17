import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Try fetching existing questions from the database first
    const { data, error } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('course_code', courseCode)
      .limit(60);

    if (error) {
      console.error('Fetch questions error:', error);
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
    console.log(`[quiz/fetch] No questions found for ${courseCode}. Attempting on-demand ingestion from storage...`);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('[quiz/fetch] Cannot auto-ingest: GOOGLE_GENERATIVE_AI_API_KEY not set.');
      return NextResponse.json({
        questions: [],
        message: 'No questions found for this course yet.',
      });
    }

    // Scan the Questions subfolder under the course in storage
    const questionPath = `${courseCode}/Questions`;
    const { data: fileList, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(questionPath, { limit: 50 });

    if (listError || !fileList) {
      console.warn(`[quiz/fetch] Could not list "${questionPath}":`, listError?.message);
      return NextResponse.json({
        questions: [],
        message: 'No questions found for this course yet.',
      });
    }

    const pdfFiles = fileList.filter((f: any) => f.id && f.name.endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      console.warn(`[quiz/fetch] No PDFs found under "${questionPath}"`);
      return NextResponse.json({
        questions: [],
        message: 'No question papers found in storage for this course.',
      });
    }

    // 4. Download, vision-parse, and insert each PDF
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    let totalInserted = 0;

    for (const file of pdfFiles) {
      const storagePath = `${questionPath}/${file.name}`;
      console.log(`[quiz/fetch] Processing: ${storagePath}`);

      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(storagePath);
      if (dlErr || !blob) {
        console.error(`[quiz/fetch] Download failed for ${storagePath}:`, dlErr?.message);
        continue;
      }

      const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');

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
      } catch (geminiErr: any) {
        console.error(`[quiz/fetch] Gemini error for ${storagePath}:`, geminiErr.message);
        continue;
      }

      let parsedQuestions: Array<{ question_text: string; options: string[]; correct_answer: string }>;
      try {
        parsedQuestions = JSON.parse(rawResponse);
        if (!Array.isArray(parsedQuestions)) throw new Error('Not an array');
      } catch {
        console.error(`[quiz/fetch] JSON parse failed for ${storagePath}.`);
        continue;
      }

      const formatted = parsedQuestions
        .map((q: any) => ({
          course_code: courseCode,
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
        .eq('course_code', courseCode)
        .limit(60);

      const shuffled = [...(freshData || [])].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, 20);

      return NextResponse.json({
        courseCode,
        questions: selectedQuestions,
        totalAvailable: freshData?.length || 0,
        source: 'live-ingestion',
        filesProcessed: pdfFiles.length,
      });
    }

    return NextResponse.json({
      questions: [],
      message: 'No questions could be extracted from the available documents.',
    });

  } catch (error) {
    console.error('Quiz fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
