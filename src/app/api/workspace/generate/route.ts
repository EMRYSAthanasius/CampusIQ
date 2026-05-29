import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

async function generateWithRetry(model: any, prompt: string, retries = 3, delayMs = 1500): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (err: any) {
      const errMsg = err.message || '';
      const isTransient = errMsg.includes('503') || errMsg.includes('429') || err.status === 503 || err.status === 429;
      if (isTransient && i < retries - 1) {
        console.warn(`[workspace/generate] Transient error, retrying in ${delayMs}ms (Attempt ${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
        continue;
      }
      throw err;
    }
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  let type = 'unknown';
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key configuration missing on server.' }, { status: 500 });
    }

    const body = await req.json();
    const { materialId } = body;
    type = body.type;

    if (!materialId || !type) {
      return NextResponse.json({ error: 'Missing materialId or type' }, { status: 400 });
    }

    // Fetch the material parsed content
    const { data: material, error: materialError } = await supabase
      .from('course_materials')
      .select('title, parsed_content')
      .eq('id', materialId)
      .single();

    if (materialError || !material || !material.parsed_content) {
      return NextResponse.json({ error: 'Material content not found' }, { status: 404 });
    }

    let textContent = '';
    try {
      const parsed = JSON.parse(material.parsed_content);
      textContent = Array.isArray(parsed) 
        ? parsed.map((b: any) => b.content || '').join('\n\n').slice(0, 15000) 
        : material.parsed_content.slice(0, 15000);
    } catch {
      textContent = material.parsed_content.slice(0, 15000);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt = '';
    if (type === 'notes') {
      prompt = `You are an expert academic tutor. Analyze the following course material content and generate a highly professional study guide/enhanced notes in JSON format.
      
      Respond ONLY with a JSON object structured exactly as follows:
      {
        "summary": "A concise executive summary paragraph of the main theme.",
        "keyConcepts": [
          { "concept": "Concept/Term Name", "description": "Clear explanation or mathematical formula if applicable." }
        ],
        "takeaways": [
          "Crucial study takeaway point 1",
          "Crucial study takeaway point 2"
        ]
      }
      
      Do not include markdown tags like \`\`\`json. Just raw valid JSON.
      
      CONTENT:
      ${textContent}`;
    } else if (type === 'quiz') {
      prompt = `You are a professional CBT exam compiler. Generate exactly 5 challenging multiple-choice questions (MCQs) testing conceptual understanding of the following content.
      
      Respond ONLY with a JSON array of objects structured exactly as follows:
      [
        {
          "question": "Clear and conceptual question statement?",
          "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
          "correctAnswer": "A",
          "explanation": "Detailed step-by-step academic explanation of why this answer is correct."
        }
      ]
      
      Make the options realistic and academic. correctAnswer must be a single letter ("A", "B", "C", or "D").
      Do not include markdown tags like \`\`\`json. Just raw valid JSON.
      
      CONTENT:
      ${textContent}`;
    } else if (type === 'flashcards') {
      prompt = `You are a memory specialist in active recall. Generate between 5 and 7 professional, highly targeted study flashcards based on the following text content.
      
      Respond ONLY with a JSON array of objects structured exactly as follows:
      [
        {
          "front": "Term, key concept question, or formula prompt.",
          "back": "Concise answer, definition, or solution for the back of the card."
        }
      ]
      
      Do not include markdown tags like \`\`\`json. Just raw valid JSON.
      
      CONTENT:
      ${textContent}`;
    } else {
      return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });
    }

    const result = await generateWithRetry(model, prompt);
    const textResponse = result.response.text();
    
    // Extract JSON in case Gemini wrapped it in markdown
    const jsonMatch = textResponse.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const parsedData = JSON.parse(jsonMatch ? jsonMatch[0] : textResponse);

    return NextResponse.json({ data: parsedData });

  } catch (error: any) {
    console.error(`[workspace/generate] error for type ${type}:`, error);
    return NextResponse.json({ error: error.message || 'AI Generation failed.' }, { status: 500 });
  }
}
