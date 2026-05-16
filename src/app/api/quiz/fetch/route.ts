import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get('courseCode');

    if (!courseCode) {
      return NextResponse.json({ error: 'Course code is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch questions for the specific course
    // We fetch more than we need and shuffle to provide variety
    const { data, error } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('course_code', courseCode)
      .limit(60);

    if (error) {
      console.error('Fetch questions error:', error);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        questions: [], 
        message: 'No questions found for this course yet.' 
      });
    }

    // Shuffle and pick 20
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, 20);

    return NextResponse.json({
      courseCode,
      questions: selectedQuestions,
      totalAvailable: data.length
    });

  } catch (error) {
    console.error('Quiz fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
