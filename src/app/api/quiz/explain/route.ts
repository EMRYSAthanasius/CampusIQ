import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { question, options, correctAnswer, userAnswer } = await req.json();

    if (!question || !options || !correctAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure you have GEMINI_API_KEY in your .env.local
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ explanation: "AI Explanation requires a Gemini API key configured in the environment variables."});
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert tutor explaining a multiple-choice question to a student.
      
      Question: ${question}
      Options:
      ${options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}
      
      The correct answer is: ${correctAnswer}
      The student answered: ${userAnswer || 'Skipped'}

      Please provide a brief, concise, and easy-to-understand breakdown (max 3 sentences) of WHY the correct answer is correct, and if applicable, why the student's answer was wrong.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ explanation: text });
  } catch (error: any) {
    console.error('Error generating explanation:', error);
    return NextResponse.json({ error: 'Failed to generate explanation.' }, { status: 500 });
  }
}
