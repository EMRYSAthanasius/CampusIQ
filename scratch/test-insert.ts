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
  console.log("Trying to insert a mock question to exam_questions...");
  const { data, error } = await supabase
    .from('exam_questions')
    .insert([
      {
        course_code: 'TEST101',
        question_text: 'What is 1 + 1?',
        options: ['A) 1', 'B) 2', 'C) 3', 'D) 4'],
        correct_answer: 'B'
      }
    ])
    .select();

  if (error) {
    console.error("Insert failed!");
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);
    console.error("Error Details:", error.details);
  } else {
    console.log("Insert Succeeded!", data);
    
    // Clean up
    console.log("Deleting mock question...");
    const { error: delErr } = await supabase
      .from('exam_questions')
      .delete()
      .eq('course_code', 'TEST101');
    if (delErr) {
      console.error("Cleanup failed:", delErr.message);
    } else {
      console.log("Cleanup successful!");
    }
  }
}

test();
