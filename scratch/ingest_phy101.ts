import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

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

async function runPhyIngest() {
  console.log('Starting PHY101 specific ingestion...');
  
  const courseCode = 'PHY101';
  const fileFullPath = 'PHY101/Questions/PHY101 Questions.html';
  
  // Resolve course id
  const { data: course } = await supabase.from('courses').select('id').eq('code', courseCode).single();
  if (!course) {
    console.error('PHY101 course record not found in database.');
    return;
  }
  
  // Find material
  const { data: existingMat } = await supabase
    .from('course_materials')
    .select('*')
    .eq('file_url', fileFullPath)
    .maybeSingle();
    
  let materialId = existingMat?.id;
  if (!existingMat) {
    const { data: newMat } = await supabase
      .from('course_materials')
      .insert([{ course_id: course.id, title: 'PHY101 Questions (Questions)', file_url: fileFullPath, is_active: true }])
      .select('id')
      .single();
    materialId = newMat?.id;
  }
  
  if (!materialId) {
    console.error('Could not get material tracker ID.');
    return;
  }
  
  console.log('Downloading PHY101 HTML question file...');
  const { data: blob, error } = await supabase.storage.from('materials').download(fileFullPath);
  if (error || !blob) {
    console.error('Download failed:', error?.message);
    return;
  }
  
  const htmlContent = Buffer.from(await blob.arrayBuffer()).toString('utf-8');
  const plainText = htmlToPlainText(htmlContent);
  const base64 = Buffer.from(plainText, 'utf-8').toString('base64');
  
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
      { inlineData: { data: base64, mimeType: 'text/plain' } }
    ]);
    
    const responseText = stripFences(result.response.text());
    
    // Clean any common JSON escaping errors
    let cleanedResponse = responseText;
    // Replace bad backslash escapes if any
    cleanedResponse = cleanedResponse.replace(/\\x[0-9a-fA-F]{2}/g, '');
    
    const parsed = JSON.parse(cleanedResponse);
    
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question_text) {
      console.log(`Success! Parsed ${parsed.length} questions for PHY101.`);
      const { error: updateErr } = await supabase
        .from('course_materials')
        .update({ parsed_content: JSON.stringify(parsed) })
        .eq('id', materialId);
        
      if (updateErr) {
        console.error('Update failed:', updateErr.message);
      } else {
        console.log('PHY101 question cache updated successfully!');
      }
    } else {
      console.error('JSON parsed but format did not match schema.');
    }
  } catch (e: any) {
    console.error('PHY101 extraction failed:', e.message);
  }
}

runPhyIngest().catch(console.error);
