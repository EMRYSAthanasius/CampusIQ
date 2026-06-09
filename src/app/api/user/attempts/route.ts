import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch quiz attempts with quizzes and courses relations
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        score,
        total_questions,
        percentage,
        time_taken_seconds,
        status,
        started_at,
        completed_at,
        quizzes (
          id,
          title,
          type,
          courses (
            id,
            code,
            title,
            color,
            icon
          )
        )
      `)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('[GET /api/user/attempts] Query error:', error.message);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    return NextResponse.json({ attempts });

  } catch (error: unknown) {
    console.error('[GET /api/user/attempts] Fatal error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
