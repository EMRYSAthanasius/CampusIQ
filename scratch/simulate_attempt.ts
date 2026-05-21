import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function simulateQuizAttempt() {
  console.log("Fetching a user...");
  const { data: users, error: uErr } = await supabase.from('profiles').select('id').limit(1);
  if (uErr || !users || users.length === 0) {
    console.error("No user found:", uErr);
    return;
  }
  const userId = users[0].id;
  console.log("Using user:", userId);

  console.log("Fetching a quiz...");
  const { data: quizzes, error: qErr } = await supabase.from('quizzes').select('id').limit(1);
  if (qErr || !quizzes || quizzes.length === 0) {
    console.error("No quiz found:", qErr);
    return;
  }
  const quizId = quizzes[0].id;
  console.log("Using quiz:", quizId);

  console.log("Simulating insert into quiz_attempts...");
  const { data: attempt, error: attemptErr } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: userId,
      quiz_id: quizId,
      score: 10,
      total_questions: 20,
      time_taken_seconds: 600,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (attemptErr) {
    console.error("SIMULATION ERROR =>", attemptErr);
  } else {
    console.log("SIMULATION SUCCESS =>", attempt);
  }
}

simulateQuizAttempt();
