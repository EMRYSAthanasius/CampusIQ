import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';
import { verifyAdminRole } from '@/lib/admin';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'materials';

// ─── Model Constants ─────────────────────────────────────────────────────────
/** Text/PDF material ingestion — fast, large-context, JSON-enforced */
const TEXT_MODEL = 'llama-3.3-70b-versatile';

/** Vision OCR for scanned question paper images — multimodal */
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

  const { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('code', normalized)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const spaced = normalized.replace(/^([A-Z]+)(\d+)$/, '$1 $2');
  const { data: existingSpaced } = await supabase
    .from('courses')
    .select('id')
    .eq('code', spaced)
    .maybeSingle();
  if (existingSpaced?.id) return existingSpaced.id;

  console.log(`[getOrCreateCourse] Course "${normalized}" not found. Creating automatically...`);
  const { data: newCourse, error } = await supabase
    .from('courses')
    .insert([{
      code: normalized,
      title: `Course ${normalized}`,
      description: `Automatically generated course space for ${normalized}.`
    }])
    .select('id')
    .single();

  if (error) {
    console.error(`[getOrCreateCourse] Failed to create course "${normalized}":`, error.message);
    return null;
  }
  return newCourse.id;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── API Key Validation ──
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey || groqApiKey === 'your_groq_api_key_here') {
      return NextResponse.json(
        { error: 'Server config error: GROQ_API_KEY is not set in environment variables.' },
        { status: 500 }
      );
    }

    // ── Auth ──
    const supabase = await createClient();
    const { isAdmin, userId } = await verifyAdminRole(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate Limiting: 2 requests per admin per 10 minutes
    const limitRes = await rateLimit(`admin_force_ingest_${userId}`, 2, 10 * 60 * 1000);
    if (!limitRes.success) {
      return NextResponse.json(
        { error: 'Too many ingestion requests. Please wait 10 minutes before running another ingestion.' },
        { status: 429 }
      );
    }

    // ── Course Param ──
    const body = await req.json().catch(() => ({}));
    const course = (body.course || new URL(req.url).searchParams.get('course') || '').trim().toUpperCase();
    if (!course) {
      return NextResponse.json(
        { error: 'Missing required parameter: course' },
        { status: 400 }
      );
    }

    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`[force-ingest] Starting for course: ${course}`);
    console.log(`[force-ingest] Text Model  : ${TEXT_MODEL}`);
    console.log(`[force-ingest] Vision Model: ${VISION_MODEL}`);
    console.log(`═══════════════════════════════════════════════`);

    // ── Resolve Course in DB ──
    const courseId = await getOrCreateCourse(supabase, course);
    if (!courseId) {
      return NextResponse.json(
        { error: `Failed to resolve or create course context for "${course}"` },
        { status: 500 }
      );
    }

    // ── Initialize Groq Client ──
    const groq = new Groq({ apiKey: groqApiKey });

    let materialsChunksInserted = 0;
    let questionsParsed = 0;

    // ════════════════════════════════════════════════════════════════════════
    // 1.  MATERIAL FILES  →  Text route  →  llama-3.3-70b-versatile
    //     JSON enforced via response_format: { type: "json_object" }
    // ════════════════════════════════════════════════════════════════════════
    const materialPaths = [
      `${course}/Material`,
      `${course}/Materials`,
      `${course.toLowerCase()}/material`,
      `${course.toLowerCase()}/materials`,
    ];

    const materialFiles: string[] = [];
    for (const folder of materialPaths) {
      materialFiles.push(...(await listFolder(supabase, folder)));
    }

    if (materialFiles.length === 0) {
      console.warn(`[force-ingest][${course}] No PDF files found under material paths:`, materialPaths);
    }

    for (const filePath of materialFiles) {
      console.log(`[force-ingest][${course}] 📄 Processing material (text): ${filePath}`);
      const base64 = await downloadBase64(supabase, filePath);
      if (!base64) continue;

      // Decode PDF buffer to plain text for text model input
      // We pass the raw base64 string and ask the model to treat it as document content
      const systemPrompt = `You are an academic content digitiser. Your only output is a valid JSON object.`;
      const userPrompt = `Read the following academic document content (supplied as base64-encoded PDF bytes interpreted as text). 
Transcribe the full readable text verbatim, preserving all section headings and paragraph structure.
Split the transcribed content into sequential semantic blocks of approximately 1,000 characters each.
Do not truncate mid-sentence — always break at the end of a complete sentence or paragraph.

Return ONLY a JSON object with a single key "blocks" containing an array:
{"blocks": [{ "id": "p-0", "type": "paragraph", "content": "..." }, { "id": "p-1", "type": "paragraph", "content": "..." }]}

Document content (base64): ${base64.slice(0, 8000)}`;

      let rawResponse: string;
      try {
        const completion = await groq.chat.completions.create({
          model: TEXT_MODEL,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 8192,
        });
        rawResponse = completion.choices[0]?.message?.content || '{}';
      } catch (groqErr: any) {
        console.error(`[force-ingest][${course}] Groq text error for ${filePath}:`, groqErr.message);
        continue;
      }

      let blocks: Array<{ id: string; type: string; content: string }>;
      try {
        const parsed = JSON.parse(rawResponse);
        // Accept either { blocks: [...] } or a direct array
        blocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
        if (!Array.isArray(blocks)) throw new Error('No blocks array found');
      } catch {
        console.error(`[force-ingest][${course}] JSON parse failed for material ${filePath}. Raw:\n`, rawResponse.slice(0, 400));
        continue;
      }

      const fileName = filePath.split('/').pop()!;
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

    // ════════════════════════════════════════════════════════════════════════
    // 2.  QUESTION FILES  →  Vision route  →  meta-llama/llama-4-scout-17b-16e-instruct
    //     Passes raw base64 image buffer via image_url data URI
    // ════════════════════════════════════════════════════════════════════════
    const questionPaths = [
      `${course}/Question`,
      `${course}/Questions`,
      `${course.toLowerCase()}/question`,
      `${course.toLowerCase()}/questions`,
    ];

    const questionFiles: string[] = [];
    for (const folder of questionPaths) {
      questionFiles.push(...(await listFolder(supabase, folder)));
    }

    if (questionFiles.length === 0) {
      console.warn(`[force-ingest][${course}] No PDF files found under question paths:`, questionPaths);
    }

    for (const filePath of questionFiles) {
      console.log(`[force-ingest][${course}] 🔍 Processing questions (vision): ${filePath}`);
      const fileBase64 = await downloadBase64(supabase, filePath);
      if (!fileBase64) continue;

      let rawResponse: string;
      try {
        const completion = await groq.chat.completions.create({
          model: VISION_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Parse these scanned questions verbatim into an explicit JSON array block matching our exact database schema parameters.

Extract every multiple-choice question, all answer options, and the correct answer verbatim.

Return ONLY a valid JSON array. No preamble, no markdown fencing, no explanations.
Format strictly as:
[{ "question_text": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation": "..." }]

Rules:
- question_text must be the full question sentence.
- options must be exactly 4 strings prefixed with A), B), C), D).
- correct_answer must be a single uppercase letter (A, B, C, or D). If not stated, infer or default to "A".
- explanation should be a short explanation of the answer if possible.
- Filter out any text that is not a question (e.g. instructions, headers).`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${fileBase64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 8192,
        });
        rawResponse = stripFences(completion.choices[0]?.message?.content || '[]');
      } catch (groqErr: any) {
        console.error(`[force-ingest][${course}] Groq vision error for ${filePath}:`, groqErr.message);
        continue;
      }

      let parsedQuestions: Array<{ question_text: string; options: string[]; correct_answer: string; explanation?: string }>;
      try {
        parsedQuestions = JSON.parse(rawResponse);
        if (!Array.isArray(parsedQuestions)) throw new Error('Not an array');
      } catch {
        console.error(`[force-ingest][${course}] JSON parse failed for questions ${filePath}. Raw:\n`, rawResponse.slice(0, 400));
        continue;
      }

      // ── Sanitise & validate each question row ──
      const formattedQuestions = parsedQuestions
        .map((q: any) => ({
          question_text: (q.question_text || q.question || '').trim(),
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer: (q.correct_answer || q.correct_option || 'A').trim(),
          explanation: q.explanation || null,
        }))
        .filter(q => q.question_text.length > 5 && q.options.length >= 2);

      if (formattedQuestions.length === 0) {
        console.warn(`[force-ingest][${course}] No valid questions found in ${filePath}`);
        continue;
      }

      // ── Database re-hydration — upsert course_materials row ──
      const fileName = filePath.split('/').pop()!;
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
        console.log(`[force-ingest][${course}] ↺ Updated existing material row for: ${fileName}`);
      } else {
        await supabase.from('course_materials').insert({
          course_id: courseId,
          title: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') + ' (Questions)',
          file_url: filePath,
          parsed_content: JSON.stringify(formattedQuestions),
          is_active: true,
        });
        console.log(`[force-ingest][${course}] + Inserted new material row for: ${fileName}`);
      }

      questionsParsed += formattedQuestions.length;
      console.log(`[force-ingest][${course}] ✓ Questions cached: ${formattedQuestions.length} → ${fileName}`);
    }

    // ── Summary ──
    console.log(`\n[force-ingest] ═══ COMPLETE ═══`);
    console.log(`  Course              : ${course}`);
    console.log(`  Material chunks     : ${materialsChunksInserted}`);
    console.log(`  Questions parsed    : ${questionsParsed}`);

    return NextResponse.json({
      success: true,
      course,
      textModel: TEXT_MODEL,
      visionModel: VISION_MODEL,
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
