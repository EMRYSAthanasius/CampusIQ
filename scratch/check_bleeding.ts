import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const { data: dbCourses } = await supabase.from('courses').select('*');
  const { data: materials } = await supabase.from('course_materials').select('*');
  
  if (!materials || !dbCourses) {
    console.log('No materials or courses found');
    return;
  }

  console.log('\n=== All Courses in DB ===');
  dbCourses.forEach((c: any) => {
    console.log(`Course ID: ${c.id} | Code: "${c.code}" | Title: "${c.title}"`);
  });

  console.log('\n=== Course Materials Cache & Questions Audit ===');
  for (const m of materials) {
    const course = dbCourses.find((c: any) => c.id === m.course_id);
    console.log(`\nMaterial ID: ${m.id}`);
    console.log(`Linked Course: "${course?.code}" (${m.course_id})`);
    console.log(`File URL: "${m.file_url}"`);
    
    if (m.parsed_content) {
      try {
        const parsed = JSON.parse(m.parsed_content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`Cached Questions Count: ${parsed.length}`);
          console.log(`Sample Question 1: "${parsed[0].question_text || parsed[0].question || ''}"`);
          console.log(`Sample Options: ${JSON.stringify(parsed[0].options || [])}`);
        } else {
          console.log('Empty or invalid JSON array');
        }
      } catch {
        console.log('JSON syntax error');
      }
    } else {
      console.log('parsed_content is NULL');
    }
  }
}

main().catch(err => console.error(err));
