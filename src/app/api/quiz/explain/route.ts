import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limiting: 10 requests per minute
    const limitRes = await rateLimit(`explain_${user.id}`, 10, 60000);
    if (!limitRes.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute before requesting another explanation.' },
        { status: 429 }
      );
    }

    const { question, options, correctAnswer, userAnswer } = await req.json().catch(() => ({}));

    if (!question || !options || !correctAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Input Validation
    if (typeof question !== 'string' || question.length > 1000) {
      return NextResponse.json({ error: 'Invalid or excessively long question' }, { status: 400 });
    }

    if (!Array.isArray(options) || options.length > 4) {
      return NextResponse.json({ error: 'Invalid options array (max 4 options allowed)' }, { status: 400 });
    }

    for (const opt of options) {
      if (typeof opt !== 'string' || opt.length > 500) {
        return NextResponse.json({ error: 'Invalid or excessively long option string' }, { status: 400 });
      }
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return NextResponse.json({
        explanation: { error: 'AI Explanation requires a GROQ_API_KEY set in your environment variables. Get a free key at console.groq.com.' }
      });
    }

    const groq = new Groq({ apiKey });

    const prompt = `You are an expert tutor explaining a multiple-choice exam question to a student.

Question: ${question}

Options:
${options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

Correct Answer: ${correctAnswer}

Your task is to briefly evaluate every single option (A, B, C, and D) in exactly 1 concise, conversational sentence.
For the correct answer, explain why it is correct and prefix your sentence with "Right answer. "
For incorrect answers, explain why it is wrong and prefix your sentence with "Not quite. "

Return ONLY a valid JSON object mapping the letters A, B, C, and D to their explanations.
Example:
{
  "A": "Not quite. This refers to the previous generation of hardware.",
  "B": "Right answer. The source identifies this as the defining characteristic of this generation.",
  "C": "Not quite. This concept was not introduced until much later.",
  "D": "Not quite. This is a completely unrelated software concept."
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a precise JSON-generating academic tutor.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 512,
    });

    const text = completion.choices[0]?.message?.content || '{}';
    let parsedExplanation;
    try {
      parsedExplanation = JSON.parse(text);
    } catch (e) {
      parsedExplanation = { error: 'Failed to parse AI response into JSON format.' };
    }

    return NextResponse.json({ explanation: parsedExplanation });

  } catch (error: any) {
    console.error('[quiz/explain] Error:', error);
    return NextResponse.json(
      { error: `Failed to generate explanation: ${error.message}` },
      { status: 500 }
    );
  }
}
