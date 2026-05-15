import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const debugLogs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    debugLogs.push(msg);
  };

  log(">>> CHAT API INVOCATION START <<<");
  
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    log(`Step 1: API Key Check -> ${!!apiKey ? "FOUND" : "MISSING"}`);

    if (!apiKey) {
      log("CRITICAL: GOOGLE_GENERATIVE_AI_API_KEY is undefined.");
      return NextResponse.json({ 
        error: 'Server-side configuration missing', 
        debug: debugLogs 
      }, { status: 500 });
    }

    log("Step 2: Initializing Supabase");
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log(`Step 2.1: Auth Error -> ${authError?.message || "User not found"}`);
      return NextResponse.json({ 
        error: 'Unauthorized', 
        debug: debugLogs 
      }, { status: 401 });
    }
    log(`Step 2.2: User Authenticated -> ${user.id}`);

    log("Step 3: Parsing Request Body");
    let body;
    try {
      body = await req.json();
    } catch (e) {
      log("Step 3.1: Body parse failed");
      return NextResponse.json({ error: 'Invalid JSON body', debug: debugLogs }, { status: 400 });
    }
    
    const { message, materialId } = body;
    log(`Step 3.2: materialId -> ${materialId}`);

    if (!message || !materialId) {
      return NextResponse.json({ error: 'Missing message or materialId', debug: debugLogs }, { status: 400 });
    }

    log("Step 4: Fetching Material Context");
    const { data: material, error: materialError } = await supabase
      .from('course_materials')
      .select('title, parsed_content')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      log(`Step 4.1: Material Fetch Error -> ${materialError?.message || "Not found"}`);
      return NextResponse.json({ error: 'Material context not found.', debug: debugLogs }, { status: 404 });
    }

    let contentText = '';
    try {
      if (material.parsed_content) {
        const parsed = JSON.parse(material.parsed_content);
        contentText = Array.isArray(parsed) ? parsed.map((b: any) => b.content).join('\n\n') : material.parsed_content;
      }
      contentText = contentText.slice(0, 20000); // Reduced slice for safety
    } catch (e) {
      contentText = (material.parsed_content || '').slice(0, 20000);
    }
    log(`Step 4.2: Content Length -> ${contentText.length}`);

    log("Step 5: Initializing Gemini SDK");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are a world-class academic tutor for CampusIQ. Use the following course material to answer the student's question accurately. 
    If the answer isn't in the text, use your general knowledge but mention it's not in the manual. 
    Keep your responses academic, helpful, and concise.

    COURSE MATERIAL: "${material.title}"
    TEXT CONTENT: 
    ${contentText} 
    
    STUDENT QUESTION: 
    ${message}`;

    log("Step 6: Calling generateContentStream");
    try {
      const result = await model.generateContentStream(prompt);
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          log("Step 7: Stream Started");
          try {
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              controller.enqueue(encoder.encode(chunkText));
            }
            log("Step 8: Stream Completed Successfully");
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
      log(`Step 6 ERROR (Gemini Call): ${geminiError.message}`);
      console.error("FULL GEMINI ERROR:", geminiError);
      
      // Check for specific error patterns
      let userFriendlyError = `Gemini SDK Error: ${geminiError.message || 'Unknown failure'}`;
      if (geminiError.message?.includes('404')) {
        userFriendlyError = "AI Model not found. This usually means the API Key is invalid or not yet active.";
      } else if (geminiError.message?.includes('403')) {
        userFriendlyError = "AI Access Forbidden. Please check if your API Key has the correct permissions and if you've accepted the Google Terms of Service.";
      }

      return NextResponse.json({ 
        error: userFriendlyError,
        details: geminiError.stack,
        debug: debugLogs
      }, { status: 500 });
    }

  } catch (fatalError: any) {
    console.error('FATAL CHAT API ERROR:', fatalError);
    return NextResponse.json(
      { error: 'Internal Server Error', details: fatalError.message, debug: debugLogs },
      { status: 500 }
    );
  }
}
