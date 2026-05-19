import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking course_materials parsed_content...");
  const { data, error } = await supabase
    .from('course_materials')
    .select('id, title, parsed_content')
    .ilike('title', '%Questions%')
    .limit(3);

  if (error) {
    console.error("Query failed:", error.message);
  } else {
    for (const row of data || []) {
      console.log(`\n--- Title: ${row.title} (ID: ${row.id}) ---`);
      console.log("Parsed Content Preview (first 500 chars):");
      console.log(row.parsed_content ? row.parsed_content.slice(0, 500) : "NULL");
    }
  }
}

test();
