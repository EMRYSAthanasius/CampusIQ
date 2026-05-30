import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { htmlToPlainText } from '@/lib/utils';

export const maxDuration = 60;
const BUCKET = 'materials';

// ─── Types ──────────────────────────────────────────────────────────────────

type BlockType = 'heading' | 'subheading' | 'paragraph' | 'list_item' | 'callout' | 'divider';

export interface WorkspaceBlock {
  id: string;
  type: BlockType;
  content: string;
  calloutKind?: 'note' | 'important' | 'definition' | 'example' | 'warning' | 'summary' | 'objective';
}

// ─── Text Helpers ────────────────────────────────────────────────────────────

const CALLOUT_KEYWORDS: Record<string, WorkspaceBlock['calloutKind']> = {
  note: 'note', remark: 'note',
  important: 'important', 'key point': 'important', 'keypoint': 'important',
  definition: 'definition', def: 'definition',
  example: 'example', illustration: 'example',
  warning: 'warning', caution: 'warning',
  summary: 'summary', recap: 'summary',
  objective: 'objective', 'learning outcome': 'objective', 'learning objective': 'objective',
};

function classifyBlock(text: string, idx: number): WorkspaceBlock {
  const t = text.trim();

  // Dividers
  if (/^[-=_*]{3,}$/.test(t)) {
    return { id: `b-${idx}`, type: 'divider', content: '' };
  }

  // Callout detection
  for (const [kw, kind] of Object.entries(CALLOUT_KEYWORDS)) {
    if (new RegExp(`^${kw}[:\\s]`, 'i').test(t)) {
      return { id: `b-${idx}`, type: 'callout', content: t, calloutKind: kind };
    }
  }

  // List items
  if (/^(\d+[.)]\s|[a-zA-Z][.)]\s|[ivxIVX]+[.)]\s|[•\-\*→–▪◦]\s)/.test(t)) {
    return { id: `b-${idx}`, type: 'list_item', content: t };
  }

  // Named section patterns (Chapter/Unit/Topic etc.)
  if (/^(CHAPTER|UNIT|SECTION|TOPIC|MODULE|PART|LESSON)\s+\d+/i.test(t) ||
      /^\d+(\.\d+)*\s+[A-Z]/.test(t)) {
    return { id: `b-${idx}`, type: 'heading', content: t };
  }

  // ALL CAPS → heading (short lines only)
  if (t.length >= 3 && t.length <= 100 &&
      t === t.toUpperCase() && /[A-Z]/.test(t) &&
      !/[.!?,;]$/.test(t) && t.split(/\s+/).length <= 12) {
    return { id: `b-${idx}`, type: 'heading', content: t };
  }

  // Short title-case line → subheading
  const words = t.split(/\s+/);
  const startsUpper = /^[A-Z]/.test(t);
  const isShort = words.length >= 2 && words.length <= 12 && t.length < 120;
  const noEndPunct = !/[.!?]$/.test(t);
  if (startsUpper && isShort && noEndPunct) {
    return { id: `b-${idx}`, type: 'subheading', content: t };
  }

  return { id: `b-${idx}`, type: 'paragraph', content: t };
}

function structureText(rawText: string): WorkspaceBlock[] {
  const lines = rawText
    .split(/\n{1,}/)
    .map(l => l.trim())
    .filter(l => l.length > 3);

  return lines.map((line, i) => classifyBlock(line, i));
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rawCode = req.nextUrl.searchParams.get('courseCode') || '';
    const courseCode = rawCode.replace(/\s+/g, '').toUpperCase();
    if (!courseCode) return NextResponse.json({ error: 'courseCode is required' }, { status: 400 });

    const adminSB = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Scan Material folder (multiple casing variants)
    const folderCandidates = [
      `${courseCode}/Material`,
      `${courseCode}/material`,
      `${courseCode}/Manual`,
      `${courseCode}/manual`,
    ];

    let foundFile: { name: string; fullPath: string } | null = null;
    for (const folder of folderCandidates) {
      const { data: files } = await adminSB.storage.from(BUCKET).list(folder, { limit: 20 });
      if (files) {
        const real = files.find(f => f.id && f.name !== '.emptyFolderPlaceholder');
        if (real) {
          foundFile = { name: real.name, fullPath: `${folder}/${real.name}` };
          break;
        }
      }
    }

    if (!foundFile) {
      return NextResponse.json({
        blocks: [],
        message: 'No material file found for this course yet. Check back later!'
      });
    }

    // 2. Check DB cache — must be workspace-format (has type field, no correct_answer)
    const { data: existingMat } = await adminSB
      .from('course_materials')
      .select('id, parsed_content')
      .eq('file_url', foundFile.fullPath)
      .maybeSingle();

    if (existingMat?.parsed_content) {
      try {
        const cached = JSON.parse(existingMat.parsed_content) as any[];
        const isWorkspace = Array.isArray(cached) && cached.length > 0 &&
          typeof cached[0].type === 'string' && !cached[0].correct_answer;
        if (isWorkspace) {
          return NextResponse.json({ blocks: cached, source: 'cache', fileName: foundFile.name });
        }
      } catch {}
    }

    // 3. Download file
    const { data: blob, error: dlErr } = await adminSB.storage.from(BUCKET).download(foundFile.fullPath);
    if (dlErr || !blob) {
      return NextResponse.json({ error: 'Failed to download material file.' }, { status: 500 });
    }

    // 4. Parse content
    const ext = foundFile.name.split('.').pop()?.toLowerCase();
    let rawText = '';

    if (ext === 'pdf') {
      const buffer = Buffer.from(await blob.arrayBuffer());
      const pdfParse = require('pdf-parse-fork');
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text || '';
    } else if (ext === 'html' || ext === 'htm') {
      const html = Buffer.from(await blob.arrayBuffer()).toString('utf-8');
      rawText = htmlToPlainText(html);
    } else {
      rawText = Buffer.from(await blob.arrayBuffer()).toString('utf-8');
    }

    if (!rawText.trim()) {
      return NextResponse.json({ blocks: [], message: 'Could not extract readable text from this document.' });
    }

    // 5. Structure text into blocks
    const blocks = structureText(rawText);

    // 6. Save to DB cache
    const { data: courseRow } = await adminSB.from('courses').select('id').eq('code', courseCode).maybeSingle();
    if (courseRow) {
      const payload = JSON.stringify(blocks);
      if (existingMat) {
        await adminSB.from('course_materials').update({ parsed_content: payload }).eq('id', existingMat.id);
      } else {
        await adminSB.from('course_materials').insert({
          course_id: courseRow.id,
          title: foundFile.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
          file_url: foundFile.fullPath,
          is_active: true,
          parsed_content: payload,
        });
      }
    }

    return NextResponse.json({ blocks, source: 'parsed', fileName: foundFile.name });

  } catch (err: any) {
    console.error('[workspace/content] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
