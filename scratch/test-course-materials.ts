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
  console.log("Checking course_materials...");
  const { data, error } = await supabase
    .from('course_materials')
    .select('id, title, file_url')
    .limit(5);

  if (error) {
    console.error("course_materials query failed:", error.message);
  } else {
    console.log("course_materials exists! Found rows:", data?.length || 0, data);
  }
}

test();
