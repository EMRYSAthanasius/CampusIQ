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
  console.log("Checking courses table...");
  const { data: courses, error: err } = await supabase.from('courses').select('id, code, title');
  if (err) {
    console.error("Error fetching courses:", err.message);
  } else {
    console.log("Courses in DB:", courses);
  }

  console.log("\nChecking exam_questions table row count...");
  const { count, error: qErr } = await supabase.from('exam_questions').select('*', { count: 'exact', head: true });
  if (qErr) {
    console.error("Error counting exam_questions:", qErr.message);
  } else {
    console.log("Total questions in DB:", count);
  }

  console.log("\nChecking questions for BIO102 / BIO 102 in DB...");
  const { data: qs1 } = await supabase.from('exam_questions').select('id').eq('course_code', 'BIO102');
  const { data: qs2 } = await supabase.from('exam_questions').select('id').eq('course_code', 'BIO 102');
  console.log("Questions in DB under 'BIO102':", qs1?.length || 0);
  console.log("Questions in DB under 'BIO 102':", qs2?.length || 0);
}

test();
