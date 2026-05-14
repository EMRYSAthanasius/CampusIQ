import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to recursively list files in a bucket
async function listAllFiles(bucketName: string, folderPath: string = ''): Promise<any[]> {
  const { data, error } = await supabase.storage.from(bucketName).list(folderPath, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.error(`Error listing folder ${folderPath}:`, error.message);
    return [];
  }

  let allFiles: any[] = [];

  for (const item of data) {
    // Determine if it's a folder (folders typically don't have metadata, or you can check if it has a file extension)
    // Supabase list() returns 'id' for files, but usually null for folders.
    const isFolder = !item.id;
    const currentPath = folderPath ? `${folderPath}/${item.name}` : item.name;

    if (isFolder || item.name === '.emptyFolderPlaceholder') {
      // It's a folder, recursively list
      if (item.name !== '.emptyFolderPlaceholder') {
        const subFiles = await listAllFiles(bucketName, currentPath);
        allFiles = allFiles.concat(subFiles);
      }
    } else {
      // It's a file
      allFiles.push({ ...item, path: currentPath });
    }
  }

  return allFiles;
}

function formatTitle(filename: string, category: string) {
  // Remove extension
  let name = filename.replace(/\.[^/.]+$/, "");
  // Replace underscores with spaces and capitalize words
  name = name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  // Capitalize category
  const cat = category.charAt(0).toUpperCase() + category.slice(1);
  return `${name} (${cat})`;
}

async function run() {
  console.log("Starting Course Materials Synchronization...");
  
  const BUCKET_NAME = 'materials';
  
  const files = await listAllFiles(BUCKET_NAME);
  console.log(`Found ${files.length} files in bucket '${BUCKET_NAME}'.`);

  // Fetch all existing courses to map course_code to course_id
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select('id, code');

  if (courseError) {
    console.error("Failed to fetch courses:", courseError.message);
    process.exit(1);
  }

  const courseMap = new Map(courses.map(c => [c.code.replace(/\s+/g, '').toUpperCase(), c.id]));

  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    // Expected path: course_code/category/filename.pdf
    const parts = file.path.split('/');
    if (parts.length < 3) {
      console.log(`Skipping file with invalid path structure: ${file.path}`);
      continue;
    }

    // parts could be: [ 'BIO101', 'manual', 'cell_bio.pdf' ]
    const rawCourseCode = parts[0];
    const category = parts[1];
    const filename = parts[parts.length - 1];

    // Normalize course code (e.g., 'BIO 101' might be stored as 'BIO101' or vice versa)
    // Our map uses stripped uppercase: 'BIO101'
    const normalizedCode = rawCourseCode.replace(/\s+/g, '').toUpperCase();
    
    let courseId = courseMap.get(normalizedCode);
    if (!courseId) {
      console.log(`Course ${rawCourseCode} not found, creating it automatically...`);
      // Insert new course into the database
      const { data: newCourse, error: newCourseError } = await supabase
        .from('courses')
        .insert({
          title: `Course ${rawCourseCode}`,
          code: normalizedCode,
          description: `Automatically generated for uploaded materials.`
        })
        .select('id')
        .single();

      if (newCourseError) {
        console.error(`Failed to automatically create course ${rawCourseCode}:`, newCourseError.message);
        if (newCourseError.code === '42501') {
          console.error("HINT: You need an RLS policy allowing inserts to 'courses' table, or use the Service Role Key.");
        }
        errorCount++;
        continue;
      }
      
      courseId = newCourse.id;
      courseMap.set(normalizedCode, courseId);
      console.log(`Created course ${normalizedCode} with ID: ${courseId}`);
    }

    const title = formatTitle(filename, category);

    // Check if it already exists
    const { data: existing, error: checkError } = await supabase
      .from('course_materials')
      .select('id')
      .eq('file_url', file.path)
      .maybeSingle();

    if (checkError) {
      console.error(`Error checking existing material for ${file.path}:`, checkError.message);
      errorCount++;
      continue;
    }

    if (existing) {
      console.log(`Already exists: ${file.path}`);
      skippedCount++;
    } else {
      // Insert new row
      const { error: insertError } = await supabase
        .from('course_materials')
        .insert({
          course_id: courseId,
          title: title,
          file_url: file.path,
          is_active: true
        });

      if (insertError) {
        console.error(`Failed to insert ${file.path}:`, insertError.message);
        if (insertError.code === '42501') {
          console.error("HINT: You may need to use the SUPABASE_SERVICE_ROLE_KEY in your .env.local to bypass Row Level Security.");
        }
        errorCount++;
      } else {
        console.log(`Inserted: ${title} (${file.path})`);
        insertedCount++;
      }
    }
  }

  console.log("\n--- Sync Summary ---");
  console.log(`Successfully Inserted: ${insertedCount}`);
  console.log(`Skipped (Already Exists): ${skippedCount}`);
  console.log(`Errors/Not Found: ${errorCount}`);
}

run().catch(console.error);
