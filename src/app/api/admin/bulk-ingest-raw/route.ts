import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminRole } from '@/lib/admin';
import pdfParse from 'pdf-parse-fork';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'materials';

// ─── Regex-based question parser (no AI, no rate limits) ─────────────────────
//
// Handles common Nigerian university exam paper formats:
//
//   1. Question text here?
//   A. Option one        OR  (A) Option one  OR  A) Option one
//   B. Option two
//   C. Option three
//   D. Option four
//   Answer: B            OR  Ans: B  OR  [B]   (optional)
//
// Questions without an explicit answer line default to A.

interface ParsedQuestion {
  question_text: string;
  options: string[];
  correct_answer: string; // 'A' | 'B' | 'C' | 'D'
}

function extractQuestionsFromText(text: string): ParsedQuestion[] {
  const results: ParsedQuestion[] = [];

  // Normalise line endings and collapse excessive blank lines
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split on question number anchors: lines starting with a number + dot/paren
  // e.g.  "1."  "1)"  "1 ."  "(1)"
  const questionBlocks = normalized.split(/(?=^\s*(?:\(\d+\)|\d+[\.\)])\s+)/m);

  for (const block of questionBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Extract question number prefix then question body
    const numMatch = trimmed.match(/^(?:\(?\d+\)?[\.\)])\s+([\s\S]+)/);
    if (!numMatch) continue;

    const body = numMatch[1];

    // Split body into lines, drop empty ones
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue; // need at least question + 2 options

    // Identify option lines: start with A/B/C/D followed by . ) or wrapped in ()[]
    const optionRegex = /^(?:\(?([A-Da-d])\)?[\.\):]?\s+)([\s\S]+)/;

    const questionLines: string[] = [];
    const optionMap: Record<string, string> = {};
    let correctAnswer = 'A';
    let foundAnswer = false;

    for (const line of lines) {
      // Check for explicit answer line
      const answerMatch = line.match(
        /^(?:ans(?:wer)?|correct\s+(?:ans(?:wer)?|option)|key)\s*[:\-]?\s*\(?([A-Da-d])\)?/i
      );
      if (answerMatch) {
        correctAnswer = answerMatch[1].toUpperCase();
        foundAnswer = true;
        continue;
      }

      const optMatch = line.match(optionRegex);
      if (optMatch) {
        const letter = optMatch[1].toUpperCase();
        optionMap[letter] = optMatch[2].trim();
      } else {
        // Not an option line → part of question text
        if (Object.keys(optionMap).length === 0) {
          questionLines.push(line);
        }
        // (lines after options that aren't answers are ignored)
      }
    }

    const questionText = questionLines.join(' ').trim();
    if (!questionText || questionText.length < 5) continue;

    const options: string[] = [];
    const letters = ['A', 'B', 'C', 'D'];
    for (const l of letters) {
      if (optionMap[l]) options.push(optionMap[l]);
    }

    if (options.length < 2) continue; // need at least 2 options

    // If no explicit answer was found, try to infer from bold markers or default A
    if (!foundAnswer) correctAnswer = 'A';

    results.push({ question_text: questionText, options, correct_answer: correctAnswer });
  }

  return results;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseAdmin(url, key);
}

async function listPdfFiles(adminSupabase: ReturnType<typeof getAdminClient>, folderPath: string): Promise<string[]> {
  const { data, error } = await adminSupabase.storage.from(BUCKET).list(folderPath, { limit: 200 });
  if (error || !data) return [];
  return data
    .filter(f => f.id && f.name.toLowerCase().endsWith('.pdf'))
    .map(f => `${folderPath}/${f.name}`);
}

async function downloadPdfBuffer(adminSupabase: ReturnType<typeof getAdminClient>, path: string): Promise<Buffer | null> {
  const { data: blob, error } = await adminSupabase.storage.from(BUCKET).download(path);
  if (error || !blob) return null;
  return Buffer.from(await blob.arrayBuffer());
}

