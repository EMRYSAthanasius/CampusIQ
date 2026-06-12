import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { verifyAdminRole } from '@/lib/admin';
import { rateLimit } from '@/lib/rate-limit';
import { htmlToPlainText } from '@/lib/utils';
import pdfParse from 'pdf-parse-fork';
import { getMultipleDenseQuestionChunks } from '@/lib/quiz-service';

// Allow up to 60 seconds on Vercel
export const maxDuration = 60;

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'html' || ext === 'htm') return 'text/html';
  if (ext === 'txt') return 'text/plain';
  return 'application/octet-stream';
}

interface RawQuestionInput {
  question_text?: string;
  question?: string;
  options?: string[];
  correct_answer?: string;
  correct_option?: string;
  explanation?: string | null;
}

/**
 * Resilient Groq request execution wrapper.
 * Automatically falls back to llama-3.1-8b-instant if the 70B model triggers TPM rate limits or payload size restrictions.
 */
async function callGroqWithFallback(groq: Groq, params: Parameters<Groq['chat']['completions']['create']>[0]): Promise<Groq.Chat.ChatCompletion> {
  try {
    return await groq.chat.completions.create(params) as Groq.Chat.ChatCompletion;
  } catch (error) {
    const errorMsg = (error as Error).message || '';
    const isRateLimit = 
      errorMsg.includes('rate_limit_exceeded') || 
      errorMsg.includes('Limit') || 
      errorMsg.includes('429') || 
      errorMsg.includes('413') ||
      (error as { status?: number }).status === 429 ||
      (error as { status?: number }).status === 413;
      
    if (isRateLimit) {
      console.warn(`[ingest-questions] Llama 70B rate limit/TPM exceeded. Falling back to llama-3.1-8b-instant...`);
      const fallbackParams = {
        ...params,
        model: 'llama-3.1-8b-instant',
      };
      const fallbackMaxTokens = fallbackParams.max_tokens;
      if (fallbackMaxTokens && fallbackMaxTokens > 2048) {
        fallbackParams.max_tokens = 2048;
      }
      return await groq.chat.completions.create(fallbackParams) as Groq.Chat.ChatCompletion;
    }
    throw error;
  }
}

/**
 * Normalizes course codes (e.g. "BIO 102" -> "BIO102") and checks or inserts 
 * the course dynamically in the database to satisfy the foreign key constraint.
 */
