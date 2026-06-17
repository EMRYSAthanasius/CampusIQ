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

export function isChunkRelevantToCourse(chunk: string, targetCourseCode: string): boolean {
  const normalizedTarget = targetCourseCode.replace(/\s+/g, '').toUpperCase();
  
  // Define known equivalents
  const equivalentsMap: Record<string, string[]> = {
    'GST105': ['GST105', 'ENT101', 'ENT102'],
    'ENT101': ['GST105', 'ENT101', 'ENT102'],
    'ENT102': ['GST105', 'ENT101', 'ENT102']
  };

  const equivalents = equivalentsMap[normalizedTarget] || [normalizedTarget];
  
  // Create a regex for the target and equivalents (e.g. GST\s*102, GST102, etc.)
  const getCodePattern = (code: string) => {
    const match = code.match(/^([A-Z]+)(\d+)$/);
    if (!match) return code;
    return `${match[1]}\\s*${match[2]}`;
  };
  
  const targetPatternStr = equivalents.map(getCodePattern).join('|');
  const targetRegex = new RegExp(`\\b(${targetPatternStr})\\b`, 'i');
  
  // If the chunk explicitly mentions the target course or any of its equivalents, it's relevant!
  if (targetRegex.test(chunk)) {
    return true;
  }
  
  // If the chunk doesn't mention the target course/equivalents, let's check if it mentions OTHER courses.
  // Standard course code pattern: standard prefix followed by 3 digits.
  const otherCoursesRegex = /\b(GST|ENT|BIO|PHY|CHM|MTH|CSC)\s*\d{3}\b/i;
  
  if (otherCoursesRegex.test(chunk)) {
    return false;
  }
  
  return true;
}

