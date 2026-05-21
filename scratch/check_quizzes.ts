import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkQuizzes() {
  console.log("Fetching a quiz row to inspect types...");
  const { data, error } = await supabase.from('quizzes').select('type, difficulty').limit(1);
  if (error) {
    console.error("Error fetching quizzes:", error);
  } else {
    console.log("Quizzes sample:", data);
  }
}

checkQuizzes();
