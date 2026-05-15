import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini 1.5 Pro
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, materialId } = body;

    if (!message || !materialId) {
      return NextResponse.json({ error: 'Missing message or materialId' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return NextResponse.json({ error: 'Gemini API Key is not configured' }, { status: 500 });
    }

    // 1. Fetch parsed content from course_materials
    const { data: material, error: materialError } = await supabase
      .from('course_materials')
      .select('title, parsed_content')
      .eq('id', materialId)
      .single();

    if (materialError || !material || !material.parsed_content) {
      return NextResponse.json({ error: 'Material content not found. Please ensure the document is parsed first.' }, { status: 404 });
    }

    // Combine parsed blocks into a context string
    let contentText = '';
    try {
      const blocks = JSON.parse(material.parsed_content);
      contentText = blocks.map((b: any) => b.content).join('\n\n').slice(0, 30000);
    } catch (e) {
      // Fallback if it's already a string
      contentText = material.parsed_content.slice(0, 30000);
    }

    // 2. Call Gemini 1.5 Pro with RAG prompt
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `You are a world-class academic tutor for CampusIQ. Use the following course material to answer the student's question accurately. 
    If the answer isn't in the text, use your general knowledge but mention it's not in the manual. 
    Keep your responses academic, helpful, and concise.

    COURSE MATERIAL: "${material.title}"
    TEXT CONTENT: 
    ${contentText} 
    
    STUDENT QUESTION: 
    ${message}`;

    // 3. Streaming Response
    const result = await model.generateContentStream(prompt);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(encoder.encode(chunkText));
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
