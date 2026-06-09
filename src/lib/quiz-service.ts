import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin, SupabaseClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { htmlToPlainText } from './utils';
import pdfParse from 'pdf-parse-fork';

interface ExtractedQuestion {
  content?: string;
  question_text?: string;
  question?: string;
  options?: string[];
  correct_option_index?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string | null;
}

export interface FormattedQuestion {
  id: string;
  course_code: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
}

interface ExistingQuestionRow {
  order: number;
  question_id: string;
  questions: {
    id: string;
    content: string;
    options: string[];
    correct_option_index: number;
    explanation: string | null;
  } | null;
}

const BUCKET = 'materials';

interface CourseConfig {
  questionsCount: number;
  durationMinutes: number;
}

const COURSE_QUIZ_CONFIGS: Record<string, CourseConfig> = {
  GST101: { questionsCount: 30, durationMinutes: 20 },
  GST103: { questionsCount: 30, durationMinutes: 10 },
  GST105: { questionsCount: 30, durationMinutes: 20 },
  ENT101: { questionsCount: 30, durationMinutes: 20 },
  MTH101: { questionsCount: 25, durationMinutes: 30 },
  CHM101: { questionsCount: 30, durationMinutes: 25 },
  BIO101: { questionsCount: 30, durationMinutes: 15 },
  PHY101: { questionsCount: 30, durationMinutes: 20 },
  CSC101: { questionsCount: 30, durationMinutes: 10 },
  BIO102: { questionsCount: 40, durationMinutes: 15 },
  MTH102: { questionsCount: 30, durationMinutes: 36 }
};

const DEFAULT_CONFIG: CourseConfig = { questionsCount: 20, durationMinutes: 20 };

function stripFences(raw: string): string {
  const startObj = raw.indexOf('{');
  const startArr = raw.indexOf('[');
  const first = startObj !== -1 && startArr !== -1 ? Math.min(startObj, startArr) : Math.max(startObj, startArr);
  
  const lastObj = raw.lastIndexOf('}');
  const lastArr = raw.lastIndexOf(']');
  const last = Math.max(lastObj, lastArr);
  
  if (first !== -1 && last !== -1 && last >= first) {
    return raw.substring(first, last + 1);
  }
  return raw.trim();
}

/** Unbiased Fisher-Yates shuffle — replaces the broken Math.random()-0.5 sort */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'html' || ext === 'htm') return 'text/html';
  if (ext === 'txt') return 'text/plain';
  return 'application/octet-stream';
}

function getDenseQuestionChunk(text: string, chunkSize: number = 15000): string {
  if (text.length <= chunkSize) return text;

  let maxScore = -1;
  let bestChunk = text.slice(0, chunkSize);
  const step = 5000;
  
  for (let i = 0; i < text.length - chunkSize; i += step) {
    const chunk = text.slice(i, i + chunkSize);
    // Score based on ?, numbering, and option letters
    const qMarks = (chunk.match(/\?/g) || []).length;
    const options = (chunk.match(/(?:\n|^)\s*[A-Ea-e][\.\)]/g) || []).length;
    const numbers = (chunk.match(/(?:\n|^)\s*\d+[\.\)]/g) || []).length;
    
    // Weighted scoring: Question marks are strongest indicator, then multiple choice options
    const score = (qMarks * 3) + (options * 2) + numbers;
    
    if (score > maxScore) {
      maxScore = score;
      bestChunk = chunk;
    }
  }
  
  return bestChunk;
}


/**
 * Resilient Groq request execution wrapper.
 * Automatically falls back to llama-3.1-8b-instant if the 70B model triggers TPM rate limits or payload size restrictions.
 */
