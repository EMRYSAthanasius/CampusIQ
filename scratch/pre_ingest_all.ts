import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'html' || ext === 'htm') return 'text/html';
  if (ext === 'txt') return 'text/plain';
  return 'application/octet-stream';
}

function htmlToPlainText(html: string): string {
  let text = html;
  text = text.replace(/<head[^>]*?>[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<style[^>]*?>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*?>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<svg[^>]*?>[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<iframe[^>]*?>[\s\S]*?<\/iframe>/gi, '');
  text = text.replace(/<noscript[^>]*?>[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<header[^>]*?>[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<footer[^>]*?>[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<nav[^>]*?>[\s\S]*?<\/nav>/gi, '');

  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<br[^>]*?>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');

  text = text.replace(/<[^>]*?>/g, '');

  const entities: Record<string, string> = {
    '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"',
    '&apos;': "'", '&#39;': "'", '&cent;': '¢', '&pound;': '£',
    '&yen;': '¥', '&euro;': '€', '&copy;': '©', '&reg;': '®', '&deg;': '°'
  };
  text = text.replace(/&[a-z0-9#]+;/gi, (match) => entities[match.toLowerCase()] || match);
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');

  return text.trim();
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

async function getOrCreateCourse(courseCode: string): Promise<string | null> {
  const normalized = courseCode.replace(/\s+/g, '').toUpperCase();
  const { data: existing } = await supabase.from('courses').select('id').eq('code', normalized).maybeSingle();
  if (existing?.id) return existing.id;

  const spaced = normalized.replace(/^([A-Z]+)(\d+)$/, '$1 $2');
  const { data: existingSpaced } = await supabase.from('courses').select('id').eq('code', spaced).maybeSingle();
  if (existingSpaced?.id) return existingSpaced.id;

  const { data: newCourse, error } = await supabase
    .from('courses')
    .insert([{ code: normalized, title: `Course ${normalized}`, description: `Auto course space for ${normalized}.` }])
    .select('id')
    .single();

  if (error) {
    console.error(`Failed to create course "${normalized}":`, error.message);
    return null;
  }
  return newCourse.id;
}

async function ingestFile(courseCode: string, file: { name: string; fullPath: string }) {
  console.log(`\n--- Ingesting ${courseCode}: ${file.name} ---`);
  
  const courseId = await getOrCreateCourse(courseCode);
  if (!courseId) {
    console.error('No course ID, skipping.');
    return;
  }

  // Find or create material tracker
  const { data: existingMat } = await supabase
    .from('course_materials')
    .select('*')
    .eq('file_url', file.fullPath)
    .maybeSingle();

  let materialId = existingMat?.id;

  if (existingMat?.parsed_content) {
    try {
      const parsed = JSON.parse(existingMat.parsed_content);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question_text) {
        console.log(`Skipping: Already has ${parsed.length} valid cached questions.`);
        return;
      }
      console.log('Existing cache is blank or has paragraph structure. Re-ingesting...');
    } catch {
      console.log('Existing cache has syntax error. Re-ingesting...');
    }
  }

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
      console.error('Failed to create material tracker:', insertMatErr?.message);
      return;
    }
  }

  console.log('Downloading file...');
  const { data: blob, error: dlErr } = await supabase.storage.from('materials').download(file.fullPath);
  if (dlErr || !blob) {
    console.error('Download failed:', dlErr?.message);
    return;
  }

  const fileMimeType = getMimeType(file.name);
  let base64: string;
  let mimeTypeToSend = fileMimeType;

  if (fileMimeType === 'text/html') {
    const textContent = Buffer.from(await blob.arrayBuffer()).toString('utf-8');
    const cleaned = htmlToPlainText(textContent);
    base64 = Buffer.from(cleaned, 'utf-8').toString('base64');
    mimeTypeToSend = 'text/plain';
    console.log(`HTML stripped to plain text. Size: ${Buffer.byteLength(cleaned)} bytes.`);
  } else {
    base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
    console.log(`Direct payload binary. Size: ${blob.size} bytes.`);
  }

  const prompt = `
    You are an advanced academic OCR coordinator.
    Carefully analyse this exam/question paper document.
    Extract a maximum of 35 multiple-choice questions from this document.
    
    Return ONLY a JSON array. No preamble, no explanation, no markdown fencing.
    Format strictly as:
    [{ "question_text": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation": "..." }]
    
    Rules:
    - Extract a MAXIMUM of 35 questions.
    - question_text must be the full question sentence.
    - options must be exactly 4 strings prefixed with A), B), C), D).
    - correct_answer must be a single uppercase letter (A, B, C, or D).
  `;

  console.log('Calling Gemini...');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType: mimeTypeToSend } }
    ]);

    const responseText = stripFences(result.response.text());
    const parsed = JSON.parse(responseText);

    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question_text) {
      console.log(`Success! Parsed ${parsed.length} questions.`);
      const { error: updateError } = await supabase
        .from('course_materials')
        .update({ parsed_content: responseText })
        .eq('id', materialId);

      if (updateError) {
        console.error('Database update failed:', updateError.message);
      } else {
        console.log('Saved successfully to DB cache.');
      }
    } else {
      console.error('Parsed result does not look like questions array.', responseText.substring(0, 300));
    }
  } catch (err: any) {
    console.error('Gemini processing failed:', err.message);
  }
}

async function main() {
  const { data: root } = await supabase.storage.from('materials').list('', { limit: 100 });
  if (!root) return;

  for (const item of root) {
    if (!item.id && item.name !== '.emptyFolderPlaceholder') {
      const courseCode = item.name;
      const scannedPaths = [`${courseCode}/Questions`, `${courseCode}/Question`];
      
      for (const p of scannedPaths) {
        const { data: files } = await supabase.storage.from('materials').list(p, { limit: 100 });
        if (files) {
          for (const f of files) {
            if (f.id && f.name !== '.emptyFolderPlaceholder') {
              const ext = f.name.split('.').pop()?.toLowerCase();
              if (['html', 'htm', 'pdf'].includes(ext || '')) {
                await ingestFile(courseCode, { name: f.name, fullPath: `${p}/${f.name}` });
              }
            }
          }
        }
      }
    }
  }
}

main().catch(console.error);
