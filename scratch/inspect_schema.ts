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

async function inspect() {
  console.log("Inspecting tables in 'public' schema...");
  const { data, error } = await supabase.rpc('get_tables_info');
  
  if (error) {
    console.log("Direct RPC get_tables_info failed, trying SQL query via API or basic table queries...");
    
    // Let's try to query some standard tables directly
    const tablesToTry = [
      'profiles', 'courses', 'quizzes', 'questions', 'quiz_attempts', 
      'study_sessions', 'user_progress', 'course_materials', 
      'user_course_history', 'exam_questions', 'subscriptions'
    ];
    
    for (const t of tablesToTry) {
      const { error: tErr } = await supabase.from(t).select('*').limit(1);
      if (tErr) {
        console.log(`- Table '${t}': NOT FOUND or ERROR: ${tErr.message}`);
      } else {
        console.log(`- Table '${t}': EXISTS`);
      }
    }
  } else {
    console.log("Tables info:", data);
  }
}

inspect();
