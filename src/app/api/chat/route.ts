import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log(">>> CHAT API INVOCATION START <<<");
  
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    console.log("Step 1: API Key Check ->", !!apiKey ? "FOUND" : "MISSING");

    if (!apiKey) {
      console.error("CRITICAL: GOOGLE_GENERATIVE_AI_API_KEY is undefined on server.");
      return NextResponse.json({ error: 'Server-side configuration missing' }, { status: 500 });
    }

    console.log("Step 2: Initializing Supabase");
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn("Step 2.1: Auth Error ->", authError?.message || "User not found");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log("Step 2.2: User Authenticated ->", user.id);

    console.log("Step 3: Parsing Request Body");
    const body = await req.json();
    const { message, materialId } = body;
    console.log("Step 3.1: materialId ->", materialId);

    if (!message || !materialId) {
      return NextResponse.json({ error: 'Missing message or materialId' }, { status: 400 });
    }

    console.log("Step 4: Fetching Material Context");
    const { data: material, error: materialError } = await supabase
      .from('course_materials')
      .select('title, parsed_content')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      console.error("Step 4.1: Material Fetch Error ->", materialError?.message || "Not found");
      return NextResponse.json({ error: 'Material context not found.' }, { status: 404 });
    }

    let contentText = '';
    try {
      const parsed = JSON.parse(material.parsed_content);
      contentText = Array.isArray(parsed) ? parsed.map((b: any) => b.content).join('\n\n') : material.parsed_content;
      contentText = contentText.slice(0, 30000);
    } catch (e) {
      contentText = (material.parsed_content || '').slice(0, 30000);
    }
    console.log("Step 4.2: Content Length ->", contentText.length);

    console.log("Step 5: Initializing Gemini SDK");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `You are a world-class academic tutor for CampusIQ. Use the following course material to answer the student's question accurately. 
    If the answer isn't in the text, use your general knowledge but mention it's not in the manual. 
    Keep your responses academic, helpful, and concise.

    COURSE MATERIAL: "${material.title}"
    TEXT CONTENT: 
    ${contentText} 
    
    STUDENT QUESTION: 
    ${message}`;

    console.log("Step 6: Calling generateContentStream");
    try {
      const result = await model.generateContentStream(prompt);
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          console.log("Step 7: Stream Started");
          try {
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              controller.enqueue(encoder.encode(chunkText));
            }
            console.log("Step 8: Stream Completed Successfully");
            controller.close();
          } catch (streamErr: any) {
            console.error('STREAMING ERROR:', streamErr);
            controller.error(streamErr);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    } catch (geminiError: any) {
      console.error('Step 6 ERROR (Gemini Call):', geminiError);
      return NextResponse.json({ 
        error: `Gemini SDK Error: ${geminiError.message || 'Unknown failure'}`,
      }, { status: 500 });
    }

  } catch (fatalError: any) {
    console.error('FATAL CHAT API ERROR:', fatalError);
    return NextResponse.json(
      { error: 'Internal Server Error', details: fatalError.message },
      { status: 500 }
    );
  }
}
