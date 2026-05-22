import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { question, options, correctAnswer, userAnswer } = await req.json();

    if (!question || !options || !correctAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return NextResponse.json({
        explanation: 'AI Explanation requires a GROQ_API_KEY set in your environment variables. Get a free key at console.groq.com.'
      });
    }

    const groq = new Groq({ apiKey });

    const prompt = `You are an expert tutor explaining a multiple-choice exam question to a student.

Question: ${question}

Options:
${options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer || 'Skipped (did not answer)'}

Provide a clear, concise explanation (2-3 sentences) of WHY the correct answer is right. If the student got it wrong or skipped it, briefly explain why their choice was incorrect. Be encouraging and educational.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a helpful academic tutor. Always respond in plain text with no markdown formatting.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 256,
    });

    const text = completion.choices[0]?.message?.content || 'Could not generate explanation.';
    return NextResponse.json({ explanation: text });

  } catch (error: any) {
    console.error('[quiz/explain] Error:', error);
    return NextResponse.json(
      { error: `Failed to generate explanation: ${error.message}` },
      { status: 500 }
    );
  }
}
