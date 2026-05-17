import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error: GOOGLE_GENERATIVE_AI_API_KEY is not set.' }, { status: 500 });
    }

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

    // Initialize Gemini SDK with custom configurations
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
          // 3. Download the raw file buffer directly from Supabase Storage
          const { data: fileBlob, error: downloadError } = await supabase.storage.from(bucket).download(storagePath);
          if (downloadError || !fileBlob) {
            console.error(`[${courseCode}] Download error for ${file.name}:`, downloadError);
            throw downloadError || new Error('Downloaded file is empty');
          }

          const base64Data = Buffer.from(await fileBlob.arrayBuffer()).toString('base64');
          console.log(`[${courseCode}] File downloaded, size: ${fileBlob.size} bytes. Launching Gemini multimodal OCR...`);

          // 4. Route to Gemini Vision Interface to read scanned PDFs natively
          const prompt = `
            You are an advanced academic OCR coordinator. 
            Carefully analyze every page of this scanned document. 
            Extract all questions, multiple-choice options, and answers verbatim.
            Return the data strictly as a structured JSON array. 
            Do not include any chat prefix, suffix, explanations, or wrapping metadata outside the JSON array.
            
            Format your response strictly as a JSON array of question objects matching this TypeScript schema:
            Array<{
              question_text: string;
              options: string[];
              correct_answer: string; // Verbatim letter (A, B, C, or D). If not clearly specified in the text, infer it or default to "A".
            }>

            Example output format:
            [{ "question_text": "What is the capital of France?", "options": ["A) London", "B) Paris", "C) Rome", "D) Berlin"], "correct_answer": "B" }]
          `;

          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: "application/pdf"
              }
            }
          ]);

          let rawResponseText = result.response.text();
          console.log(`[${courseCode}] Gemini Vision response received.`);

          // Bulletproof extraction: Strip markdown code fences if present
          rawResponseText = rawResponseText.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
          const parsedQuestions = JSON.parse(rawResponseText);

          if (!Array.isArray(parsedQuestions)) {
            throw new Error('Gemini response did not return a valid JSON array');
          }

          // Hydrate dynamic parameters (inserting under the course code)
          const formattedQuestions = parsedQuestions.map((q: any) => ({
            course_code: courseCode,
            question_text: q.question_text || '',
            options: Array.isArray(q.options) ? q.options : [],
            correct_answer: q.correct_answer || 'A'
          })).filter(q => q.question_text.length > 5);

          console.log(`[${courseCode}] Successfully extracted ${formattedQuestions.length} questions.`);

          // 5. Hydrate the Database
          if (formattedQuestions.length > 0) {
            const { error: insertError } = await supabase
              .from('exam_questions')
              .insert(formattedQuestions);
            
            if (insertError) {
              console.error(`[${courseCode}] Database insert error:`, insertError);
            } else {
              console.log(`[${courseCode}] Successfully inserted ${formattedQuestions.length} questions into exam_questions.`);
              results.push({
                file: storagePath,
                course: courseCode,
                count: formattedQuestions.length
              });
            }
          }
        } catch (fileErr: any) {
          console.error(`[${courseCode}] Critical error processing ${file.name}:`, fileErr.message);
        }
      }
    }

    console.log(`\n=== Bulk Multimodal Ingestion Complete. Total Processed: ${results.length} files ===\n`);

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