// ─── Route ────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/bulk-ingest-raw
 * Body: { courseCode: string, clearExisting?: boolean }
 *
 * Parses ALL questions from a course's PDF bucket using a regex-based extractor
 * (no Groq, no rate limits, no timeouts). Stores the entire pool in the DB so
 * the get_random_questions RPC can serve truly random questions each session.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { isAdmin, userId } = await verifyAdminRole(supabase);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { courseCode, clearExisting = true } = body as { courseCode: string; clearExisting?: boolean };

    if (!courseCode) return NextResponse.json({ error: 'courseCode is required' }, { status: 400 });

    const normalizedCode = courseCode.replace(/\s+/g, '').toUpperCase();
    const adminSupabase = getAdminClient();

    // ── Resolve course ID ──
    const { data: courseRow } = await adminSupabase
      .from('courses')
      .select('id')
      .or(`code.eq.${normalizedCode},code.eq.${normalizedCode.replace(/([A-Z]+)(\d+)/, '$1 $2')}`)
      .maybeSingle();

    if (!courseRow?.id) {
      return NextResponse.json({ error: `Course "${normalizedCode}" not found in database.` }, { status: 404 });
    }
    const courseId = courseRow.id;

    // ── Find PDF files in storage ──
    const prefixes = [
      normalizedCode,
      normalizedCode.toLowerCase(),
      normalizedCode.replace(/([A-Z]+)(\d+)/, '$1 $2'),
    ];
    const subfolders = ['Questions', 'Question', 'Material', 'material'];

    const pdfPaths: string[] = [];
    for (const prefix of prefixes) {
      for (const sub of subfolders) {
        const paths = await listPdfFiles(adminSupabase, `${prefix}/${sub}`);
        pdfPaths.push(...paths);
      }
      // Also try root of the course folder
      const rootPaths = await listPdfFiles(adminSupabase, prefix);
      pdfPaths.push(...rootPaths);
    }

    const uniquePaths = [...new Set(pdfPaths)];
    if (uniquePaths.length === 0) {
      return NextResponse.json({ error: `No PDF files found in bucket for "${normalizedCode}".` }, { status: 404 });
    }

    // ── Parse all PDFs ──
    const allQuestions: ParsedQuestion[] = [];

    for (const pdfPath of uniquePaths) {
      const buffer = await downloadPdfBuffer(adminSupabase, pdfPath);
      if (!buffer) continue;

      let text = '';
      try {
        const parsed = await pdfParse(buffer);
        text = parsed.text;
      } catch {
        console.warn(`[bulk-ingest-raw] Could not parse PDF: ${pdfPath}`);
        continue;
      }

      const questions = extractQuestionsFromText(text);
      console.log(`[bulk-ingest-raw] Extracted ${questions.length} questions from ${pdfPath}`);
      allQuestions.push(...questions);
    }

    if (allQuestions.length === 0) {
      return NextResponse.json({
        error: 'Regex parser could not extract any questions. The PDF may use a non-standard format. Use force-ingest (Groq) for this course instead.'
      }, { status: 422 });
    }

    // ── Optionally clear existing questions ──
    if (clearExisting) {
      await adminSupabase.from('questions').delete().eq('course_id', courseId);
    }

    // ── Bulk insert all questions ──
    const rows = allQuestions.map(q => {
      const letterToIdx: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      return {
        course_id: courseId,
        content: q.question_text,
        options: q.options,
        correct_option_index: letterToIdx[q.correct_answer] ?? 0,
        explanation: null,
        difficulty: 'medium',
        source_type: 'past_exam',
      };
    });

    // Insert in chunks of 500 to stay within Supabase payload limits
    const CHUNK = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await adminSupabase.from('questions').insert(rows.slice(i, i + CHUNK));
      if (error) {
        console.error('[bulk-ingest-raw] Insert error:', error.message);
      } else {
        inserted += Math.min(CHUNK, rows.length - i);
      }
    }

    return NextResponse.json({
      success: true,
      courseCode: normalizedCode,
      pdfsProcessed: uniquePaths.length,
      questionsExtracted: allQuestions.length,
      questionsInserted: inserted,
      message: `Pool for ${normalizedCode} now has ${inserted} questions. The RPC will pick random samples each session.`
    });

  } catch (error: unknown) {
    console.error('[POST /api/admin/bulk-ingest-raw] Fatal:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
