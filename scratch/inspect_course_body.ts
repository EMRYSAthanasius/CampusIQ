import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

async function searchKeywords(fullPath: string, courseName: string) {
  console.log(`\n=== Keyword Audit for: "${fullPath}" (Target: ${courseName}) ===`);
  const { data: blob, error } = await supabase.storage.from('materials').download(fullPath);
  if (error || !blob) {
    console.error('Download failed:', error?.message);
    return;
  }
  
  const html = Buffer.from(await blob.arrayBuffer()).toString('utf-8');
  const text = htmlToPlainText(html).toLowerCase();
  
  const keywords = ['english', 'grammar', 'comprehension', 'mathematics', 'calculus', 'biology', 'chemistry', 'physics', 'computer', 'operating system', 'library', 'nigerian', 'entrepreneurship'];
  
  keywords.forEach(kw => {
    const count = (text.match(new RegExp(kw, 'g')) || []).length;
    if (count > 0) {
      console.log(`- Keyword "${kw}": found ${count} times`);
    }
  });
}

async function main() {
  await searchKeywords('GST101/Questions/GST101 questions.html', 'GST 101');
  await searchKeywords('GST103/Questions/GST103 questions.html', 'GST 103');
  await searchKeywords('GST105/Questions/GST105 questions.html', 'GST 105');
  await searchKeywords('MTH101/Questions/MTH101 questions.html', 'MTH 101');
}

main().catch(console.error);
