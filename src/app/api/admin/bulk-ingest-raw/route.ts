import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminRole } from '@/lib/admin';
import pdfParse from 'pdf-parse-fork';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'materials';

interface ParsedQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
}

// ─── Multi-strategy parser ────────────────────────────────────────────────────
//
// Strategy 1: Lines-based parser — works when each question/option is on its own line
//   Looks for numbered lines (1. 1) (1) 1:) then option lines (A. A) (A) a.)
//
// Strategy 2: Inline parser — works when question + options run together with little spacing
//   Scans for patterns like "1. ...text... A. ...opt... B. ...opt..."

function parseStrategy1(text: string): ParsedQuestion[] {
  const results: ParsedQuestion[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Question number patterns: "1." "1)" "(1)" "Q1." "Q.1" "1 ."
  const qNumRe = /^(?:Q\.?\s*)?\(?(\d+)\)?[\.\)\:\s]\s+(.+)/i;
  // Option patterns: "A." "A)" "(A)" "a." "[A]" "A:"
  const optRe = /^\(?([A-Da-d])\)?[\.\)\:\s]\s*(.+)/;
  // Answer line: "Answer: B" "Ans: B" "Correct: B" "*B*"
  const ansRe = /^(?:ans(?:wer)?|correct(?:\s+ans(?:wer)?)?|key)\s*[:\-]?\s*\(?([A-Da-d])\)?/i;

  let currentQuestion: string[] = [];
  let currentOptions: Record<string, string> = {};
  let currentAnswer = 'A';
  let inQuestion = false;

  function flush() {
    if (!inQuestion) return;
    const qText = currentQuestion.join(' ').trim();
    const opts = ['A', 'B', 'C', 'D'].map(l => currentOptions[l]).filter(Boolean);
    if (qText.length >= 5 && opts.length >= 2) {
      results.push({ question_text: qText, options: opts, correct_answer: currentAnswer });
    }
    currentQuestion = [];
    currentOptions = {};
    currentAnswer = 'A';
    inQuestion = false;
  }

  for (const line of lines) {
    const ansMatch = line.match(ansRe);
    if (ansMatch) {
      currentAnswer = ansMatch[1].toUpperCase();
      continue;
    }

    const qMatch = line.match(qNumRe);
    if (qMatch) {
      flush();
      inQuestion = true;
      currentQuestion = [qMatch[2].trim()];
      continue;
    }

    const optMatch = line.match(optRe);
    if (optMatch && inQuestion) {
      currentOptions[optMatch[1].toUpperCase()] = optMatch[2].trim();
      continue;
    }

    // Continuation of question text (before any options)
    if (inQuestion && Object.keys(currentOptions).length === 0 && line.length > 1) {
      currentQuestion.push(line);
    }
  }
  flush();
  return results;
}

function parseStrategy2(text: string): ParsedQuestion[] {
  // Matches a full question block in one shot across lines
  // Pattern: number. question text A. opt B. opt C. opt D. opt [Answer: X]
  const blockRe = /\b(\d+)[\.\)]\s+([\s\S]+?)(?=\b\d+[\.\)]|$)/g;
  const optLineRe = /\(?([A-Da-d])\)?[\.\)]\s*([^A-Da-d\n]{2,}?)(?=\(?[A-Da-d]\)?[\.\)]|ans(?:wer)?|$)/gi;
  const ansRe = /ans(?:wer)?\s*[:\-]?\s*\(?([A-Da-d])\)?/i;
  const results: ParsedQuestion[] = [];

  let match;
  while ((match = blockRe.exec(text)) !== null) {
    const block = match[2].trim();
    const ansMatch = block.match(ansRe);
    const correctAnswer = ansMatch ? ansMatch[1].toUpperCase() : 'A';

    // Find the start of first option to isolate question text
    const firstOptIdx = block.search(/\(?[A-Da-d]\)?[\.\)]\s/);
    if (firstOptIdx < 3) continue;

    const questionText = block.slice(0, firstOptIdx).replace(/\s+/g, ' ').trim();
    if (questionText.length < 5) continue;

    const optionsPart = block.slice(firstOptIdx);
    const optionMap: Record<string, string> = {};
    let om;
    const re2 = new RegExp(optLineRe.source, 'gi');
    while ((om = re2.exec(optionsPart)) !== null) {
      optionMap[om[1].toUpperCase()] = om[2].trim();
    }

    const options = ['A', 'B', 'C', 'D'].map(l => optionMap[l]).filter(Boolean);
    if (options.length < 2) continue;

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