async function callGroqWithFallback(groq: Groq, params: Parameters<Groq['chat']['completions']['create']>[0]): Promise<Groq.Chat.ChatCompletion> {
  try {
    return await groq.chat.completions.create(params) as Groq.Chat.ChatCompletion;
  } catch (error) {
    const errorMsg = (error as { message?: string }).message || '';
    const status = (error as { status?: number }).status;
    const isRateLimit = 
      errorMsg.includes('rate_limit_exceeded') || 
      errorMsg.includes('Limit') || 
      errorMsg.includes('429') || 
      errorMsg.includes('413') ||
      status === 429 ||
      status === 413;
      
    if (isRateLimit) {
      console.warn(`[QuizService] Llama 70B rate limit/TPM exceeded. Falling back to llama-3.1-8b-instant...`);
      const fallbackParams = {
        ...params,
        model: 'llama-3.1-8b-instant',
      } as Parameters<Groq['chat']['completions']['create']>[0];
      if (fallbackParams.max_tokens && fallbackParams.max_tokens > 8000) {
        fallbackParams.max_tokens = 8000;
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
async function getOrCreateCourse(supabase: SupabaseClient, adminSupabase: SupabaseClient, courseCode: string): Promise<string | null> {
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
  
  // 2. Create the course if missing (using admin client to bypass RLS/privileges if needed)
  console.log(`[getOrCreateCourse] Course "${normalized}" not found in DB. Creating automatically...`);
  const { data: newCourse, error } = await adminSupabase
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

export class QuizService {
  private static getAdminClient() {
    return createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  private static getGroqClient() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      throw new Error('GROQ_API_KEY is not configured. Please set GROQ_API_KEY in your environment variables.');
    }
    return new Groq({ apiKey });
  }

  /**
   * Generates a new quiz of type 'topic_practice' from a specific course material ID.
   * Stored strictly in the `questions` and `quiz_questions` tables.
   */
  static async generateQuizFromMaterial(materialId: string, courseId: string, questionCount: number = 10): Promise<string> {
    const supabase = await createClient();
    const groq = this.getGroqClient();

    // 1. Fetch material content
    const { data: material, error: matErr } = await supabase
      .from('course_materials')
      .select('title, parsed_content')
      .eq('id', materialId)
      .single();

    if (matErr || !material || !material.parsed_content) {
      throw new Error('Course material or parsed content not found.');
    }

    let contentText = '';
    try {
      const blocks = JSON.parse(material.parsed_content) as Array<{ content?: string }>;
      contentText = Array.isArray(blocks) 
        ? blocks.map((b) => b.content || '').join('\n\n').slice(0, 12000) 
        : material.parsed_content.slice(0, 12000);
    } catch {
      contentText = (material.parsed_content || '').slice(0, 12000);
    }

    // 2. Generate MCQs using Groq with fallback
    const systemPrompt = `You are an expert academic coordinator. Generate exactly ${questionCount} high-quality multiple-choice questions (MCQs) for the given course material.
    You MUST respond with a JSON object containing a "questions" key which is an array of objects matching this exact schema:
    {
      "questions": [
        {
          "content": "Question content sentence...",
          "options": ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
          "correct_option_index": 0,
          "explanation": "Brief explanation...",
          "difficulty": "easy" | "medium" | "hard"
        }
      ]
    }`;

    const userPrompt = `Material Title: ${material.title}\n\nCONTENT:\n${contentText}`;

    const completion = await callGroqWithFallback(groq, {
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2048
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsedData = JSON.parse(responseText);
    
    let questions = parsedData.questions || parsedData.quiz || parsedData;
    if (typeof questions === 'object' && !Array.isArray(questions)) {
      const keys = Object.keys(questions);
      const arrayKey = keys.find(k => Array.isArray(questions[k]));
      if (arrayKey) questions = questions[arrayKey];
    }
    
    if (!Array.isArray(questions)) {
      throw new Error('Failed to parse a valid list of questions from Groq AI response.');
    }

    // 3. Create the Quiz record
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        course_id: courseId,
        title: `Smart Quiz: ${material.title}`,
        type: 'topic_practice',
        question_count: questions.length,
      })
      .select('id')
      .single();

    if (quizError || !quiz) {
      throw new Error(`Failed to create quiz: ${quizError?.message}`);
    }

    // 4. Save individual questions to DB
    const questionsToInsert = (questions as ExtractedQuestion[]).map((q) => ({
      course_id: courseId,
      quiz_id: quiz.id,
      content: q.content || q.question_text || q.question || '',
      options: q.options || [],
      correct_option_index: typeof q.correct_option_index === 'number' ? q.correct_option_index : 0,
      explanation: q.explanation || null,
      difficulty: q.difficulty || 'medium',
      source_type: 'custom'
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select('id');

    if (insertError || !insertedQuestions) {
      throw new Error(`Failed to insert questions into database: ${insertError?.message}`);
    }

    // 5. Create junction connections
    const junctionRows = (insertedQuestions as Array<{ id: string }>).map((q, i) => ({
      quiz_id: quiz.id,
      question_id: q.id,
      order: i + 1
    }));

    const { error: junctionError } = await supabase
      .from('quiz_questions')
      .insert(junctionRows);

    if (junctionError) {
      throw new Error(`Failed to map quiz junction rows: ${junctionError?.message}`);
    }

    return quiz.id;
  }

  /**
   * Retrieves or builds a comprehensive Mock Exam quiz (type: 'mock_exam') for a course.
   * Scans PDF documents in storage, extracts, normalizes, and stores questions
   * purely in the `questions` and `quiz_questions` database tables.
   */
  static async getOrCreateMockExam(courseCode: string): Promise<{ quizId: string, questions: FormattedQuestion[], durationSeconds: number }> {
    const supabase = await createClient();
    const adminSupabase = this.getAdminClient();
    const normalizedCode = courseCode.replace(/\s+/g, '').toUpperCase();

    // 1. Resolve or create course
    const courseId = await getOrCreateCourse(supabase, adminSupabase, courseCode);
    if (!courseId) {
      throw new Error(`Could not find or create course context for "${courseCode}"`);
    }

    const config = COURSE_QUIZ_CONFIGS[normalizedCode] || DEFAULT_CONFIG;

    // 2. Fetch or create a Mock Exam Quiz record
    const { data: existingQuiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('course_id', courseId)
      .eq('type', 'mock_exam')
      .maybeSingle();

    let quizId = existingQuiz?.id;
    if (!quizId) {
      const { data: newQuiz, error: newQuizErr } = await adminSupabase
        .from('quizzes')
        .insert([{
          course_id: courseId,
          title: `${normalizedCode} Comprehensive Mock Exam`,
          description: 'Automatically compiled comprehensive mock exam.',
          type: 'mock_exam',
          difficulty: 'medium',
          question_count: config.questionsCount
        }])
        .select('id')
        .single();
        
      if (newQuizErr || !newQuiz) {
        throw new Error(`Failed to create mock quiz database record: ${newQuizErr?.message}`);
      }
      quizId = newQuiz.id;
    }

    // 3. Check if questions are already mapped to this Mock Exam
    const { data: existingQuestions } = await supabase
      .from('quiz_questions')
      .select('order, question_id, questions(*)')
      .eq('quiz_id', quizId);

    if (existingQuestions && existingQuestions.length >= 5) {
      // Map to frontend expectation format
      const formatted = (existingQuestions as unknown as ExistingQuestionRow[]).map((eq) => {
        const q = eq.questions;
        if (!q) return null;
        return {
          id: q.id,
          course_code: normalizedCode,
          question_text: q.content,
          options: q.options,
          correct_answer: ['A', 'B', 'C', 'D'][q.correct_option_index] || 'A',
          explanation: q.explanation
        };
      }).filter((q): q is FormattedQuestion => q !== null);

      // Shuffle and slice according to config limit
      const shuffled = fisherYatesShuffle(formatted);
      const selected = shuffled.slice(0, config.questionsCount);

      return {
        quizId,
        questions: selected,
        durationSeconds: config.durationMinutes * 60
      };
    }

    // 4. No pre-existing questions mapped. Ingest questions from course materials.
    console.log(`[QuizService] Compiling questions for Mock Exam "${courseCode}"...`);
    
    // Strategy B first: Scan storage folders directly — these files are guaranteed to exist
    const verifiedFiles: { name: string; fullPath: string }[] = [];
    const scannedPaths = [
      `${normalizedCode}/Questions`,
      `${normalizedCode}/Question`,
      `${normalizedCode}/Material`,
      `${normalizedCode}/material`,
      `${normalizedCode}/Manual`,
      `${normalizedCode}/manual`,
    ];

    for (const folderPath of scannedPaths) {
      const { data: fileList } = await adminSupabase.storage
        .from(BUCKET)
        .list(folderPath, { limit: 100 });

      if (fileList && fileList.length > 0) {
        (fileList as Array<{ id?: string; name: string }>)
          .filter((f) => {
            if (!f.id || f.name === '.emptyFolderPlaceholder') return false;
            const ext = f.name.split('.').pop()?.toLowerCase();
            return ['pdf', 'html', 'htm', 'txt'].includes(ext || '');
          })
          .forEach((f) => {
            const fullPath = `${folderPath}/${f.name}`;
            if (!verifiedFiles.find(sf => sf.fullPath === fullPath)) {
              verifiedFiles.push({ name: f.name, fullPath });
            }
          });
      }
    }

    // Strategy A supplement: DB course_materials entries for files NOT already found via folder scan
    const { data: dbMaterials } = await adminSupabase
      .from('course_materials')
      .select('title, file_url')
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (dbMaterials && dbMaterials.length > 0) {
      for (const mat of dbMaterials) {
        if (!mat.file_url) continue;
        if (mat.file_url.endsWith('/')) continue;

        // Prevent cross-course materials bleeding: Ensure file_url starts with normalizedCode folder prefix
        const firstSegment = mat.file_url.split('/')[0] || '';
        const normalizedSegment = firstSegment.replace(/\s+/g, '').toUpperCase();
        if (normalizedSegment !== normalizedCode) {
          console.warn(`[QuizService] Skipping bleeding material for course ${normalizedCode} (path mismatch): ${mat.file_url}`);
          continue;
        }

        const fileName = mat.file_url.split('/').pop() || mat.title || 'file';
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (!ext || !['pdf', 'html', 'htm', 'txt'].includes(ext)) continue;
        // Only add if not already in the verified list (by filename match)
        if (!verifiedFiles.find(sf => sf.name === fileName)) {
          verifiedFiles.push({ name: fileName, fullPath: mat.file_url });
        }
      }
    }

    const allStorageFiles = verifiedFiles;

    if (allStorageFiles.length === 0) {
      throw new Error(`No course materials found in storage for "${courseCode}". Please upload materials via the Admin panel first.`);
    }


    const groq = this.getGroqClient();
    const ingestedQuestions: FormattedQuestion[] = [];
    const debugLogs: string[] = [];

    for (const file of allStorageFiles.slice(0, 2)) {  // limit to 2 files to avoid 504 Vercel timeout
      console.log(`[QuizService] Ingesting Mock Exam questions from ${file.fullPath}...`);
      
      const { data: blob, error: dlErr } = await adminSupabase.storage.from(BUCKET).download(file.fullPath);
      if (dlErr || !blob) {
        const reason = dlErr?.message || 'unknown error';
        debugLogs.push(`Download failed for ${file.name}: ${reason}`);
        console.error(`[QuizService] Download failed for file ${file.fullPath}:`, reason);
        continue;
      }

      const fileMimeType = getMimeType(file.name);
      
      let completion;
      let denseChunk = '';
      
      if (fileMimeType === 'application/pdf') {
        let pdfText = '';
        try {
          const pdfBuffer = Buffer.from(await blob.arrayBuffer());
          const pdfData = await pdfParse(pdfBuffer);
          pdfText = pdfData.text;
          if (!pdfText || pdfText.trim().length === 0) {
            debugLogs.push(`PDF ${file.name} yielded no text (might be a scanned image).`);
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : 'unknown error';
          debugLogs.push(`Error parsing PDF ${file.fullPath}: ${errMsg}`);
          console.error(`[QuizService] Error parsing PDF ${file.fullPath}:`, errMsg);
          continue;
        }

        denseChunk = getDenseQuestionChunk(pdfText, 15000);
      } else {
        // For HTML files: convert to plain text
        const rawBuffer = Buffer.from(await blob.arrayBuffer());
        const fullStr = rawBuffer.toString('utf-8');
        
        let plainText = fullStr;
        if (fileMimeType === 'text/html') {
          plainText = htmlToPlainText(fullStr);
        }
        
        if (!plainText || plainText.trim().length < 50) {
          debugLogs.push(`${file.name}: produced empty text after parsing.`);
          continue;
        }
        
        denseChunk = getDenseQuestionChunk(plainText, 15000);
      }

      if (denseChunk.length > 50) {
        debugLogs.push(`${file.name}: Sending ${denseChunk.length} chars of DENSE hotspot to Groq.`);
        completion = await callGroqWithFallback(groq, {
          model: 'llama-3.1-8b-instant',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are an academic quiz coordinator. Extract up to 45 multiple-choice questions VERBATIM from this course material for the course "${normalizedCode}". Do NOT generate or make up any questions. ONLY extract questions that exist in the text.
Respond ONLY with a JSON object with a "questions" key — no extra text:
{
  "questions": [
    {
      "question_text": "Full question sentence...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "explanation": "Brief explanation..."
    }
  ]
}`,
            },
            {
              role: 'user',
              content: `Document Hotspot Content:\n${denseChunk}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 8000,
        });
      }

      try {
        let parsed: unknown = [];
        if (completion?.choices?.[0]?.message?.content) {
          const responseText = stripFences(completion.choices[0].message.content || '[]');
          parsed = JSON.parse(responseText);

          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const parsedObj = parsed as Record<string, unknown>;
            const keys = Object.keys(parsedObj);
            const arrayKey = keys.find(k => Array.isArray(parsedObj[k]));
            if (arrayKey) parsed = parsedObj[arrayKey];
          }
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          // Write directly to DB questions table
          for (const q of parsed as Array<{ question_text?: string; question?: string; options?: string[]; correct_answer?: string; correct_option?: string; explanation?: string }>) {
            const cleanText = q.question_text || q.question || '';
            if (!cleanText || cleanText.length < 5 || !Array.isArray(q.options) || q.options.length < 2) continue;

            const letterToIdx: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
            const correctIdx = letterToIdx[(q.correct_answer || q.correct_option || 'A').trim().toUpperCase()] ?? 0;

            const { data: dbQ, error: dbQErr } = await adminSupabase
              .from('questions')
              .insert({
                course_id: courseId,
                quiz_id: quizId,
                content: cleanText,
                options: q.options,
                correct_option_index: correctIdx,
                explanation: q.explanation || null,
                difficulty: 'medium',
                source_type: 'past_exam'
              })
              .select('id')
              .single();

            if (!dbQErr && dbQ) {
              ingestedQuestions.push({
                id: dbQ.id,
                course_code: normalizedCode,
                question_text: cleanText,
                options: q.options,
                correct_answer: (q.correct_answer || q.correct_option || 'A').trim().toUpperCase(),
                explanation: q.explanation || null,
              });

              // Create mapping junction record
              await adminSupabase
                .from('quiz_questions')
                .insert({
                  quiz_id: quizId,
                  question_id: dbQ.id,
                  order: ingestedQuestions.length
                });
            } else if (dbQErr) {
              console.error(`[QuizService] DB insert error for question:`, dbQErr.message);
              debugLogs.push(`DB error: ${dbQErr.message}`);
            }
          }
        } else {
          const rawResp = completion?.choices?.[0]?.message?.content || '(empty)';
          debugLogs.push(`${file.name}: Groq returned 0 questions. Raw: ${rawResp.slice(0, 200)}`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'unknown error';
        debugLogs.push(`Error processing ${file.name}: ${errMsg}`);
        console.error(`[QuizService] Error ingesting paper ${file.fullPath}:`, errMsg);
      }

      if (ingestedQuestions.length >= config.questionsCount) {
        console.log(`[QuizService] Target question count reached (${ingestedQuestions.length}). Stopping file ingestion early.`);
        break;
      }
    }

    if (ingestedQuestions.length === 0) {
      const debugInfo = debugLogs.length > 0 ? ` Debug info: ${debugLogs.join(' | ')}` : '';
      throw new Error(`Could not parse or extract any valid multiple-choice questions from the storage documents.${debugInfo}`);
    }

    // Shuffle and return selected questions
    const shuffled = fisherYatesShuffle(ingestedQuestions);
    const selected = shuffled.slice(0, config.questionsCount);

    return {
      quizId,
      questions: selected,
      durationSeconds: config.durationMinutes * 60
    };
  }
}
