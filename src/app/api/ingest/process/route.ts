import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Polyfill missing browser globals for pdfjs
if (typeof global !== 'undefined') {
  if (typeof (global as any).DOMMatrix === 'undefined') (global as any).DOMMatrix = class DOMMatrix {};
  if (typeof (global as any).Path2D === 'undefined') (global as any).Path2D = class Path2D {};
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storagePath, bucket = 'materials' } = await req.json();

    if (!storagePath) {
      return NextResponse.json({ error: 'Missing storagePath' }, { status: 400 });
    }

    // Determine course code and type from path
    // Expected pattern: "CSC101/Manual/intro.pdf" or "CSC101/Questions/exam1.pdf"
    const pathParts = storagePath.split('/');
    if (pathParts.length < 3) {
      return NextResponse.json({ error: 'Invalid storage path structure. Expected [course_code]/[type]/[file]' }, { status: 400 });
    }

    const courseCode = pathParts[0];
    const type = pathParts[1]; // "Manual" or "Questions"

    // 1. Download File
    const { data: fileData, error: downloadError } = await supabase.storage.from(bucket).download(storagePath);
    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 404 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    // 2. Parse PDF
    const pdf = require('pdf-parse-fork');
    const parsed = await pdf(buffer);
    const text = parsed.text;

    if (type === 'Manual') {
      // Process as Study Manual
      const paragraphs = text.split(/\n\s*\n/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);
      const blocks = paragraphs.map((t: string, i: number) => ({ id: `p-${i}`, type: 'paragraph', content: t }));

      // Find or create course material record
      const { data: material } = await supabase
        .from('course_materials')
        .select('id')
        .eq('course_id', (await supabase.from('courses').select('id').eq('code', courseCode).single()).data?.id)
        .eq('title', pathParts[pathParts.length - 1])
        .single();

      if (material) {
        await supabase.from('course_materials').update({ parsed_content: JSON.stringify(blocks) }).eq('id', material.id);
      }

      return NextResponse.json({ success: true, type: 'Manual', courseCode, blockCount: blocks.length });
    } 
    
    if (type === 'Questions') {
      // Process as Exam Questions
      // Regex to find patterns like "1. Question text? A) Option 1 B) Option 2..."
      const questionBlocks = text.split(/\n(?=\d+[\.\)])/);
      const questions = questionBlocks.map((block: string) => {
        const lines = block.trim().split('\n');
        const questionText = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
        
        // Extract options (A, B, C, D)
        const optionsMatch = block.match(/[A-D][\)\.]\s+([^\n]+)/g);
        const options = optionsMatch ? optionsMatch.map((o: string) => o.replace(/^[A-D][\)\.]\s+/, '').trim()) : [];
        
        // Try to find correct answer (often labeled "Answer: A" or similar)
        const answerMatch = block.match(/Answer:\s*([A-D])/i);
        const correctAnswer = answerMatch ? answerMatch[1].toUpperCase() : 'N/A';

        return {
          course_code: courseCode,
          question_text: questionText,
          options,
          correct_answer: correctAnswer
        };
      }).filter((q: { question_text: string }) => q.question_text.length > 5);

      if (questions.length > 0) {
        const { error: insertError } = await supabase
          .from('exam_questions')
          .insert(questions);
        
        if (insertError) throw insertError;
      }

      return NextResponse.json({ success: true, type: 'Questions', courseCode, questionCount: questions.length });
    }

    return NextResponse.json({ error: 'Unknown file type in path' }, { status: 400 });

  } catch (error: any) {
    console.error('Ingestion Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
