import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function testQuizInsert() {
  console.log("Fetching a course...");
  const { data: courses, error: cErr } = await supabase.from('courses').select('id, code').limit(1);
  if (cErr || !courses || courses.length === 0) {
    console.error("No course found:", cErr);
    return;
  }
  const courseId = courses[0].id;
  const courseCode = courses[0].code;
  console.log("Using course:", courseCode, courseId);

  console.log("Attempting to insert a mock exam quiz...");
  const { data: newQuiz, error: qErr } = await supabase
    .from('quizzes')
    .insert([{
      course_id: courseId,
      title: `${courseCode} Dynamic Mock Exam TEST`,
      description: 'Automatically generated mock exam from course materials.',
      type: 'mock_exam',
      difficulty: 'mixed'
    }])
    .select('id')
    .single();

  if (qErr) {
    console.error("FAILED to insert quiz:", qErr);
  } else {
    console.log("SUCCESSFULLY inserted quiz:", newQuiz);
  }
}

testQuizInsert();