async function getOrCreateCourse(supabase: SupabaseClient, courseCode: string): Promise<string | null> {
  const normalized = courseCode.replace(/\s+/g, '').toUpperCase();
  
  // 1. Try selecting existing course
  const { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('code', normalized)
    .maybeSingle();
    
  if (existing?.id) return existing.id;
  
  // Also check with space (e.g. "BIO 102")
  const spaced = normalized.replace(/^([A-Z]+)(\d+)$/, '$1 $2');
  const { data: existingSpaced } = await supabase
    .from('courses')
    .select('id')
    .eq('code', spaced)
    .maybeSingle();
    
  if (existingSpaced?.id) return existingSpaced.id;
  
  // 2. Create the course if missing
  console.log(`[getOrCreateCourse] Course "${normalized}" not found in DB. Creating automatically...`);
  const { data: newCourse, error } = await supabase
    .from('courses')
    .insert([
      {
        code: normalized,
        title: `Course ${normalized}`,
        description: `Automatically generated course space for ${normalized}.`
      }
    ])
    .select('id')
    .single();
    
  if (error) {
    console.error(`[getOrCreateCourse] Failed to create course "${normalized}":`, error.message);
    return null;
  }
  
  return newCourse.id;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return NextResponse.json({ error: 'Server configuration error: GROQ_API_KEY is not set in Vercel settings.' }, { status: 500 });
    }

    const supabase = await createClient();
    const { isAdmin, userId } = await verifyAdminRole(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate Limiting: 2 requests per admin per 10 minutes (bulk ingestion is expensive)
    const limitRes = await rateLimit(`admin_ingest_${userId}`, 2, 10 * 60 * 1000);
    if (!limitRes.success) {
      return NextResponse.json(
        { error: 'Too many ingestion requests. Please wait 10 minutes before running another bulk ingestion.' },
        { status: 429 }
      );
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
    const results: Array<{ file: string; course: string; count: number }> = [];

    // Initialize Groq SDK
    const groq = new Groq({ apiKey });

    for (const folder of rootFolders || []) {
      if (folder.id) continue; // Skip files at root, we want folders (courses)
      
      const courseCode = folder.name;
      // Sanity check: courseCode must match /^[A-Z]{3,4}\s*\d{3}$/i
      if (!/^[A-Z]{3,4}\s*\d{3}$/i.test(courseCode)) {
        console.log(`[${courseCode}] Skipping folder as it does not match standard course code pattern`);
        continue;
      }
      
      console.log(`\n--- Scanning course: ${courseCode} ---`);

      // Resolve or create course ID
      const courseId = await getOrCreateCourse(supabase, courseCode);
      if (!courseId) {
        console.warn(`[${courseCode}] Could not resolve or create course ID — skipping folder`);
        continue;
      }

      // Fetch course details for smart prompt scoping
      const { data: dbCourseObj } = await supabase
        .from('courses')
        .select('code, title')
        .eq('id', courseId)
        .single();
      
      const dbCourseCode = dbCourseObj?.code || courseCode;
      const dbCourseTitle = dbCourseObj?.title || `Course ${courseCode}`;

      // 2. List files in both Questions and Question subfolders
      const qFolders = [`${courseCode}/Questions`, `${courseCode}/Question`];
      const allFiles: { name: string; fullPath: string }[] = [];

      for (const qFolder of qFolders) {
        const { data: questionFiles, error: qListError } = await supabase.storage
          .from(bucket)
          .list(qFolder, { limit: 50 });

        if (!qListError && questionFiles) {
          questionFiles
            .filter(f => {
              if (!f.id) return false;
              const ext = f.name.split('.').pop()?.toLowerCase();
              return ['pdf', 'html', 'htm', 'txt'].includes(ext || '');
            })
            .forEach(f => {
              allFiles.push({
                name: f.name,
                fullPath: `${qFolder}/${f.name}`
              });
            });
        }
      }

      console.log(`[${courseCode}] Found ${allFiles.length} files in scanned folders:`, allFiles.map(f => f.fullPath));

      for (const file of allFiles) {
        console.log(`\n[${courseCode}] Processing file: ${file.fullPath}`);

        try {
          // Check if course_materials row already exists for this file_url
          const { data: existingMat } = await supabase
            .from('course_materials')
            .select('id')
            .eq('file_url', file.fullPath)
            .maybeSingle();

          let materialId = existingMat?.id;

          // If not existing, create row linked to courseId
          if (!existingMat) {
            const { data: newMat, error: insertMatErr } = await supabase
              .from('course_materials')
              .insert([
                {
                  course_id: courseId,
                  title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') + ' (Questions)',
                  file_url: file.fullPath,
                  is_active: true
                }
              ])
              .select('id')
              .single();

            if (!insertMatErr && newMat) {
              materialId = newMat.id;
            } else {
              console.error(`[${courseCode}] Failed to insert material tracker row:`, insertMatErr?.message);
              continue;
            }
          }          // 3. Download the raw file buffer directly from Supabase Storage
          const { data: fileBlob, error: downloadError } = await supabase.storage.from(bucket).download(file.fullPath);
          if (downloadError || !fileBlob) {
            console.error(`[${courseCode}] Download error for ${file.name}:`, downloadError);
            throw downloadError || new Error('Downloaded file is empty');
          }

          const fileMimeType = getMimeType(file.name);
          let parsedText = '';

          if (fileMimeType === 'application/pdf') {
            try {
              const pdfBuffer = Buffer.from(await fileBlob.arrayBuffer());
              const pdfData = await pdfParse(pdfBuffer);
              parsedText = pdfData.text;
              if (!parsedText || parsedText.trim().length === 0) {
                console.warn(`[${courseCode}] PDF ${file.name} yielded no text.`);
              }
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : 'unknown error';
              console.error(`[${courseCode}] Error parsing PDF ${file.fullPath}:`, errMsg);
              continue;
            }
          } else {
            const rawBuffer = Buffer.from(await fileBlob.arrayBuffer());
            const fullStr = rawBuffer.toString('utf-8');
            parsedText = fullStr;
            if (fileMimeType === 'text/html') {
              parsedText = htmlToPlainText(fullStr);
            }
          }

          if (!parsedText || parsedText.trim().length < 50) {
            console.warn(`[${courseCode}] ${file.name} yielded no substantial text.`);
            continue;
          }

          const denseChunks = getMultipleDenseQuestionChunks(parsedText, 6000, 4);
          console.log(`[${courseCode}] Split ${file.name} into ${denseChunks.length} dense chunks.`);

          const extractedQuestions: RawQuestionInput[] = [];

          for (const denseChunk of denseChunks) {
            try {
              console.log(`[${courseCode}] Ingesting chunk: ${denseChunk.length} chars...`);
              const completion = await callGroqWithFallback(groq, {
                model: 'llama-3.1-8b-instant',
                response_format: { type: 'json_object' },
                messages: [
                  {
                    role: 'system',
                    content: `You are an advanced academic coordinator. Extract all multiple-choice questions from the provided document content.
You MUST ONLY extract questions that belong to the course code "${dbCourseCode}" and title "${dbCourseTitle}".
Each question object MUST represent exactly one standalone question. Do NOT combine multiple questions into a single question.
Do NOT include any question numbers (e.g., "1. ", "2. ") in the question_text.
If the content contains conversational chat transcripts, Python code blocks, logs, or command-line outputs illustrating questions, ignore the chat meta-structure and code, and only extract the actual exam questions.
Ensure each options array contains exactly 4 options. Each option must contain only the clean option text itself, free of option letter prefixes like "A) ", "B) ", "A. ", "B. ".
Respond strictly with a JSON object containing a "questions" key:
{
  "questions": [
    {
      "question_text": "Full question sentence...",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correct_answer": "A" | "B" | "C" | "D",
      "explanation": "Brief explanation..."
    }
  ]
}`,
                  },
                  {
                    role: 'user',
                    content: `Document Content:\n${denseChunk}`,
                  },
                ],
                temperature: 0.1,
                max_tokens: 1500,
              });

              let rawResponseText = completion.choices[0]?.message?.content || '[]';
              // Strip markdown fences
              rawResponseText = rawResponseText.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
              let parsedJson = JSON.parse(rawResponseText);

              if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
                const parsedObj = parsedJson as Record<string, unknown>;
                const keys = Object.keys(parsedObj);
                const arrayKey = keys.find(k => Array.isArray(parsedObj[k]));
                if (arrayKey) {
                  parsedJson = parsedObj[arrayKey];
                }
              }

              if (Array.isArray(parsedJson)) {
                extractedQuestions.push(...(parsedJson as RawQuestionInput[]));
              }
            } catch (chunkErr) {
              console.error(`[${courseCode}] Error processing chunk for file ${file.name}:`, chunkErr);
            }
          }

          const formattedQuestions = extractedQuestions.map((q) => {
            const rawOptions = Array.isArray(q.options) ? q.options : [];
            const cleanedOptions = rawOptions.map((o) => {
              return typeof o === 'string' ? o.replace(/^[A-D][\)\.]\s*/i, '').trim() : '';
            });
            return {
              question_text: q.question_text || q.question || '',
              options: cleanedOptions,
              correct_answer: q.correct_answer || q.correct_option || 'A',
              explanation: q.explanation || null
            };
          }).filter(q => q.question_text.length > 5);

          console.log(`[${courseCode}] Successfully extracted ${formattedQuestions.length} questions.`);

          // 5. Update course_materials row
          if (formattedQuestions.length > 0 && materialId) {
            const { error: updateError } = await supabase
              .from('course_materials')
              .update({ parsed_content: JSON.stringify(formattedQuestions) })
              .eq('id', materialId);
            
            if (updateError) {
              console.error(`[${courseCode}] Database update error:`, updateError.message);
            } else {
              console.log(`[${courseCode}] Successfully cached ${formattedQuestions.length} questions in course_materials.`);
              results.push({
                file: file.fullPath,
                course: courseCode,
                count: formattedQuestions.length
              });
            }
          }
        } catch (fileErr) {
          console.error(`[${courseCode}] Critical error processing ${file.name}:`, (fileErr as Error).message);
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

  } catch (error) {
    console.error('Ingestion API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}
