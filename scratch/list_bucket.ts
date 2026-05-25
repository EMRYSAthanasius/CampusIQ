import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log('Connecting to Supabase:', supabaseUrl);
  
  // List root folders
  const { data: root, error: rootErr } = await supabase.storage.from('materials').list('', { limit: 100 });
  if (rootErr) {
    console.error('Error listing root:', rootErr.message);
    return;
  }
  
  console.log('\nRoot directories/files:');
  console.log(root.map(f => `${f.name} (${f.id ? 'file' : 'folder'})`));
  
  for (const item of root) {
    if (!item.id) { // it's a folder
      const courseCode = item.name;
      console.log(`\n=== Course Folder: ${courseCode} ===`);
      
      // Recursive/deep listing helper
      async function listDirRecursive(pathStr: string) {
        const { data: contents, error } = await supabase.storage.from('materials').list(pathStr, { limit: 100 });
        if (error) {
          console.error(`Error listing ${pathStr}:`, error.message);
          return;
        }
        if (!contents) return;
        
        for (const file of contents) {
          const fullPath = pathStr ? `${pathStr}/${file.name}` : file.name;
          if (file.id) {
            console.log(`  File: ${fullPath} (${file.metadata?.size || 0} bytes)`);
          } else {
            console.log(`  Folder: ${fullPath}`);
            await listDirRecursive(fullPath);
          }
        }
      }
      
      await listDirRecursive(courseCode);
    }
  }

  // Fetch courses from db
  const { data: dbCourses, error: dbErr } = await supabase.from('courses').select('*');
  if (dbErr) {
    console.error('\nError fetching courses from DB:', dbErr.message);
  } else {
    console.log('\nDatabase courses:');
    console.log(dbCourses.map((c: any) => `${c.code}: ${c.title}`));
  }

  // Fetch course_materials from db
  const { data: materials, error: matErr } = await supabase.from('course_materials').select('*');
  if (matErr) {
    console.error('\nError fetching course_materials from DB:', matErr.message);
  } else {
    console.log('\nCourse Materials cache status:');
    for (const m of materials) {
      const course = dbCourses?.find((c: any) => c.id === m.course_id);
      const parsedLength = m.parsed_content ? JSON.parse(m.parsed_content).length : 0;
      console.log(`- Course: ${course?.code || m.course_id} | File: ${m.file_url} | Active: ${m.is_active} | Cached Questions: ${parsedLength}`);
    }
  }
}

main().catch(err => console.error(err));
