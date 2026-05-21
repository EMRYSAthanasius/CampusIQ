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
  console.log("=== COURSE MATERIALS ===");
  const { data: materials, error: mErr } = await supabase.from('course_materials').select('id, title, file_url, parsed_content');
  if (mErr) {
    console.error("Error fetching course_materials:", mErr.message);
  } else {
    console.log("Total course materials:", materials?.length);
    materials?.forEach(m => {
      console.log(`- ID: ${m.id}, Title: ${m.title}, File URL: ${m.file_url}, Has parsed content: ${!!m.parsed_content}`);
    });
  }

  console.log("\n=== QUIZZES ===");
  const { data: quizzes, error: qErr } = await supabase.from('quizzes').select('id, course_id, title, type');
  if (qErr) {
    console.error("Error fetching quizzes:", qErr.message);
  } else {
    console.log("Quizzes:", quizzes);
  }

  console.log("\n=== QUIZ ATTEMPTS ===");
  const { data: attempts, error: aErr } = await supabase.from('quiz_attempts').select('id, user_id, quiz_id, score, total_questions, percentage, status, completed_at');
  if (aErr) {
    console.error("Error fetching quiz_attempts:", aErr.message);
  } else {
    console.log("Quiz attempts:", attempts);
  }

  console.log("\n=== STUDY SESSIONS ===");
  const { data: sessions, error: sErr } = await supabase.from('study_sessions').select('id, user_id, duration_seconds, started_at');
  if (sErr) {
    console.error("Error fetching study_sessions:", sErr.message);
  } else {
    console.log("Study sessions:", sessions);
  }

  console.log("\n=== USER PROGRESS ===");
  const { data: progress, error: pErr } = await supabase.from('user_progress').select('id, user_id, material_id, read_chunks');
  if (pErr) {
    console.error("Error fetching user_progress:", pErr.message);
  } else {
    console.log("User progress rows:", progress);
  }
}

test();
