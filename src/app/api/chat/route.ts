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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `
        You are the CampusIQ Core Engine, acting exactly like NotebookLM. Your primary directive is to synthesize, summarize, and answer questions using ONLY the provided course material context.

        CRITICAL LAWS:
        1. STRICT GROUNDING: Rely strictly on the clear facts directly mentioned in the context. Do not extrapolate, assume, or bring in outside academic theories unless explicitly requested to compare.
        2. THE 'NOT IN SOURCE' RULE: If the user asks something that cannot be directly answered using the provided text, you must explicitly state: "This information is not present in the uploaded document." Then, offer a brief, clearly separated section titled "General Knowledge Context:" to answer it generally.
        3. CITATIONS: If the context contains section headers, chapter numbers, or source markers, you must include them as inline citations (e.g., [Section 1.2] or [Chapter 3]) next to the facts you extract.
        4. STRUCTURED SYNTHESIS: Never reply with dense paragraphs. Use bold headers, clean bullet points, and numbered steps to make the material instantly scannable for study purposes.
      `,
    });
    
    const prompt = `
[Context Provided from Database]
--- START OF SOURCE TEXT ---
${contentText}
--- END OF SOURCE TEXT ---

[User Query]
Student Question: ${message}`;

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
      console.error("=== RAW GEMINI ERROR ===", geminiError);
      
      let cleanMessage = "The AI is currently resting. Please try again in a moment.";
      if (geminiError.message?.includes('RESOURCE_EXHAUSTED')) {
        cleanMessage = "Free tier quota reached. Please wait a minute before asking another question.";
      }

      return NextResponse.json({ 
        error: cleanMessage,
        debug: debugLogs
      }, { status: 500 });
    }

  } catch (fatalError: any) {
    console.error("=== RAW FATAL API ERROR ===", fatalError);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please refresh and try again.", debug: debugLogs },
      { status: 500 }
    );
  }
}
