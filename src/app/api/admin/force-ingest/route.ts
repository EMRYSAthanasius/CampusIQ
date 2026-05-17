import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const BUCKET = 'materials';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function listFolder(supabase: any, path: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(path, { limit: 100 });
  if (error || !data) {
    console.warn(`[force-ingest] Failed to list "${path}":`, error?.message);
    return [];
  }
  return (data as any[])
    .filter((f: any) => f.id && f.name.endsWith('.pdf'))
    .map((f: any) => `${path}/${f.name}`);
}

async function downloadBase64(supabase: any, storagePath: string): Promise<string | null> {
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !blob) {
    console.error(`[force-ingest] Download failed for "${storagePath}":`, error?.message);
    return null;
  }
  const buffer = Buffer.from(await blob.arrayBuffer());
  return buffer.toString('base64');
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server config error: GOOGLE_GENERATIVE_AI_API_KEY is not set.' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const course = searchParams.get('course')?.trim().toUpperCase();
    if (!course) {
      return NextResponse.json(
        { error: 'Missing required query parameter: ?course=BIO102' },
        { status: 400 }
      );
    }

    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`[force-ingest] Starting for course: ${course}`);
    console.log(`═══════════════════════════════════════════════`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let materialsChunksInserted = 0;
    let questionsParsed = 0;

    // ── 1. MATERIAL FILES ─────────────────────────────────────────────────────
    const materialPath = `${course}/Material`;
    const materialFiles = await listFolder(supabase, materialPath);

    if (materialFiles.length === 0) {
      console.warn(`[force-ingest][${course}] No PDF files found under "${materialPath}/"`);
    }

    for (const filePath of materialFiles) {
      console.log(`[force-ingest][${course}] Processing material: ${filePath}`);
      const base64 = await downloadBase64(supabase, filePath);
      if (!base64) continue;

      const prompt = `
        You are an academic content digitiser. Carefully read every page of this scanned PDF document.
        Transcribe the full text verbatim, preserving all section headings and paragraph structure.
        
        Split the transcribed content into sequential semantic blocks of approximately 1,000 characters each.
        Do not truncate mid-sentence — always break at the end of a complete sentence or paragraph.
        
        Return ONLY a JSON array of block objects. Do not include any preamble, explanation, or markdown fencing.
        Format strictly as:
        [{ "id": "p-0", "type": "paragraph", "content": "..." }, { "id": "p-1", "type": "paragraph", "content": "..." }]
      `;

      let rawResponse: string;
      try {
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64, mimeType: 'application/pdf' } },
        ]);
        rawResponse = stripFences(result.response.text());
      } catch (geminiErr: any) {
        console.error(`[force-ingest][${course}] Gemini error for ${filePath}:`, geminiErr.message);
        continue;
      }

      let blocks: Array<{ id: string; type: string; content: string }>;
      try {
        blocks = JSON.parse(rawResponse);
        if (!Array.isArray(blocks)) throw new Error('Not an array');
      } catch {
        console.error(`[force-ingest][${course}] JSON parse failed for material ${filePath}. Raw:\n`, rawResponse.slice(0, 400));
        continue;
      }

      // Find the course_id and matching material record, insert/update parsed_content
      const fileName = filePath.split('/').pop()!;

      const { data: courseRow } = await supabase
        .from('courses')
        .select('id')
        .eq('code', course)
        .single();

      const courseId = courseRow?.id ?? null;

      const { data: existingMaterial } = await supabase
        .from('course_materials')
        .select('id')
        .eq('file_url', filePath)
        .maybeSingle();

      if (existingMaterial) {
        await supabase
          .from('course_materials')
          .update({ parsed_content: JSON.stringify(blocks) })
          .eq('id', existingMaterial.id);
      } else if (courseId) {
        await supabase.from('course_materials').insert({
          course_id: courseId,
          title: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          file_url: filePath,
          parsed_content: JSON.stringify(blocks),
          is_active: true,
        });
      } else {
        console.warn(`[force-ingest][${course}] No course row found in DB — skipping material insert for ${fileName}`);
      }

      materialsChunksInserted += blocks.length;
      console.log(`[force-ingest][${course}] ✓ Material processed: ${blocks.length} blocks → ${fileName}`);
    }

    // ── 2. QUESTION FILES ─────────────────────────────────────────────────────
    const questionPath = `${course}/Question`;
    const questionFiles = await listFolder(supabase, questionPath);

    if (questionFiles.length === 0) {
      console.warn(`[force-ingest][${course}] No PDF files found under "${questionPath}/"`);
    }

    for (const filePath of questionFiles) {
      console.log(`[force-ingest][${course}] Processing questions: ${filePath}`);
      const base64 = await downloadBase64(supabase, filePath);
      if (!base64) continue;

      const prompt = `
        You are an advanced academic OCR coordinator.
        Carefully analyse every page of this scanned exam/question paper document.
        Extract every multiple-choice question, all answer options, and the correct answer verbatim.
        
        Return ONLY a JSON array. Do not include any preamble, explanation, or markdown fencing.
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
        console.error(`[force-ingest][${course}] Gemini error for ${filePath}:`, geminiErr.message);
        continue;
      }

      let parsedQuestions: Array<{ question_text: string; options: string[]; correct_answer: string }>;
      try {
        parsedQuestions = JSON.parse(rawResponse);
        if (!Array.isArray(parsedQuestions)) throw new Error('Not an array');
      } catch {
        console.error(`[force-ingest][${course}] JSON parse failed for questions ${filePath}. Raw:\n`, rawResponse.slice(0, 400));
        continue;
      }

      const formattedQuestions = parsedQuestions
        .map((q: any) => ({
          course_code: course,
          question_text: (q.question_text || '').trim(),
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer: (q.correct_answer || 'A').trim(),
        }))
        .filter(q => q.question_text.length > 5);

      if (formattedQuestions.length > 0) {
        const { error: insertErr } = await supabase.from('exam_questions').insert(formattedQuestions);
        if (insertErr) {
          console.error(`[force-ingest][${course}] DB insert error for questions:`, insertErr.message);
        } else {
          questionsParsed += formattedQuestions.length;
          console.log(`[force-ingest][${course}] ✓ Questions inserted: ${formattedQuestions.length} → ${filePath.split('/').pop()}`);
        }
      }
    }

    console.log(`\n[force-ingest] ═══ COMPLETE ═══`);
    console.log(`  Course              : ${course}`);
    console.log(`  Material chunks     : ${materialsChunksInserted}`);
    console.log(`  Questions parsed    : ${questionsParsed}`);

    return NextResponse.json({
      success: true,
      course,
      materialsChunksInserted,
      questionsParsed,
      materialFilesScanned: materialFiles.length,
      questionFilesScanned: questionFiles.length,
    });

  } catch (error: any) {
    console.error('[force-ingest] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