async function listAllFiles(adminSupabase: ReturnType<typeof getAdminClient>, folderPath: string): Promise<string[]> {
  const { data, error } = await adminSupabase.storage.from(BUCKET).list(folderPath, { limit: 200 });
  if (error || !data) return [];
  return data
    .filter(f => f.id && (f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.txt')))
    .map(f => `${folderPath}/${f.name}`);
}

async function downloadBuffer(adminSupabase: ReturnType<typeof getAdminClient>, path: string): Promise<Buffer | null> {
  const { data: blob, error } = await adminSupabase.storage.from(BUCKET).download(path);
  if (error || !blob) return null;
  return Buffer.from(await blob.arrayBuffer());
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { isAdmin, userId } = await verifyAdminRole(supabase);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { courseCode, clearExisting = true, debugOnly = false } = body as {
      courseCode: string;
      clearExisting?: boolean;
      debugOnly?: boolean;
    };

    if (!courseCode) return NextResponse.json({ error: 'courseCode is required' }, { status: 400 });

    const normalizedCode = courseCode.replace(/\s+/g, '').toUpperCase();
    const adminSupabase = getAdminClient();

    // ── Resolve course ──
    const { data: courseRow } = await adminSupabase
      .from('courses')
      .select('id')
      .or(`code.eq.${normalizedCode},code.eq.${normalizedCode.replace(/([A-Z]+)(\d+)/, '$1 $2')}`)
      .maybeSingle();

    if (!courseRow?.id) {
      return NextResponse.json({ error: `Course "${normalizedCode}" not found.` }, { status: 404 });
    }
    const courseId = courseRow.id;

    // ── Find files in storage ──
    const prefixes = [
      normalizedCode,
      normalizedCode.toLowerCase(),
      normalizedCode.replace(/([A-Z]+)(\d+)/, '$1 $2'),
      normalizedCode.replace(/([A-Z]+)(\d+)/, '$1 $2').toLowerCase(),
    ];
    const subfolders = ['Questions', 'Question', 'Material', 'material', 'Manual', 'manual', ''];

    const filePaths: string[] = [];
    for (const prefix of prefixes) {
      for (const sub of subfolders) {
        const folder = sub ? `${prefix}/${sub}` : prefix;
        const paths = await listAllFiles(adminSupabase, folder);
        filePaths.push(...paths);
      }
    }

    const uniquePaths = [...new Set(filePaths)];

    if (uniquePaths.length === 0) {
      return NextResponse.json({
        error: `No PDF/TXT files found in storage for "${normalizedCode}". Check your bucket folder structure.`,
        checkedPaths: prefixes.flatMap(p => subfolders.map(s => s ? `${p}/${s}` : p)),
      }, { status: 404 });
    }

    // ── Parse all files ──
    let combinedText = '';
    const fileLog: string[] = [];

    for (const filePath of uniquePaths) {
      const buffer = await downloadBuffer(adminSupabase, filePath);
      if (!buffer) { fileLog.push(`❌ Download failed: ${filePath}`); continue; }

      let text = '';
      if (filePath.toLowerCase().endsWith('.txt')) {
        text = buffer.toString('utf-8');
      } else {
        try {
          const parsed = await pdfParse(buffer);
          text = parsed.text;
        } catch {
          fileLog.push(`❌ PDF parse error: ${filePath}`);
          continue;
        }
      }
      fileLog.push(`✅ ${filePath} (${text.length} chars)`);
      combinedText += '\n' + text;
    }

    // ── Debug mode: return text sample so we can see the format ──
    if (debugOnly) {
      return NextResponse.json({
        filesFound: uniquePaths,
        fileLog,
        textSample: combinedText.slice(0, 3000),
        textLength: combinedText.length,
      });
    }

    if (!combinedText.trim()) {
      return NextResponse.json({
        error: 'Files were downloaded but no text could be extracted. The PDF may be image-based (scanned). Use the Groq-based force-ingest instead.',
        fileLog,
      }, { status: 422 });
    }

    // ── Run both parsing strategies, take the best result ──
    const s1 = parseStrategy1(combinedText);
    const s2 = parseStrategy2(combinedText);
    const allQuestions = s1.length >= s2.length ? s1 : s2;

    if (allQuestions.length === 0) {
      return NextResponse.json({
        error: 'Could not parse questions. The format may be non-standard.',
        fileLog,
        strategyResults: { strategy1: s1.length, strategy2: s2.length },
        textSample: combinedText.slice(0, 2000),
      }, { status: 422 });
    }

    // ── Clear + bulk insert ──
    if (clearExisting) {
      await adminSupabase.from('questions').delete().eq('course_id', courseId);
    }

    const letterToIdx: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    const rows = allQuestions.map(q => ({
      course_id: courseId,
      content: q.question_text,
      options: q.options,
      correct_option_index: letterToIdx[q.correct_answer] ?? 0,
      explanation: null,
      difficulty: 'medium',
      source_type: 'past_exam',
    }));

    const CHUNK = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await adminSupabase.from('questions').insert(rows.slice(i, i + CHUNK));
      if (!error) inserted += Math.min(CHUNK, rows.length - i);
    }

    return NextResponse.json({
      success: true,
      courseCode: normalizedCode,
      filesProcessed: uniquePaths.length,
      questionsExtracted: allQuestions.length,
      questionsInserted: inserted,
      strategyUsed: s1.length >= s2.length ? 'lines-based' : 'inline',
      message: `Pool for ${normalizedCode} now has ${inserted} questions. The RPC will pick random samples each session.`,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
