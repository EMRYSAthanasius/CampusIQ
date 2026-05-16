import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { materialId, courseId } = body;

    if (!materialId || !courseId) {
      return NextResponse.json({ error: 'Missing materialId or courseId' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Server-side configuration missing' }, { status: 500 });
    }

    const { data: material, error: materialError } = await supabase
      .from('course_materials')
      .select('title, parsed_content')
      .eq('id', materialId)
      .single();

    if (materialError || !material || !material.parsed_content) {
      return NextResponse.json({ error: 'Material content not found.' }, { status: 404 });
    }

    let contentText = '';
    try {
      const blocks = JSON.parse(material.parsed_content);
      contentText = Array.isArray(blocks) ? blocks.map((b: any) => b.content).join('\n\n').slice(0, 30000) : material.parsed_content.slice(0, 30000);
    } catch (e) {
      contentText = (material.parsed_content || '').slice(0, 30000);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `Generate exactly 10 multiple-choice questions (MCQs) for: ${material.title}\n
    Respond ONLY with a JSON array of objects: [{ "content": string, "options": string[], "correct_option_index": number, "explanation": string, "difficulty": string }]
    
    CONTENT: ${contentText}`;

    const result = await model.generateContent(prompt);
    const generatedResponse = result.response.text();
    const jsonMatch = generatedResponse.match(/\[[\s\S]*\]/);
    const questions = JSON.parse(jsonMatch ? jsonMatch[0] : generatedResponse);

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

    if (quizError || !quiz) throw new Error('Failed to create quiz');

    const questionsToInsert = questions.map((q: any) => ({
      course_id: courseId,
      content: q.content,
      options: q.options,
      correct_option_index: q.correct_option_index,
      explanation: q.explanation,
      difficulty: q.difficulty || 'medium',
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select('id');

    if (insertError || !insertedQuestions) throw new Error('Failed to insert questions');

    const junctionRows = insertedQuestions.map((q: any, i: number) => ({
      quiz_id: quiz.id,
      question_id: q.id,
      order: i + 1
    }));

    await supabase.from('quiz_questions').insert(junctionRows);

    return NextResponse.json({ success: true, quizId: quiz.id });

  } catch (error: any) {
    console.error('Quiz Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
