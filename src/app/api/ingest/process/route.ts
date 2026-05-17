import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Polyfill missing browser globals for pdfjs
if (typeof global !== 'undefined') {
  if (typeof (global as any).DOMMatrix === 'undefined') (global as any).DOMMatrix = class DOMMatrix {};
  if (typeof (global as any).Path2D === 'undefined') (global as any).Path2D = class Path2D {};
}

/**
 * Normalizes course codes (e.g. "BIO 102" -> "BIO102") and checks or inserts 
 * the course dynamically in the database to satisfy the foreign key constraint.
 */
async function getOrCreateCourse(supabase: any, courseCode: string): Promise<string | null> {
  const normalized = courseCode.replace(/\s+/g, '').toUpperCase();
  
  // 1. Try selecting existing course
  const { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('code', normalized)
    .maybeSingle();
    
  if (existing?.id) return existing.id;
  
  // Also check with space (e.g. "BIO 102")
  const spaced = normalized.replace(/^([A-Z]+)(\d+)$/, '$1 $2');
  const { data: existingSpaced } = await supabase
    .from('courses')
    .select('id')
    .eq('code', spaced)
    .maybeSingle();
    
  if (existingSpaced?.id) return existingSpaced.id;
  
  // 2. Create the course if missing
  console.log(`[getOrCreateCourse] Course "${normalized}" not found in DB. Creating automatically...`);
  const { data: newCourse, error } = await supabase
    .from('courses')
    .insert([
      {
        code: normalized,
        title: `Course ${normalized}`,
        description: `Automatically generated course space for ${normalized}.`
      }
    ])
    .select('id')
    .single();
    
  if (error) {
    console.error(`[getOrCreateCourse] Failed to create course "${normalized}":`, error.message);
    return null;
  }
  
  return newCourse.id;
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
    // Expected pattern: "CSC101/Material/intro.pdf" or "CSC101/Questions/exam1.pdf"
    const pathParts = storagePath.split('/');
    if (pathParts.length < 3) {
      return NextResponse.json({ error: 'Invalid storage path structure. Expected [course_code]/[type]/[file]' }, { status: 400 });
    }

    const courseCode = pathParts[0];
    const type = pathParts[1]; // "Material", "Manual", or "Questions"
    const fileName = pathParts[pathParts.length - 1];

    // Resolve or create course ID
    const courseId = await getOrCreateCourse(supabase, courseCode);
    if (!courseId) {
      return NextResponse.json({ error: 'Could not resolve or create course context' }, { status: 500 });
    }

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

    // Check or insert material tracking row
    const { data: existingMat } = await supabase
      .from('course_materials')
      .select('id')
      .eq('file_url', storagePath)
      .maybeSingle();

    let materialId = existingMat?.id;

    if (!existingMat) {
      const { data: newMat, error: insertMatErr } = await supabase
        .from('course_materials')
        .insert([
          {
            course_id: courseId,
            title: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') + ` (${type})`,
            file_url: storagePath,
            is_active: true
          }
        ])
        .select('id')
        .single();

      if (!insertMatErr && newMat) {
        materialId = newMat.id;
      } else {
        console.error('[ingest/process] Failed to insert material tracker row:', insertMatErr?.message);
        return NextResponse.json({ error: 'Failed to create material tracking record' }, { status: 500 });
      }
    }

    if (type === 'Material' || type === 'Manual') {
      // Process as Study Manual / Material
      const paragraphs = text.split(/\n\s*\n/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);
      const blocks = paragraphs.map((t: string, i: number) => ({ id: `p-${i}`, type: 'paragraph', content: t }));

      if (materialId) {
        await supabase
          .from('course_materials')
          .update({ parsed_content: JSON.stringify(blocks) })
          .eq('id', materialId);
      }

      return NextResponse.json({ success: true, type, courseCode, blockCount: blocks.length });
    } 
    
    if (type === 'Questions') {
      // Process as Exam Questions
      const questionBlocks = text.split(/\n(?=\d+[\.\)])/);
      const questions = questionBlocks.map((block: string) => {
        const lines = block.trim().split('\n');
        const questionText = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
        
        // Extract options (A, B, C, D)
        const optionsMatch = block.match(/[A-D][\)\.]\s+([^\n]+)/g);
        const options = optionsMatch ? optionsMatch.map((o: string) => o.replace(/^[A-D][\)\.]\s+/, '').trim()) : [];
        
        // Try to find correct answer (often labeled "Answer: A" or similar)
        const answerMatch = block.match(/Answer:\s*([A-D])/i);
        const correctAnswer = answerMatch ? answerMatch[1].toUpperCase() : 'A';

        return {
          question_text: questionText,
          options,
          correct_answer: correctAnswer
        };
      }).filter((q: { question_text: string }) => q.question_text.length > 5);

      if (questions.length > 0 && materialId) {
        await supabase
          .from('course_materials')
          .update({ parsed_content: JSON.stringify(questions) })
          .eq('id', materialId);
      }

      return NextResponse.json({ success: true, type: 'Questions', courseCode, questionCount: questions.length });
    }

    return NextResponse.json({ error: 'Unknown file type in path' }, { status: 400 });

  } catch (error: any) {
    console.error('Ingestion Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
