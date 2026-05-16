import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Polyfill for pdfjs
if (typeof global !== 'undefined') {
  if (typeof (global as any).DOMMatrix === 'undefined') (global as any).DOMMatrix = class DOMMatrix {};
  if (typeof (global as any).Path2D === 'undefined') (global as any).Path2D = class Path2D {};
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // In a real production app, we'd check if user is an admin
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bucket = 'materials' } = await req.json().catch(() => ({}));

    // 1. List all folders in the bucket to find courses
    const { data: rootFolders, error: listError } = await supabase.storage.from(bucket).list('', {
      limit: 100,
      offset: 0,
    });

    if (listError) throw listError;

    const results: any[] = [];

    for (const folder of rootFolders || []) {
      if (!folder.id) continue; // Skip files at root, we want folders (courses)
      
      const courseCode = folder.name;
      console.log(`Scanning course: ${courseCode}`);

      // 2. List files in the Questions subfolder
      const { data: questionFiles, error: qListError } = await supabase.storage
        .from(bucket)
        .list(`${courseCode}/Questions`, { limit: 50 });

      if (qListError) {
        console.warn(`No Questions folder for ${courseCode}`);
        continue;
      }

      for (const file of questionFiles || []) {
        if (!file.name.endsWith('.pdf')) continue;

        const storagePath = `${courseCode}/Questions/${file.name}`;
        console.log(`Processing file: ${storagePath}`);

        try {
          // 3. Download and Parse
          const { data: fileBlob, error: downloadError } = await supabase.storage.from(bucket).download(storagePath);
          if (downloadError) throw downloadError;

          const buffer = Buffer.from(await fileBlob.arrayBuffer());
          const pdf = require('pdf-parse-fork');
          const parsed = await pdf(buffer);
          const text = parsed.text;

          // 4. Split logic (Regex for question numbers like "1.", "Q1:", etc)
          const questionBlocks = text.split(/\n(?=\d+[\.\)])/);
          const questionsToInsert = questionBlocks.map((block: string) => {
            const lines = block.trim().split('\n');
            const questionText = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
            
            const optionsMatch = block.match(/[A-D][\)\.]\s+([^\n]+)/g);
            const options = optionsMatch ? optionsMatch.map((o: string) => o.replace(/^[A-D][\)\.]\s+/, '').trim()) : [];
            
            const answerMatch = block.match(/Answer:\s*([A-D])/i);
            const correctAnswer = answerMatch ? answerMatch[1].toUpperCase() : 'A'; // Default to A if not found

            return {
              course_code: courseCode,
              question_text: questionText,
              options,
              correct_answer: correctAnswer
            };
          }).filter((q: { question_text: string }) => q.question_text.length > 5);

          // 5. Insert into Database
          if (questionsToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('exam_questions')
              .insert(questionsToInsert);
            
            if (insertError) {
              console.error(`Error inserting questions for ${storagePath}:`, insertError);
            } else {
              results.push({
                file: storagePath,
                course: courseCode,
                count: questionsToInsert.length
              });
            }
          }
        } catch (fileErr: any) {
          console.error(`Failed to process ${storagePath}:`, fileErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: results,
      totalFiles: results.length,
      totalQuestions: results.reduce((acc, curr) => acc + curr.count, 0)
    });

  } catch (error: any) {
    console.error('Ingestion API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