export function getMultipleDenseQuestionChunks(text: string, chunkSize: number = 6000, maxChunks: number = 4): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: { text: string; score: number }[] = [];
  const step = 3000;
  
  for (let i = 0; i <= text.length - chunkSize; i += step) {
    const chunk = text.slice(i, i + chunkSize);
    // Score based on ?, numbering, and option letters
    const qMarks = (chunk.match(/\?/g) || []).length;
    const options = (chunk.match(/(?:\n|^)\s*[A-Ea-e][\.\)]/g) || []).length;
    const numbers = (chunk.match(/(?:\n|^)\s*\d+[\.\)]/g) || []).length;
    
    // Weighted scoring: Question marks are strongest indicator, then multiple choice options
    const score = (qMarks * 3) + (options * 2) + numbers;
    
    chunks.push({ text: chunk, score });
  }

  // Sort by score descending
  chunks.sort((a, b) => b.score - a.score);

  // Select non-overlapping top chunks
  const selected: string[] = [];
  const selectedIndices: [number, number][] = [];

  for (const chunk of chunks) {
    if (selected.length >= maxChunks) break;
    if (chunk.score < 5) continue; // Skip very low quality chunks
    
    const startIdx = text.indexOf(chunk.text);
    const endIdx = startIdx + chunk.text.length;
    
    const hasOverlap = selectedIndices.some(([s, e]) => {
      return Math.max(startIdx, s) < Math.min(endIdx, e);
    });

    if (!hasOverlap) {
      selected.push(chunk.text);
      selectedIndices.push([startIdx, endIdx]);
    }
  }

  // If no chunks were selected (e.g. scores too low), just return a few sequential chunks
  if (selected.length === 0) {
    for (let i = 0; i < text.length; i += chunkSize) {
      if (selected.length >= maxChunks) break;
      selected.push(text.slice(i, Math.min(i + chunkSize, text.length)));
    }
  }

  return selected;
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

    // Resolve course code and title to prevent unrelated question bleeding
    const { data: courseData } = await supabase
      .from('courses')
      .select('code, title')
      .eq('id', courseId)
      .single();
    const courseCode = courseData?.code || 'Unknown Course';
    const courseTitle = courseData?.title || 'Unknown Title';

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
    const systemPrompt = `You are an expert academic coordinator for the course code "${courseCode}" and title "${courseTitle}". Generate exactly ${questionCount} high-quality multiple-choice questions (MCQs) for this target course from the given course material.
    Ensure each question represents exactly one standalone question. Do NOT combine multiple questions into one.
    Do NOT include any question numbers (like "1.", "2.") in the question content text.
    If the course material contains conversational chat transcripts, Python code blocks, logs, or command-line outputs illustrating questions, ignore the chat meta-structure and code, and only generate standard academic questions based on the core topics.
    Under no circumstances should you generate/extract questions belonging to other courses (like Biology, Physics, Chemistry, or Entrepreneurship) if they are present in the text but not the target course. If the content is not relevant to the target course "${courseCode}", return an empty array {"questions": []}.
    Ensure option arrays contain exactly 4 options. Each option must contain only the clean option text itself, free of option letter prefixes like "A) ", "B) ", "A. ", "B. ".
    You MUST respond with a JSON object containing a "questions" key which is an array of objects matching this exact schema:
    {
      "questions": [
        {
          "content": "Question content sentence...",
          "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
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
    const questionsToInsert = (questions as ExtractedQuestion[]).map((q) => {
      const rawOptions = Array.isArray(q.options) ? q.options : [];
      const cleanedOptions = rawOptions.map((o) => {
        return typeof o === 'string' ? o.replace(/^[A-D][\)\.\-]\s*|^\(([A-D])\)\s*|^\[([A-D])\]\s*/i, '').trim() : '';
      });
      return {
        course_id: courseId,
        quiz_id: quiz.id,
        content: q.content || q.question_text || q.question || '',
        options: cleanedOptions,
        correct_option_index: typeof q.correct_option_index === 'number' ? q.correct_option_index : 0,
        explanation: q.explanation || null,
        difficulty: q.difficulty || 'medium',
        source_type: 'custom'
      };
    });

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

    // Retrieve course title to prevent unrelated question bleeding
    const { data: courseData } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single();
    const courseTitle = courseData?.title || `Course ${normalizedCode}`;

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
    const prefixes = new Set<string>();
    prefixes.add(normalizedCode);
    prefixes.add(normalizedCode.toLowerCase());
    const match = normalizedCode.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const letters = match[1];
      const digits = match[2];
      const titleLetters = letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
      prefixes.add(`${letters} ${digits}`);
      prefixes.add(`${letters.toLowerCase()} ${digits}`);
      prefixes.add(`${titleLetters} ${digits}`);
      prefixes.add(`${titleLetters}${digits}`);
    }

    const subfolders = ['Questions', 'Question', 'Material', 'material', 'Manual', 'manual'];
    const scannedPaths: string[] = [];
    for (const prefix of prefixes) {
      for (const sub of subfolders) {
        scannedPaths.push(`${prefix}/${sub}`);
      }
    }


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
    const questionsToInsert: Array<{
      course_id: string;
      quiz_id: string;
      content: string;
      options: string[];
      correct_option_index: number;
      explanation: string | null;
      difficulty: string;
      source_type: string;
      correct_answer_char: string;
    }> = [];
    const debugLogs: string[] = [];

    for (const file of allStorageFiles.slice(0, 2)) {  // limit to 2 files to avoid 504 Vercel timeout
      if (questionsToInsert.length >= config.questionsCount) break;
      console.log(`[QuizService] Ingesting Mock Exam questions from ${file.fullPath}...`);
      
      const { data: blob, error: dlErr } = await adminSupabase.storage.from(BUCKET).download(file.fullPath);
      if (dlErr || !blob) {
         const reason = dlErr?.message || 'unknown error';
         debugLogs.push(`Download failed for ${file.name}: ${reason}`);
         console.error(`[QuizService] Download failed for file ${file.fullPath}:`, reason);
         continue;
      }

      const fileMimeType = getMimeType(file.name);
      let parsedText = '';
      
      if (fileMimeType === 'application/pdf') {
        try {
          const pdfBuffer = Buffer.from(await blob.arrayBuffer());
          const pdfData = await pdfParse(pdfBuffer);
          parsedText = pdfData.text;
          if (!parsedText || parsedText.trim().length === 0) {
            debugLogs.push(`PDF ${file.name} yielded no text (might be a scanned image).`);
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : 'unknown error';
          debugLogs.push(`Error parsing PDF ${file.fullPath}: ${errMsg}`);
          console.error(`[QuizService] Error parsing PDF ${file.fullPath}:`, errMsg);
          continue;
        }
      } else {
        // For HTML files: convert to plain text
        const rawBuffer = Buffer.from(await blob.arrayBuffer());
        const fullStr = rawBuffer.toString('utf-8');
        
        parsedText = fullStr;
        if (fileMimeType === 'text/html') {
          parsedText = htmlToPlainText(fullStr);
        }
      }

      if (!parsedText || parsedText.trim().length < 50) {
        debugLogs.push(`${file.name}: produced empty text after parsing.`);
        continue;
      }

      const denseChunks = getMultipleDenseQuestionChunks(parsedText, 6000, 4);
      debugLogs.push(`${file.name}: Split into ${denseChunks.length} dense chunks.`);
      
      const relevantChunks = denseChunks.filter(chunk => isChunkRelevantToCourse(chunk, normalizedCode));
      debugLogs.push(`${file.name}: Kept ${relevantChunks.length} relevant chunks out of ${denseChunks.length}.`);
      
      for (const denseChunk of relevantChunks) {
        if (questionsToInsert.length >= config.questionsCount) break;

        try {
          debugLogs.push(`${file.name}: Sending ${denseChunk.length} chars of chunk to Groq.`);
          const completion = await callGroqWithFallback(groq, {
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You are an academic quiz coordinator. Extract up to 10 multiple-choice questions VERBATIM from this course material for the course code "${normalizedCode}" and title "${courseTitle}".
Do NOT generate or make up any questions. ONLY extract questions that exist in the text and directly match this course.
Under no circumstances should you extract questions belonging to other courses (like Biology, Physics, Chemistry, or Entrepreneurship) if they are present in the text. If the content is not relevant to the course code "${normalizedCode}" and title "${courseTitle}", return an empty array {"questions": []}.
Each question object MUST represent exactly one standalone question. Do NOT group multiple questions or options together.
Do NOT include any question numbering (e.g. "1. ", "2. ") inside the question_text.
If the text contains conversational chat transcripts, Python code blocks, debug logs, or print outputs illustrating questions, ignore the chat meta-structure and code, and only extract the actual exam questions themselves.
Ensure each options array contains exactly 4 options, and each option contains only the option text itself, free of prefixes like "A) ", "B) ", "A. ", "B. ".
Respond ONLY with a JSON object with a "questions" key — no extra text:
{
  "questions": [
    {
      "question_text": "Full question sentence...",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
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
            max_tokens: 1500,
          });

          if (completion?.choices?.[0]?.message?.content) {
            const responseText = stripFences(completion.choices[0].message.content || '[]');
            let parsed = JSON.parse(responseText);

            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              const parsedObj = parsed as Record<string, unknown>;
              const keys = Object.keys(parsedObj);
              const arrayKey = keys.find(k => Array.isArray(parsedObj[k]));
              if (arrayKey) parsed = parsedObj[arrayKey];
            }

            if (Array.isArray(parsed) && parsed.length > 0) {
              for (const q of parsed as Array<{ question_text?: string; question?: string; options?: string[]; correct_answer?: string; correct_option?: string; explanation?: string }>) {
                if (questionsToInsert.length >= config.questionsCount) break;

                const cleanText = q.question_text || q.question || '';
                if (!cleanText || cleanText.length < 5 || !Array.isArray(q.options) || q.options.length < 2) continue;

                const letterToIdx: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
                const correctChar = (q.correct_answer || q.correct_option || 'A').trim().toUpperCase();
                const correctIdx = letterToIdx[correctChar] ?? 0;

                const rawOptions = Array.isArray(q.options) ? q.options : [];
                const cleanedOptions = rawOptions.map((o) => {
                  return typeof o === 'string' ? o.replace(/^[A-D][\)\.\-]\s*|^\(([A-D])\)\s*|^\[([A-D])\]\s*/i, '').trim() : '';
                });

                questionsToInsert.push({
                  course_id: courseId,
                  quiz_id: quizId,
                  content: cleanText,
                  options: cleanedOptions,
                  correct_option_index: correctIdx,
                  explanation: q.explanation || null,
                  difficulty: 'medium',
                  source_type: 'past_exam',
                  correct_answer_char: correctChar
                });
              }
            }
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'unknown error';
          debugLogs.push(`Error in chunk processing: ${errMsg}`);
          console.error(`[QuizService] Error processing chunk:`, errMsg);
        }
      }
    }

    if (questionsToInsert.length === 0) {
      const debugInfo = debugLogs.length > 0 ? ` Debug info: ${debugLogs.join(' | ')}` : '';
      throw new Error(`Could not parse or extract any valid multiple-choice questions from the storage documents.${debugInfo}`);
    }

    // Bulk insert questions to database
    const dbRows = questionsToInsert.map(q => ({
      course_id: q.course_id,
      quiz_id: q.quiz_id,
      content: q.content,
      options: q.options,
      correct_option_index: q.correct_option_index,
      explanation: q.explanation,
      difficulty: q.difficulty,
      source_type: q.source_type
    }));

    const { data: dbQuestions, error: dbQErr } = await adminSupabase
      .from('questions')
      .insert(dbRows)
      .select('id');

    if (dbQErr || !dbQuestions || dbQuestions.length === 0) {
      const errMsg = dbQErr?.message || 'unknown database error';
      console.error(`[QuizService] Bulk insert error for questions:`, errMsg);
      throw new Error(`Failed to insert extracted questions into database: ${errMsg}`);
    }

    // Populate ingestedQuestions using returned database IDs
    dbQuestions.forEach((dbQ, i) => {
      const q = questionsToInsert[i];
      ingestedQuestions.push({
        id: dbQ.id,
        course_code: normalizedCode,
        question_text: q.content,
        options: q.options,
        correct_answer: q.correct_answer_char,
        explanation: q.explanation,
      });
    });

    // Bulk insert junction mapping records
    const junctionRows = dbQuestions.map((dbQ, i) => ({
      quiz_id: quizId,
      question_id: dbQ.id,
      order: i + 1
    }));

    const { error: junctionError } = await adminSupabase
      .from('quiz_questions')
      .insert(junctionRows);

    if (junctionError) {
      console.error(`[QuizService] Bulk insert error for quiz_questions junction:`, junctionError.message);
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
