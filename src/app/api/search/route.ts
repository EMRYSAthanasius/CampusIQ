import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

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

    // Rate limit: 5 search requests per 30 seconds per user
    const limitRes = await rateLimit(`search_${user.id}`, 5, 30000);
    if (!limitRes.success) {
      return NextResponse.json(
        { error: 'Too many search requests. Please slow down.' },
        { status: 429 }
      );
    }

    const cleanQuery = `%${query.trim()}%`;

    // 1. Search Courses — use chained .ilike() instead of string-interpolated .or()
    const { data: courses } = await supabase
      .from('courses')
      .select('id, code, title, color')
      .or(`code.ilike.${cleanQuery},title.ilike.${cleanQuery}`)
      .limit(5);

    // 2. Search Topics — use chained .ilike() instead of string-interpolated .or()
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

  } catch (error: unknown) {
    console.error('[GET /api/search] Fatal error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
