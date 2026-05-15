import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Define the structured output schema for the quiz
const schema: any = {
  description: "A list of 10 multiple-choice questions",
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      content: { 
        type: SchemaType.STRING, 
        description: "The text of the question." 
      },
      options: { 
        type: SchemaType.ARRAY, 
        items: { type: SchemaType.STRING },
        description: "Exactly 4 distinct options for the question."
      },
      correct_option_index: { 
        type: SchemaType.NUMBER, 
        description: "The 0-based index of the correct option (0-3)." 
      },
      explanation: { 
        type: SchemaType.STRING, 
        description: "A brief explanation of why the correct option is right." 
      },
      difficulty: { 
        type: SchemaType.STRING, 
        enum: ["easy", "medium", "hard"],
        description: "The difficulty level of the question."
      },
    },
    required: ["content", "options", "correct_option_index", "explanation", "difficulty"],
  },
};

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
      contentText = blocks.map((b: any) => b.content).join('\n\n').slice(0, 30000);
    } catch (e) {
      contentText = (material.parsed_content || '').slice(0, 30000);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const prompt = `Generate 10 MCQs for: ${material.title}\nCONTENT: ${contentText}`;

    const result = await model.generateContent(prompt);
    const generatedResponse = result.response.text();
    const questions = JSON.parse(generatedResponse);

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
      difficulty: q.difficulty,
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
