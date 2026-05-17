import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds on Vercel

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
  
  // 2. Create the course if missing (using only basic physical columns in remote DB)
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

    // Ensure the course context exists in the DB
    const courseId = await getOrCreateCourse(supabase, course);
    if (!courseId) {
      return NextResponse.json({ error: `Failed to resolve or create course context for "${course}"` }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let materialsChunksInserted = 0;
    let questionsParsed = 0;

    // ── 1. MATERIAL FILES (Scan both singular and plural folder structures) ──
    const materialPaths = [
      `${course}/Material`,
      `${course}/Materials`,
      `${course.toLowerCase()}/material`,
      `${course.toLowerCase()}/materials`
    ];

    const materialFiles: string[] = [];
    for (const folder of materialPaths) {
      const files = await listFolder(supabase, folder);
      materialFiles.push(...files);
    }

    if (materialFiles.length === 0) {
      console.warn(`[force-ingest][${course}] No PDF files found under scanned material paths:`, materialPaths);
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

      const fileName = filePath.split('/').pop()!;

      // Find or insert into course_materials table
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
      } else {
        await supabase.from('course_materials').insert({
          course_id: courseId,
          title: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') + ' (Material)',
          file_url: filePath,
          parsed_content: JSON.stringify(blocks),
          is_active: true,
        });
      }

      materialsChunksInserted += blocks.length;
      console.log(`[force-ingest][${course}] ✓ Material processed: ${blocks.length} blocks → ${fileName}`);
    }

    // ── 2. QUESTION FILES (Scan both singular and plural folder structures) ──
    const questionPaths = [
      `${course}/Question`,
      `${course}/Questions`,
      `${course.toLowerCase()}/question`,
      `${course.toLowerCase()}/questions`
    ];

    const questionFiles: string[] = [];
    for (const folder of questionPaths) {
      const files = await listFolder(supabase, folder);
      questionFiles.push(...files);
    }

    if (questionFiles.length === 0) {
      console.warn(`[force-ingest][${course}] No PDF files found under scanned question paths:`, questionPaths);
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
        [{ "question_text": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation": "..." }]
        
        Rules:
        - question_text must be the full question sentence.
        - options must be exactly 4 strings prefixed with A), B), C), D).
        - correct_answer must be a single uppercase letter (A, B, C, or D). If not stated, infer or default to "A".
        - explanation should be a short explanation of the answer, if possible.
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
          question_text: (q.question_text || q.question || '').trim(),
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer: (q.correct_answer || q.correct_option || 'A').trim(),
          explanation: q.explanation || null
        }))
        .filter(q => q.question_text.length > 5);

      if (formattedQuestions.length > 0) {
        const fileName = filePath.split('/').pop()!;

        // Find or insert into course_materials table
        const { data: existingMaterial } = await supabase
          .from('course_materials')
          .select('id')
          .eq('file_url', filePath)
          .maybeSingle();

        if (existingMaterial) {
          await supabase
            .from('course_materials')
            .update({ parsed_content: JSON.stringify(formattedQuestions) })
            .eq('id', existingMaterial.id);
        } else {
          await supabase.from('course_materials').insert({
            course_id: courseId,
            title: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') + ' (Questions)',
            file_url: filePath,
            parsed_content: JSON.stringify(formattedQuestions),
            is_active: true,
          });
        }

        questionsParsed += formattedQuestions.length;
        console.log(`[force-ingest][${course}] ✓ Questions cached in course_materials: ${formattedQuestions.length} → ${fileName}`);
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
