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
  console.log("=== TABLES IN PUBLIC SCHEMA ===");
  // Querying table names using PostgREST is not directly possible on information_schema, 
  // but we can try fetching columns or testing tables, or running an RPC if any exist.
  // Instead, let's try reading a few tables to see what works and what doesn't.
  
  const tables = [
    'courses',
    'quizzes',
    'questions',
    'user_progress',
    'course_materials',
    'quiz_attempts',
    'study_sessions',
    'profiles',
    'user_course_history'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`- ${table}: FAILED (${error.message})`);
    } else {
      console.log(`- ${table}: SUCCESS`);
    }
  }
}

test();
