import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get('courseCode');

    if (!courseCode) {
      return NextResponse.json({ error: 'Course code is required' }, { status: 400 });
    }

    const storageCode = courseCode.replace(/\s+/g, '').toUpperCase();
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get Course ID
    const { data: courseRow } = await supabase
      .from('courses')
      .select('id')
      .or(`code.eq.${storageCode},code.eq.${courseCode}`)
      .maybeSingle();

    if (!courseRow) {
      return NextResponse.json({ questions: [], message: 'Course context not found.' });
    }

    // 2. Fetch course materials questions
    const { data: materials, error: matErr } = await supabase
      .from('course_materials')
      .select('*')
      .eq('course_id', courseRow.id);

    if (matErr) {
      console.error('[quiz/generate] course_materials query error:', matErr.message);
      return NextResponse.json({ error: 'Failed to fetch course materials' }, { status: 500 });
    }

    // Filter materials for question files
    const questionMaterials = (materials || []).filter((m: any) => 
      m.file_url.toLowerCase().includes('/question/') || 
      m.file_url.toLowerCase().includes('/questions/')
    );

    const questionsList: any[] = [];
    for (const m of questionMaterials) {
      if (m.parsed_content) {
        try {
          const parsed = JSON.parse(m.parsed_content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((q: any) => {
              questionsList.push({
                id: q.id || `${m.id}-${questionsList.length}`,
                course_code: storageCode,
                question_text: q.question_text || q.question || '',
                options: Array.isArray(q.options) ? q.options : [],
                correct_answer: q.correct_answer || q.correct_option || 'A',
                explanation: q.explanation || null
              });
            });
          }
        } catch {
          // Skip corrupt rows
        }
      }
    }

    if (questionsList.length === 0) {
      return NextResponse.json({ 
        questions: [], 
        message: 'No questions found for this course yet. Please scan files first.' 
      });
    }

    const shuffled = [...questionsList].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, 20);

    return NextResponse.json({
      courseCode,
      questions: selectedQuestions,
      totalAvailable: questionsList.length
    });

  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { courseCode } = await req.json();
    if (!courseCode) {
      return NextResponse.json({ error: 'Course code is required' }, { status: 400 });
    }
    
    const url = new URL(req.url);
    url.searchParams.set('courseCode', courseCode);
    return GET(new NextRequest(url, { headers: req.headers }));
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
