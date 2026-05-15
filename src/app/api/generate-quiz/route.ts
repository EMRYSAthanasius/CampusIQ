import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Initialize Gemini 1.5 Pro
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

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

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
  },
});

export async function POST(req: NextRequest) {
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

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY === 'your_gemini_api_key_here') {
      return NextResponse.json({ error: 'Gemini API Key is not configured' }, { status: 500 });
    }

    // 1. Fetch parsed content from course_materials
    const { data: material, error: materialError } = await supabase
      .from('course_materials')
      .select('title, parsed_content')
      .eq('id', materialId)
      .single();

    if (materialError || !material || !material.parsed_content) {
      return NextResponse.json({ error: 'Material content not found or not yet parsed.' }, { status: 404 });
    }

    // Combine parsed blocks into a context string
    let contentText = '';
    try {
      const blocks = JSON.parse(material.parsed_content);
      contentText = blocks.map((b: any) => b.content).join('\n\n').slice(0, 35000);
    } catch (e) {
      return NextResponse.json({ error: 'Failed to read parsed content format.' }, { status: 500 });
    }

    if (!contentText || contentText.length < 100) {
      return NextResponse.json({ error: 'Material content is too short to generate a high-quality quiz.' }, { status: 422 });
    }

    // 2. Generate questions via Gemini 1.5 Pro
    console.log(`Generating quiz for: ${material.title}`);
    const prompt = `Generate exactly 10 high-quality multiple-choice questions (MCQs) based on the following academic material: "${material.title}". 
    Ensure the questions are challenging and cover the core concepts mentioned in the text.
    
    MATERIAL CONTENT:
    ${contentText}`;

    const result = await model.generateContent(prompt);
    const generatedResponse = result.response.text();
    const questions = JSON.parse(generatedResponse);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI failed to generate a valid list of questions.');
    }

    // 3. Database Transaction (Sequential)
    
    // Step A: Create the Quiz entry
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        course_id: courseId,
        title: `Smart Quiz: ${material.title}`,
        description: `AI-generated active recall quiz based on: ${material.title}`,
        type: 'topic_practice',
        question_count: questions.length,
        difficulty: 'mixed',
        is_active: true,
        is_free: true
      })
      .select('id')
      .single();

    if (quizError || !quiz) {
      console.error('Quiz creation error:', quizError);
      throw new Error(`Failed to create quiz record: ${quizError?.message}`);
    }

    // Step B: Insert the Questions
    const questionsToInsert = questions.map((q: any) => ({
      course_id: courseId,
      content: q.content,
      options: q.options,
      correct_option_index: q.correct_option_index,
      explanation: q.explanation,
      difficulty: q.difficulty,
      source_type: 'custom',
      is_active: true
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select('id');

    if (insertError || !insertedQuestions) {
      console.error('Questions insertion error:', insertError);
      throw new Error(`Failed to insert generated questions: ${insertError?.message}`);
    }

    // Step C: Link Quiz and Questions via junction table
    const junctionRows = insertedQuestions.map((q: any, i: number) => ({
      quiz_id: quiz.id,
      question_id: q.id,
      order: i + 1
    }));

    const { error: junctionError } = await supabase
      .from('quiz_questions')
      .insert(junctionRows);

    if (junctionError) {
      console.error('Junction table error:', junctionError);
      throw new Error(`Failed to link questions to the quiz: ${junctionError.message}`);
    }

    return NextResponse.json({
      success: true,
      quizId: quiz.id,
      materialTitle: material.title,
      questionCount: questions.length,
      message: 'Active recall quiz generated successfully.'
    });

  } catch (error: any) {
    console.error('Quiz Generation API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
