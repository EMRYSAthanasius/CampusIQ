import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

async function generateWithRetry(groq: Groq, params: any, retries = 3, delayMs = 1500): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await groq.chat.completions.create(params);
    } catch (err: any) {
      const errMsg = err.message || '';
      const isTransient = errMsg.includes('503') || errMsg.includes('429') || err.status === 503 || err.status === 429;
      if (isTransient && i < retries - 1) {
        console.warn(`[workspace/generate] Groq transient error, retrying in ${delayMs}ms (Attempt ${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
        continue;
      }
      throw err;
    }
  }
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
      .select('title, parsed_content')
      .eq('id', materialId)
      .single();

    if (materialError || !material || !material.parsed_content) {
      return NextResponse.json({ error: 'Material content not found' }, { status: 404 });
    }

    // Detect structured past question paper format
    let isQuestionPaper = false;
    let questionsList: any[] = [];
    try {
      const parsed = JSON.parse(material.parsed_content);
      if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].question_text || parsed[0].question)) {
        isQuestionPaper = true;
        questionsList = parsed;
      }
    } catch {}

    // Direct past-question quiz loading (Ask questions only relating to the particular test the user is currently on)
    if (type === 'quiz' && isQuestionPaper) {
      console.log(`[workspace/generate] Returning direct mapped past questions for material ID: ${materialId}`);
      const mappedQuiz = questionsList.map((q: any) => {
        // Clean options prefixes (e.g. "A) ...") if present
        const cleanedOptions = (q.options || []).map((o: string) => {
          return typeof o === 'string' ? o.replace(/^[A-D]\)\s*/i, '').trim() : '';
        });

        let correctAnswer = (q.correct_answer || q.correctAnswer || 'A').trim().toUpperCase();
        if (correctAnswer.length > 1) {
          correctAnswer = correctAnswer.charAt(0);
        }

        return {
          question: q.question_text || q.question || 'Question content missing',
          options: cleanedOptions,
          correctAnswer: ['A', 'B', 'C', 'D'].includes(correctAnswer) ? correctAnswer : 'A',
          explanation: q.explanation || 'Refer to the course outline for detailed concepts.'
        };
      });

      return NextResponse.json({ data: mappedQuiz });
    }

    // Process reading content into plain text
    let textContent = '';
    try {
      const parsed = JSON.parse(material.parsed_content);
      if (Array.isArray(parsed)) {
        textContent = parsed.map((b: any) => {
          if (b.content) return b.content;
          if (b.question_text || b.question) {
            return `Question: ${b.question_text || b.question}\nOptions: ${(b.options || []).join(', ')}\nCorrect Answer: ${b.correct_answer || b.correctAnswer || ''}\nExplanation: ${b.explanation || ''}`;
          }
          return '';
        }).join('\n\n').slice(0, 15000);
      } else {
        textContent = material.parsed_content.slice(0, 15000);
      }
    } catch {
      textContent = material.parsed_content.slice(0, 15000);
    }

    const groq = new Groq({ apiKey });

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'notes') {
      systemPrompt = `You are an expert academic tutor. Your only output is a valid JSON object matching the exact requested structure. Do not include any markdown fences or thinking tags in your final answer.`;
      userPrompt = `Analyze the following course material content and generate a highly professional study guide/enhanced notes in JSON format.
      
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
      systemPrompt = `You are a professional CBT exam compiler. Your only output is a valid JSON object containing an array of question objects under the key "quiz". Do not include any markdown fences or thinking tags in your final answer.`;
      userPrompt = `Generate exactly 5 challenging multiple-choice questions (MCQs) testing conceptual understanding of the following content.
      
      Respond ONLY with a JSON object structured exactly as follows:
      {
        "quiz": [
          {
            "question": "Clear and conceptual question statement?",
            "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
            "correctAnswer": "A",
            "explanation": "Detailed step-by-step academic explanation of why this answer is correct."
          }
        ]
      }
      
      Make the options realistic and academic. correctAnswer must be a single letter ("A", "B", "C", or "D").
      
      CONTENT:
      ${textContent}`;
    } else if (type === 'flashcards') {
      systemPrompt = `You are a memory specialist in active recall. Your only output is a valid JSON object containing an array of flashcard objects under the key "flashcards". Do not include any markdown fences or thinking tags in your final answer.`;
      userPrompt = `Generate between 5 and 7 professional, highly targeted study flashcards based on the following text content.
      
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

    const completion = await generateWithRetry(groq, {
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 4096
    });

    const textResponse = completion.choices[0]?.message?.content || '{}';
    const parsedData = JSON.parse(textResponse);

    let finalData = parsedData;
    if (type === 'quiz') {
      finalData = parsedData.quiz || parsedData.questions || parsedData;
    } else if (type === 'flashcards') {
      finalData = parsedData.flashcards || parsedData.cards || parsedData;
    }

    return NextResponse.json({ data: finalData });

  } catch (error: any) {
    console.error(`[workspace/generate] error for type ${type}:`, error);
    return NextResponse.json({ error: error.message || 'AI Generation failed.' }, { status: 500 });
  }
}
