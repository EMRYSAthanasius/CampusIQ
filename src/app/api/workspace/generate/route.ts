import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

async function generateWithRetry(
  groq: Groq,
  params: Parameters<typeof groq.chat.completions.create>[0],
  retries = 3,
  delayMs = 1500
): Promise<Groq.Chat.ChatCompletion> {
  for (let i = 0; i < retries; i++) {
    try {
      return await groq.chat.completions.create(params) as Groq.Chat.ChatCompletion;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;
      const isTransient = errMsg.includes('503') || errMsg.includes('429') || status === 503 || status === 429;
      if (isTransient && i < retries - 1) {
        console.warn(`[workspace/generate] Groq transient error, retrying in ${delayMs}ms (Attempt ${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Retries failed');
}

function cleanAndParseJson(text: string): unknown {
  // Strip any <think>...</think> tags if they exist
  let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip markdown code block markers
  cleanText = cleanText.replace(/^```json\s*/i, '');
  cleanText = cleanText.replace(/^```\s*/, '');
  cleanText = cleanText.replace(/```\s*$/, '');
  
  cleanText = cleanText.trim();
  
  return JSON.parse(cleanText);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  let type = 'unknown';

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return NextResponse.json({ error: 'Groq API configuration missing. Please check your Vercel Environment Variables.' }, { status: 500 });
    }

    const body = await req.json();
    const { materialId } = body;
    type = body.type;

    if (!materialId || !type) {
      return NextResponse.json({ error: 'Missing materialId or type' }, { status: 400 });
    }

    // Fetch the material parsed content
    const { data: material, error: materialError } = await supabase
      .from('course_materials')
      .select('title, parsed_content, course_id')
      .eq('id', materialId)
      .single();

    if (materialError || !material || !material.parsed_content) {
      return NextResponse.json({ error: 'Material content not found' }, { status: 404 });
    }

    let courseCode = 'Unknown Course';
    let courseTitle = 'Unknown Title';
    if (material.course_id) {
      const { data: courseData } = await supabase
        .from('courses')
        .select('code, title')
        .eq('id', material.course_id)
        .single();
      if (courseData) {
        courseCode = courseData.code || courseCode;
        courseTitle = courseData.title || courseTitle;
      }
    }

    // Detect structured past question paper format
    let isQuestionPaper = false;
    let questionsList: Record<string, unknown>[] = [];
    try {
      const parsed = JSON.parse(material.parsed_content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasQuestions = parsed.some((item) => {
          if (!item || typeof item !== 'object') return false;
          const obj = item as Record<string, unknown>;
          return typeof obj.question_text === 'string' || typeof obj.question === 'string';
        });
        if (hasQuestions) {
          isQuestionPaper = true;
          questionsList = parsed.filter((item): item is Record<string, unknown> => {
            if (!item || typeof item !== 'object') return false;
            const obj = item as Record<string, unknown>;
            return typeof obj.question_text === 'string' || typeof obj.question === 'string';
          });
        }
      }
    } catch {}

    // Direct past-question quiz loading (Ask questions only relating to the particular test the user is currently on)
    if (type === 'quiz' && isQuestionPaper) {
      console.log(`[workspace/generate] Returning direct mapped past questions for material ID: ${materialId}`);
      const mappedQuiz = questionsList.map((q) => {
        // Clean options prefixes (e.g. "A) ...") if present
        const rawOptions = Array.isArray(q.options) ? q.options : [];
        const cleanedOptions = rawOptions.map((o) => {
          return typeof o === 'string' ? o.replace(/^[A-D]\)\s*/i, '').trim() : '';
        });

        const rawCorrect = q.correct_answer || q.correctAnswer;
        let correctAnswer = typeof rawCorrect === 'string' ? rawCorrect.trim().toUpperCase() : 'A';
        if (correctAnswer.length > 1) {
          correctAnswer = correctAnswer.charAt(0);
        }

        const qText = q.question_text || q.question;
        const questionVal = typeof qText === 'string' ? qText : 'Question content missing';
        const explanationVal = typeof q.explanation === 'string' ? q.explanation : 'Refer to the course outline for detailed concepts.';

        return {
          question: questionVal,
          options: cleanedOptions,
          correctAnswer: ['A', 'B', 'C', 'D'].includes(correctAnswer) ? correctAnswer : 'A',
          explanation: explanationVal
        };
      });

      // Shuffle and select exactly 12 questions for quick quiz
      const shuffledQuiz = [...mappedQuiz].sort(() => 0.5 - Math.random());
      const slicedQuiz = shuffledQuiz.slice(0, 12);

      return NextResponse.json({ data: slicedQuiz });
    }

    // Process reading content into plain text
    let textContent = '';
    try {
      const parsed = JSON.parse(material.parsed_content);
      if (Array.isArray(parsed)) {
        textContent = parsed.map((b: unknown) => {
          if (!b || typeof b !== 'object') return '';
          const obj = b as Record<string, unknown>;
          if (typeof obj.content === 'string') return obj.content;
          if (typeof obj.question_text === 'string' || typeof obj.question === 'string') {
            const options = Array.isArray(obj.options) ? obj.options : [];
            const corrAns = obj.correct_answer || obj.correctAnswer;
            const corrAnsStr = typeof corrAns === 'string' ? corrAns : '';
            const explanationStr = typeof obj.explanation === 'string' ? obj.explanation : '';
            const qText = obj.question_text || obj.question;
            const qTextStr = typeof qText === 'string' ? qText : '';
            return `Question: ${qTextStr}\nOptions: ${options.join(', ')}\nCorrect Answer: ${corrAnsStr}\nExplanation: ${explanationStr}`;
          }
          return '';
        }).join('\n\n').slice(0, 8000);
      } else {
        textContent = material.parsed_content.slice(0, 8000);
      }
    } catch {
      textContent = material.parsed_content.slice(0, 8000);
    }

    const groq = new Groq({ apiKey });

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'notes') {
      systemPrompt = `You are an expert academic tutor for the course ${courseCode} (${courseTitle}). Your only output is a valid JSON object matching the exact requested structure. Do not include any markdown fences or thinking tags in your final answer.`;
      userPrompt = `Analyze the following course material content for the course ${courseCode} (${courseTitle}) and generate a highly professional study guide/enhanced notes in JSON format. All concepts and notes must strictly pertain only to ${courseCode} (${courseTitle}).
      
      Respond ONLY with a JSON object structured exactly as follows:
      {
        "summary": "A concise executive summary paragraph of the main theme.",
        "keyConcepts": [
          { "concept": "Concept/Term Name", "description": "Clear explanation or mathematical formula if applicable." }
        ],
        "takeaways": [
          "Crucial study takeaway point 1",
          "Crucial study takeaway point 2"
        ]
      }
      
      CONTENT:
      ${textContent}`;
    } else if (type === 'quiz') {
      systemPrompt = `You are an expert academic CBT exam compiler for the course ${courseCode} (${courseTitle}). Your only task is to extract or generate exactly 12 multiple-choice questions (MCQs) that are DIRECTLY and STRICTLY based ONLY on the provided CONTENT and specifically within the scope of ${courseCode} (${courseTitle}).
You must NOT use general knowledge or external concepts. All questions, options, and answers must be completely supported by the facts and text in the CONTENT.
If the CONTENT contains actual exam questions, verbatim extract and format exactly 12 of those real exam questions.
Your only output is a valid JSON object containing an array of question objects under the key "quiz". Do not include any markdown fences or thinking tags in your final answer.`;
      userPrompt = `Based on the following content for the course ${courseCode} (${courseTitle}), generate/extract exactly 12 challenging multiple-choice questions (MCQs) testing conceptual understanding of the topics present in the text.
      
      Respond ONLY with a JSON object structured exactly as follows:
      {
        "quiz": [
          {
            "question": "Clear and conceptual question statement?",
            "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
            "correctAnswer": "A",
            "explanation": "Detailed step-by-step academic explanation of why this answer is correct, referencing facts from the content."
          }
        ]
      }
      
      Ensure that the questions cover different, diverse parts of the content, avoiding repetitive topics. Make the options realistic and academic. correctAnswer must be a single letter ("A", "B", "C", or "D").
      
      [Randomisation Seed: ${Math.floor(Math.random() * 1000000)}]
      
      CONTENT:
      ${textContent}`;
    } else if (type === 'flashcards') {
      systemPrompt = `You are a memory specialist in active recall for the course ${courseCode} (${courseTitle}). Your only output is a valid JSON object containing an array of flashcard objects under the key "flashcards". Do not include any markdown fences or thinking tags in your final answer.`;
      userPrompt = `Generate between 5 and 7 professional, highly targeted study flashcards based on the following text content for the course ${courseCode} (${courseTitle}).
      
      Respond ONLY with a JSON object structured exactly as follows:
      {
        "flashcards": [
          {
            "front": "Term, key concept question, or formula prompt.",
            "back": "Concise answer, definition, or solution for the back of the card."
          }
        ]
      }
      
      CONTENT:
      ${textContent}`;
    } else {
      return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });
    }

    let temperature = 0.2;
    if (type === 'quiz') {
      temperature = 0.7; // Higher temperature for high-diversity, non-repetitive generation
    }

    let maxTokens = 1500;
    if (type === 'quiz') {
      maxTokens = 2048;
    } else if (type === 'flashcards') {
      maxTokens = 1200;
    }

    const completion = await generateWithRetry(groq, {
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: maxTokens
    });

    const textResponse = completion.choices[0]?.message?.content || '{}';
    const parsedData = cleanAndParseJson(textResponse);

    const dataObj = (parsedData && typeof parsedData === 'object') ? (parsedData as Record<string, unknown>) : {};
    let finalData: unknown = parsedData;

    if (type === 'quiz') {
      let list = dataObj.quiz || dataObj.questions || parsedData;
      if (list && typeof list === 'object' && !Array.isArray(list)) {
        const listObj = list as Record<string, unknown>;
        const keys = Object.keys(listObj);
        const arrayKey = keys.find(k => Array.isArray(listObj[k]));
        if (arrayKey) list = listObj[arrayKey];
      }
      finalData = Array.isArray(list) ? list : [];
    } else if (type === 'flashcards') {
      let list = dataObj.flashcards || dataObj.cards || dataObj.data || parsedData;
      if (list && typeof list === 'object' && !Array.isArray(list)) {
        const listObj = list as Record<string, unknown>;
        const keys = Object.keys(listObj);
        const arrayKey = keys.find(k => Array.isArray(listObj[k]));
        if (arrayKey) list = listObj[arrayKey];
      }
      finalData = Array.isArray(list) ? list : [];
    }

    return NextResponse.json({ data: finalData });

  } catch (error: unknown) {
    console.error(`[workspace/generate] error for type ${type}:`, error);
    const message = error instanceof Error ? error.message : 'AI Generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
