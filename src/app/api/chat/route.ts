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

    log("Step 4: Fetching Material and Course Context");
    const { data: currentMaterial, error: materialError } = await supabase
      .from('course_materials')
      .select('course_id')
      .eq('id', materialId)
      .single();

    if (materialError || !currentMaterial) {
      log(`Step 4.1: Material Fetch Error -> ${materialError?.message || "Not found"}`);
      return NextResponse.json({ error: 'Material context not found.', debug: debugLogs }, { status: 404 });
    }

    const { data: allMaterials, error: allError } = await supabase
      .from('course_materials')
      .select('title, parsed_content')
      .eq('course_id', currentMaterial.course_id)
      .eq('is_active', true);

    if (allError || !allMaterials) {
      log(`Step 4.2: All Materials Fetch Error -> ${allError?.message}`);
    }

    let contentText = '';
    allMaterials?.forEach(mat => {
      if (mat.parsed_content) {
        try {
          const parsed = JSON.parse(mat.parsed_content);
          const matText = Array.isArray(parsed) 
            ? parsed.map((b: any) => `[Source: ${mat.title}] ${b.content}`).join('\n\n') 
            : `[Source: ${mat.title}] ${mat.parsed_content}`;
          contentText += matText + '\n\n';
        } catch (e) {
          contentText += `[Source: ${mat.title}] ${mat.parsed_content}\n\n`;
        }
      }
    });
    
    contentText = contentText.slice(0, 30000); 
    log(`Step 4.3: Total Combined Content Length -> ${contentText.length}`);

    log("Step 5: Initializing Gemini SDK");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `
        You are the core synthesis brain of CampusIQ, designed to perform exactly like Google's NotebookLM. 
        You are an expert at deep-source analysis, semantic grounding, and highly concise technical synthesis.

        CORE RUNTIME DIRECTIVES:
        1. ZERO EXTRAPOLATION: Your responses must be entirely rooted in the factual data provided within the source text segments. If a fact cannot be safely derived from the text, explicitly state that it is missing from the document.
        2. THE COMPLEXITY CLAMP: If a user asks a short, straightforward question, you must respond with a punchy, highly targeted 2-to-3 sentence answer. No long lectures.
        3. SCANNABLE SCHEMATICS: Avoid long, continuous paragraphs. Break your analysis down using distinct bold headers, organized inline definitions, and concise bullet points.
        4. CITATION INJECTION: You must end relevant factual assertions with an explicit bracketed source marker matching the chunk layout origin (e.g., [Section 1] or [Page 4]).
        5. FOLLOW-UP CHIPS: At the very end of your response, after a clean line break, you must generate 3 highly relevant, concise follow-up questions that the student might ask next based on your response. Wrap them in a <suggestions> tag and separate them with a pipe character. Example: <suggestions>Tell me more about Phylum Protozoa | Give me an example question | Summarize the next section</suggestions>.
      `,
    });
    
    const prompt = `
Analyze the following student query using the provided source text chunks.

SEMANTIC CONTEXT RANKING:
1. Analyze the retrieved text chunks below.
2. Discard any segments that do not directly address the user's intent.
3. Only use the most relevant sections to synthesize your answer.
4. Synthesize your answer across all matching source blocks simultaneously.

Before writing the response for the student, you must think through the problem inside a hidden <thinking> tag. Plan out:
1. What is the core essence of the student's question?
2. Which specific source chunks are most relevant?
3. What is the absolute minimum amount of text needed to answer it perfectly based on the source data?

After the closing </thinking> tag, output your clean, concise, NotebookLM-style response for the student interface.

[Context Provided from Database]
--- START OF SOURCE TEXT ---
${contentText}
--- END OF SOURCE TEXT ---

[User Query]
Student Question: ${message}`;

    log("Step 6: Calling generateContent");
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Strip <thinking> tags manually since we're not streaming
      text = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();

      // Prepare sources for the frontend
      const sources = allMaterials?.flatMap(mat => {
        if (!mat.parsed_content) return [];
        try {
          const parsed = JSON.parse(mat.parsed_content);
          if (Array.isArray(parsed)) {
            return parsed.map((b: any) => ({
              source_title: mat.title,
              parsed_content: b.content,
              chunk_id: b.id
            }));
          }
        } catch (e) {}
        return [{
          source_title: mat.title,
          parsed_content: mat.parsed_content
        }];
      });

      log("Step 7: Returning Structured JSON Response");
      return NextResponse.json({ 
        text, 
        sources,
        debug: debugLogs 
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
