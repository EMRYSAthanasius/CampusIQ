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

    if (listError) {
      console.error('Bucket list error:', listError);
      throw listError;
    }

    console.log('Found root folders:', rootFolders?.map(f => f.name));
    const results: any[] = [];

    for (const folder of rootFolders || []) {
      if (!folder.id) continue; // Skip files at root, we want folders (courses)
      
      const courseCode = folder.name;
      console.log(`\n--- Scanning course: ${courseCode} ---`);

      // 2. List files in the Questions subfolder
      const { data: questionFiles, error: qListError } = await supabase.storage
        .from(bucket)
        .list(`${courseCode}/Questions`, { limit: 50 });

      if (qListError) {
        console.warn(`[${courseCode}] No Questions folder or error listing:`, qListError.message);
        continue;
      }

      console.log(`[${courseCode}] Found ${questionFiles?.length || 0} files in Questions folder:`, questionFiles?.map(f => f.name));

      for (const file of questionFiles || []) {
        if (!file.name.endsWith('.pdf')) {
          console.log(`[${courseCode}] Skipping non-PDF file: ${file.name}`);
          continue;
        }

        const storagePath = `${courseCode}/Questions/${file.name}`;
        console.log(`\n[${courseCode}] Processing file: ${storagePath}`);

        try {
          // 3. Download and Parse
          const { data: fileBlob, error: downloadError } = await supabase.storage.from(bucket).download(storagePath);
          if (downloadError) {
            console.error(`[${courseCode}] Download error for ${file.name}:`, downloadError);
            throw downloadError;
          }

          const buffer = Buffer.from(await fileBlob.arrayBuffer());
          console.log(`[${courseCode}] File downloaded, size: ${buffer.byteLength} bytes`);

          const pdf = require('pdf-parse-fork');
          const parsed = await pdf(buffer);
          const text = parsed.text;

          console.log(`[${courseCode}] PDF parsed. Characters read: ${text?.length || 0}`);
          if (!text || text.trim().length === 0) {
            console.warn(`[${courseCode}] PDF text is empty! Check if it is a scanned image.`);
          }

          // 4. Split logic (Regex for question numbers like "1.", "Q1:", etc)
          const questionBlocks = text.split(/\n(?=\d+[\.\)])/);
          console.log(`[${courseCode}] Regex found ${questionBlocks.length} potential question blocks.`);

          const questionsToInsert = questionBlocks.map((block: string, bIdx: number) => {
            const lines = block.trim().split('\n');
            const questionText = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
            
            const optionsMatch = block.match(/[A-D][\)\.]\s+([^\n]+)/g);
            const options = optionsMatch ? optionsMatch.map((o: string) => o.replace(/^[A-D][\)\.]\s+/, '').trim()) : [];
            
            const answerMatch = block.match(/Answer:\s*([A-D])/i);
            const correctAnswer = answerMatch ? answerMatch[1].toUpperCase() : 'A'; 

            if (bIdx === 0) {
              console.log(`[${courseCode}] Sample parsed question 1:`, { questionText, options, correctAnswer });
            }

            return {
              course_code: courseCode,
              question_text: questionText,
              options,
              correct_answer: correctAnswer
            };
          }).filter((q: { question_text: string }) => q.question_text.length > 5);

          console.log(`[${courseCode}] After filtering, ${questionsToInsert.length} valid questions ready for insert.`);

          // 5. Insert into Database
          if (questionsToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('exam_questions')
              .insert(questionsToInsert);
            
            if (insertError) {
              console.error(`[${courseCode}] Database insert error:`, insertError);
            } else {
              console.log(`[${courseCode}] Successfully inserted ${questionsToInsert.length} questions into exam_questions.`);
              results.push({
                file: storagePath,
                course: courseCode,
                count: questionsToInsert.length
              });
            }
          }
        } catch (fileErr: any) {
          console.error(`[${courseCode}] Critical error processing ${file.name}:`, fileErr.message);
        }
      }
    }

    console.log(`\n=== Bulk Ingestion Complete. Total Processed: ${results.length} files ===\n`);

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
