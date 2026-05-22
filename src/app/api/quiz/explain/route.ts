import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Model fallback chain — ordered from newest to oldest for this SDK version
const MODEL_FALLBACKS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
]

export async function POST(req: Request) {
  try {
    const { question, options, correctAnswer, userAnswer } = await req.json();

    if (!question || !options || !correctAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = 
      process.env.GEMINI_API_KEY || 
      process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        explanation: "AI Explanation requires a Gemini API key. Please add GOOGLE_GENERATIVE_AI_API_KEY to your environment variables." 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `You are an expert tutor explaining a multiple-choice question to a student.

Question: ${question}

Options:
${options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

The correct answer is: ${correctAnswer}
The student answered: ${userAnswer || 'Skipped (did not answer)'}

Provide a clear, concise explanation (2-3 sentences) of WHY the correct answer is right. If the student got it wrong or skipped it, briefly explain why their choice was incorrect.`;

    // Try each model in the fallback chain until one works
    let lastError: any = null;
    for (const modelName of MODEL_FALLBACKS) {
      try {
        console.log(`[quiz/explain] Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = (await result.response).text();
        console.log(`[quiz/explain] Success with model: ${modelName}`);
        return NextResponse.json({ explanation: text });
      } catch (e: any) {
        console.warn(`[quiz/explain] Model ${modelName} failed: ${e.message}`);
        lastError = e;
        // Only continue the loop for 404 errors (model not found)
        if (!e.message?.includes('404')) break;
      }
    }

    // All models failed
    return NextResponse.json({ 
      error: `AI service unavailable: ${lastError?.message || 'All models failed'}` 
    }, { status: 500 });

  } catch (error: any) {
    console.error('[quiz/explain] Unexpected error:', error);
    return NextResponse.json({ 
      error: `Unexpected error: ${error.message}` 
    }, { status: 500 });
  }
}
