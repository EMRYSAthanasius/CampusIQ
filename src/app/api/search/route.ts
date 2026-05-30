import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ courses: [], topics: [], questions: [] });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cleanQuery = `%${query.trim()}%`;

    // 1. Search Courses
    const { data: courses } = await supabase
      .from('courses')
      .select('id, code, title, color')
      .or(`code.ilike.${cleanQuery},title.ilike.${cleanQuery}`)
      .limit(5);

    // 2. Search Topics
    const { data: topics } = await supabase
      .from('topics')
      .select(`
        id, 
        name, 
        description,
        courses (
          id,
          code,
          title
        )
      `)
      .or(`name.ilike.${cleanQuery},description.ilike.${cleanQuery}`)
      .limit(5);

    // 3. Search Questions
    const { data: questions } = await supabase
      .from('questions')
      .select(`
        id, 
        content, 
        difficulty,
        courses (
          id,
          code
        )
      `)
      .ilike('content', cleanQuery)
      .limit(5);

    return NextResponse.json({
      courses: courses || [],
      topics: topics || [],
      questions: questions || []
    });

  } catch (error: any) {
    console.error('[GET /api/search] Fatal error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
