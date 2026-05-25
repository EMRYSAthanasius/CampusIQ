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
  
  if (!materials) {
    console.log('No materials found');
    return;
  }
  
  for (const m of materials) {
    const course = dbCourses?.find((c: any) => c.id === m.course_id);
    if (m.parsed_content && (course?.code.includes('GST101') || course?.code.includes('GST103') || course?.code.includes('CSC101') || course?.code.includes('BIO102') || course?.code.includes('MTH102'))) {
      try {
        const parsed = JSON.parse(m.parsed_content);
        console.log(`\n=== Course: ${course?.code} | File: ${m.file_url} ===`);
        console.log(`Number of questions cached: ${parsed.length}`);
        console.log('First question structure:');
        console.log(JSON.stringify(parsed[0], null, 2));
      } catch (e) {
        console.error(`Failed to parse content for ${m.file_url}`);
      }
    }
  }
}

main().catch(err => console.error(err));
