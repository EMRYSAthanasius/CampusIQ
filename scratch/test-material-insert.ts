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
  console.log("1. Creating temporary course...");
  const { data: courseRow, error: courseErr } = await supabase
    .from('courses')
    .insert([
      {
        code: 'TEST103',
        title: 'Test Course 103',
        description: 'Test course'
      }
    ])
    .select('id')
    .single();

  if (courseErr) {
    console.error("Course insert failed:", courseErr.message);
    return;
  }

  const courseId = courseRow.id;
  console.log("Course created with ID:", courseId);

  console.log("2. Inserting mock course material...");
  const { data: matRow, error: matErr } = await supabase
    .from('course_materials')
    .insert([
      {
        course_id: courseId,
        title: 'Test Material Title',
        file_url: 'TEST103/Questions/test.pdf',
        parsed_content: JSON.stringify([{ id: '1', content: 'test question' }])
      }
    ])
    .select();

  if (matErr) {
    console.error("Material insert failed:", matErr.message);
  } else {
    console.log("Material Insert Succeeded!", matRow);

    // Clean up material
    console.log("Cleaning up material...");
    const { error: delMatErr } = await supabase
      .from('course_materials')
      .delete()
      .eq('course_id', courseId);
    if (delMatErr) console.error("Material cleanup failed:", delMatErr.message);
  }

  // Clean up course
  console.log("Cleaning up course...");
  const { error: delCourseErr } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);
  if (delCourseErr) console.error("Course cleanup failed:", delCourseErr.message);
  else console.log("All cleanup completed successfully!");
}

test();
