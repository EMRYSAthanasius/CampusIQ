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
  
  // 1. Remove head, style, script, svg, iframe, noscript, header, footer, nav
  text = text.replace(/<head[^>]*?>[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<style[^>]*?>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*?>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<svg[^>]*?>[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<iframe[^>]*?>[\s\S]*?<\/iframe>/gi, '');
  text = text.replace(/<noscript[^>]*?>[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<header[^>]*?>[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<footer[^>]*?>[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<nav[^>]*?>[\s\S]*?<\/nav>/gi, '');

  // 2. Replace common structural tags with newlines to preserve question boundaries
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<br[^>]*?>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');

  // 3. Strip all remaining HTML tags
  text = text.replace(/<[^>]*?>/g, '');

  // 4. Decode HTML entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&cent;': '¢',
    '&pound;': '£',
    '&yen;': '¥',
    '&euro;': '€',
    '&copy;': '©',
    '&reg;': '®',
    '&deg;': '°'
  };
  text = text.replace(/&[a-z0-9#]+;/gi, (match) => entities[match.toLowerCase()] || match);

  // 5. Normalize whitespace and newlines
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');

  return text.trim();
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

async function testIngest(courseCode: string) {
  const storageCode = courseCode.toUpperCase();
  console.log(`\n=== Testing JIT Ingestion for ${storageCode} ===`);
  
  const scannedPaths = [
    `${storageCode}/Questions`,
    `${storageCode}/Question`
  ];
  
  const allStorageFiles: { name: string; fullPath: string }[] = [];
  
  for (const folderPath of scannedPaths) {
    const { data: fileList, error: listError } = await supabase.storage
      .from('materials')
      .list(folderPath, { limit: 100 });
      
    if (listError) {
      console.error(`Error listing folder ${folderPath}:`, listError.message);
      continue;
    }
    
    if (fileList) {
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
  
  console.log(`Found ${allStorageFiles.length} files to process.`);
  
  for (const file of allStorageFiles) {
    console.log(`\nProcessing file: ${file.fullPath}`);
    console.log('Downloading file...');
    const { data: blob, error: dlErr } = await supabase.storage.from('materials').download(file.fullPath);
    if (dlErr || !blob) {
      console.error(`Download failed:`, dlErr?.message);
      continue;
    }
    
    const sizeInBytes = blob.size;
    console.log(`Downloaded file size: ${sizeInBytes} bytes`);
    const fileMimeType = getMimeType(file.name);
    let base64: string;
    let mimeTypeToSend = fileMimeType;
    
    if (fileMimeType === 'text/html') {
      const textContent = Buffer.from(await blob.arrayBuffer()).toString('utf-8');
      const cleaned = htmlToPlainText(textContent);
      const cleanedSize = Buffer.byteLength(cleaned, 'utf8');
      console.log(`Stripped Plain Text size: ${cleanedSize} bytes (Reduced by ${Math.round((1 - cleanedSize / sizeInBytes) * 100)}%)`);
      base64 = Buffer.from(cleaned, 'utf-8').toString('base64');
      mimeTypeToSend = 'text/plain';
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
    
    console.log('Sending request to Gemini...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    try {
      const start = Date.now();
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64, mimeType: mimeTypeToSend } },
      ]);
      const duration = (Date.now() - start) / 1000;
      console.log(`Gemini responded in ${duration}s.`);
      
      const responseText = stripFences(result.response.text());
      console.log('Raw response excerpt (first 300 chars):');
      console.log(responseText.substring(0, 300));
      
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) {
        console.log(`Successfully parsed ${parsed.length} questions!`);
      } else {
        console.error('Response is not a JSON array:', responseText);
      }
    } catch (err: any) {
      console.error('Gemini call failed:', err.message);
    }
  }
}

async function run() {
  await testIngest('CHM101');
  await testIngest('BIO102');
}

run().catch(console.error);
