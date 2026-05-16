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
    // We use a large limit and then shuffle to simulate randomness since Supabase 
    // doesn't have a native 'order by random' without raw SQL
    const { data, error } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('course_code', courseCode)
      .limit(50);

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

    // Shuffle and pick 20 (or total available if less than 20)
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, 20);

    return NextResponse.json({
      courseCode,
      questions: selectedQuestions,
      totalAvailable: data.length
    });

  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Support for POST body if preferred
  try {
    const { courseCode } = await req.json();
    if (!courseCode) {
      return NextResponse.json({ error: 'Course code is required' }, { status: 400 });
    }
    
    // Redirect logic to GET for consistency
    const url = new URL(req.url);
    url.searchParams.set('courseCode', courseCode);
    return GET(new NextRequest(url, { headers: req.headers }));
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
