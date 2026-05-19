import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking bucket root folder list...");
  const { data: rootData, error: rootError } = await supabase.storage.from('materials').list('', { limit: 100 });
  if (rootError) {
    console.error("Root listing error:", rootError.message);
  } else {
    console.log("Root folders/files in materials bucket:", rootData.map(d => ({ name: d.name, id: d.id })));
  }

  const courses = ['BIO102', 'BIO 102', 'MTH102'];
  for (const c of courses) {
    console.log(`\n--- Checking paths for ${c} ---`);
    
    // Check Questions (plural)
    const questionsPath = `${c}/Questions`;
    const { data: qPlural, error: qPluralErr } = await supabase.storage.from('materials').list(questionsPath, { limit: 10 });
    console.log(`Path: "${questionsPath}" ->`, qPluralErr ? `Error: ${qPluralErr.message}` : `Found ${qPlural?.length || 0} items: ${JSON.stringify(qPlural)}`);
    
    // Check Question (singular)
    const questionPath = `${c}/Question`;
    const { data: qSingular, error: qSingularErr } = await supabase.storage.from('materials').list(questionPath, { limit: 10 });
    console.log(`Path: "${questionPath}" ->`, qSingularErr ? `Error: ${qSingularErr.message}` : `Found ${qSingular?.length || 0} items: ${JSON.stringify(qSingular)}`);
  }
}

test();
