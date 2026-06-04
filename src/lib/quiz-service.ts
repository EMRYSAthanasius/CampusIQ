import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { htmlToPlainText } from './utils';
import pdfParse from 'pdf-parse-fork';

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

/**
 * Resilient Groq request execution wrapper.
 * Automatically falls back to llama-3.1-8b-instant if the 70B model triggers TPM rate limits or payload size restrictions.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

async function callGroqWithFallback(groq: any, params: any) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: params.temperature || 0.4,
        maxOutputTokens: params.max_tokens || 8000,
      }
    });

    const systemPrompt = params.messages.find((m: any) => m.role === 'system')?.content || '';
    const userPrompt = params.messages.find((m: any) => m.role === 'user')?.content || '';
    
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const result = await model.generateContent(combinedPrompt);
    
    return {
      choices: [
        {
          message: {
            content: result.response.text()
          }
        }
      ]
    };
  } catch (error: any) {
    console.error(`[QuizService] Gemini generation error:`, error.message);
    throw error;
  }
}

/**
 * Normalizes course codes (e.g. "BIO 102" -> "BIO102") and checks or inserts 
 * the course dynamically in the database to satisfy the foreign key constraint.
 */
async function getOrCreateCourse(supabase: any, adminSupabase: any, courseCode: string): Promise<string | null> {
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
      const blocks = JSON.parse(material.parsed_content);
      contentText = Array.isArray(blocks) 
        ? blocks.map((b: any) => b.content).join('\n\n').slice(0, 12000) 
        : material.parsed_content.slice(0, 12000);
    } catch (e) {
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
    const questionsToInsert = questions.map((q: any) => ({
      course_id: courseId,
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
    const junctionRows = insertedQuestions.map((q: any, i: number) => ({
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
  static async getOrCreateMockExam(courseCode: string): Promise<{ quizId: string, questions: any[], durationSeconds: number }> {
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
      const formatted = existingQuestions.map((eq: any) => {
        const q = eq.questions;
        return {
          id: q.id,
          course_code: normalizedCode,
          question_text: q.content,
          options: q.options,
          correct_answer: ['A', 'B', 'C', 'D'][q.correct_option_index] || 'A',
          explanation: q.explanation
        };
      });

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
        fileList
          .filter((f: any) => {
            if (!f.id || f.name === '.emptyFolderPlaceholder') return false;
            const ext = f.name.split('.').pop()?.toLowerCase();
            return ['pdf', 'html', 'htm', 'txt'].includes(ext || '');
          })
          .forEach((f: any) => {
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
    const ingestedQuestions: any[] = [];
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
      if (fileMimeType === 'application/pdf') {
        let pdfText = '';
        try {
          const pdfBuffer = Buffer.from(await blob.arrayBuffer());
          const pdfData = await pdfParse(pdfBuffer);
          pdfText = pdfData.text;
          if (!pdfText || pdfText.trim().length === 0) {
            debugLogs.push(`PDF ${file.name} yielded no text (might be a scanned image).`);
          }
        } catch (e: any) {
          debugLogs.push(`Error parsing PDF ${file.fullPath}: ${e.message}`);
          console.error(`[QuizService] Error parsing PDF ${file.fullPath}:`, e.message);
          continue;
        }

        completion = await callGroqWithFallback(groq, {
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are an academic quiz coordinator. Extract up to 35 multiple-choice questions from this course material for the course "${normalizedCode}".
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
}
If the material doesn't contain explicit MCQs, generate relevant ones from its topic. Return at least 5 questions.`,
            },
            {
              role: 'user',
              content: `Document Content:\n${pdfText.slice(0, 15000)}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 2048,
        });
      } else {
        // For HTML files: find <body> tag to skip <head> CSS/JS boilerplate
        // Then process a meaningful slice of actual content
        const rawBuffer = Buffer.from(await blob.arrayBuffer());
        const fullStr = rawBuffer.toString('utf-8');
        
        let contentSlice: string;
        if (fileMimeType === 'text/html') {
          // Convert the entire file to plain text first (strips CSS/JS), then slice it.
          // This prevents slicing in the middle of massive inline styles or base64 images.
          const plainText = htmlToPlainText(fullStr);
          contentSlice = plainText.slice(0, 15000);
        } else {
          contentSlice = fullStr.slice(0, 15000);
        }
        
        if (!contentSlice || contentSlice.trim().length < 50) {
          debugLogs.push(`${file.name}: produced empty text after parsing (body length: ${fullStr.length}).`);
          continue;
        }
        
        const groqContent = contentSlice.slice(0, 12000);
        debugLogs.push(`${file.name}: sending ${groqContent.length} chars to Groq (body slice from ${fullStr.length} byte file).`);
        
        completion = await callGroqWithFallback(groq, {
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are an academic quiz coordinator. Extract up to 35 multiple-choice questions from this course material for the course "${normalizedCode}".
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
}
If the material doesn't contain explicit MCQs, generate relevant ones from its topic. Return at least 5 questions.`,
            },
            {
              role: 'user',
              content: `Document Content:\n${groqContent}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 2048,
        });
      }


      try {
        const responseText = stripFences(completion.choices[0]?.message?.content || '[]');
        let parsed = JSON.parse(responseText);

        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const keys = Object.keys(parsed);
          const arrayKey = keys.find(k => Array.isArray(parsed[k]));
          if (arrayKey) parsed = parsed[arrayKey];
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          // Write directly to DB questions table
          for (const q of parsed) {
            const cleanText = q.question_text || q.question || '';
            if (!cleanText || cleanText.length < 5 || !Array.isArray(q.options) || q.options.length < 2) continue;

            const letterToIdx: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
            const correctIdx = letterToIdx[(q.correct_answer || q.correct_option || 'A').trim().toUpperCase()] ?? 0;

            const { data: dbQ, error: dbQErr } = await adminSupabase
              .from('questions')
              .insert({
                course_id: courseId,
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
          // Groq returned nothing useful — log raw response for debugging
          const rawResp = completion.choices[0]?.message?.content || '(empty)';
          debugLogs.push(`${file.name}: Groq returned 0 questions. Raw (first 300 chars): ${rawResp.slice(0, 300)}`);
        }
      } catch (err: any) {
        debugLogs.push(`Error processing ${file.name}: ${err.message}`);
        console.error(`[QuizService] Error ingesting paper ${file.fullPath}:`, err.message);
      }

      if (ingestedQuestions.length >= config.questionsCount) {
        console.log(`[QuizService] Target question count reached (${ingestedQuestions.length}). Stopping file ingestion early.`);
        break;
      }
    }

    if (ingestedQuestions.length === 0) {
      // ── AI GENERATION FALLBACK ────────────────────────────────────────────
      // File parsing produced 0 questions (bad HTML, scanned PDFs, network issues, etc.)
      // Generate questions directly from course info using Groq — always works.
      console.log(`[QuizService] File ingestion yielded 0 questions for ${normalizedCode}. Using AI generation fallback...`);

      const { data: courseInfo } = await adminSupabase
        .from('courses')
        .select('code, title, description')
        .eq('id', courseId)
        .maybeSingle();

      const courseTitle = courseInfo?.title || normalizedCode;
      const courseDesc = courseInfo?.description ? `\nCourse description: ${courseInfo.description}` : '';

      const fallbackCompletion = await callGroqWithFallback(groq, {
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a Nigerian university exam question writer. Generate exactly ${config.questionsCount} high-quality multiple-choice questions for the course "${normalizedCode}: ${courseTitle}".${courseDesc}
Cover the key topics of this course. Each question must have 4 answer options and one correct answer.
Respond ONLY with this JSON structure — no extra text:
{
  "questions": [
    {
      "question_text": "Full question sentence?",
      "options": ["A) option one", "B) option two", "C) option three", "D) option four"],
      "correct_answer": "A",
      "explanation": "Brief explanation of why A is correct."
    }
  ]
}`,
          },
          {
            role: 'user',
            content: `Generate ${config.questionsCount} MCQ exam questions for: ${normalizedCode}: ${courseTitle}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 8000,
      });

      const fallbackText = stripFences(fallbackCompletion.choices[0]?.message?.content || '{}');
      let fallbackParsed: any = {};
      let fallbackQuestions: any[] = [];
      
      try {
        fallbackParsed = JSON.parse(fallbackText);
        fallbackQuestions = Array.isArray(fallbackParsed)
          ? fallbackParsed
          : (Array.isArray(fallbackParsed?.questions) ? fallbackParsed.questions : []);
      } catch (err) {
        console.log('[QuizService] Fallback JSON parse failed, attempting regex extraction for partial/truncated JSON.');
        // If truncated, extract valid individual objects using regex
        const matches = fallbackText.match(/{\s*"question_text"[\s\S]*?"explanation"\s*:\s*"[^"]*"\s*}/g);
        if (matches) {
          for (const match of matches) {
            try { fallbackQuestions.push(JSON.parse(match)); } catch { /* ignore */ }
          }
        }
      }

      for (const q of fallbackQuestions) {
        const cleanText = q.question_text || q.question || '';
        if (!cleanText || cleanText.length < 5 || !Array.isArray(q.options) || q.options.length < 2) continue;

        const letterToIdx: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
        const correctIdx = letterToIdx[(q.correct_answer || 'A').trim().toUpperCase()] ?? 0;

        const { data: dbQ, error: dbQErr } = await adminSupabase
          .from('questions')
          .insert({
            course_id: courseId,
            content: cleanText,
            options: q.options,
            correct_option_index: correctIdx,
            explanation: q.explanation || null,
            difficulty: 'medium',
            source_type: 'custom',
          })
          .select('id')
          .single();

        if (!dbQErr && dbQ) {
          ingestedQuestions.push({
            id: dbQ.id,
            course_code: normalizedCode,
            question_text: cleanText,
            options: q.options,
            correct_answer: (q.correct_answer || 'A').trim().toUpperCase(),
            explanation: q.explanation || null,
          });

          await adminSupabase.from('quiz_questions').insert({
            quiz_id: quizId,
            question_id: dbQ.id,
            order: ingestedQuestions.length,
          });
        } else if (dbQErr) {
          console.error(`[QuizService] Fallback DB insert error:`, dbQErr.message);
          debugLogs.push(`Fallback DB error: ${dbQErr.message}`);
        }
      }

      if (ingestedQuestions.length === 0) {
        debugLogs.push(`Fallback raw text: ${fallbackText.slice(0, 500)}`);
        const debugInfo = debugLogs.length > 0 ? ` Debug info: ${debugLogs.join(' | ')}` : '';
        throw new Error(`Could not generate exam questions for "${courseCode}". Please try again in a moment.${debugInfo}`);
      }
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
