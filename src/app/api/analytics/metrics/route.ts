import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 0;

interface QuizAttemptWithRelations {
  id: string;
  percentage: number;
  completed_at: string;
  score: number;
  total_questions: number;
  time_taken_seconds: number;
  quizzes: {
    title: string;
    type: string;
    courses: {
      id: string;
      code: string;
      title: string;
    } | null;
  } | null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch real active courses
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, code, title')
      .eq('is_active', true)
      .order('code');

    // 2. Fetch real study sessions
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('duration_seconds')
      .eq('user_id', user.id);

    let totalStudySeconds = 0;
    if (sessions) {
      totalStudySeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    }

    // 3. Fetch completed quiz attempts
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        percentage,
        completed_at,
        score,
        total_questions,
        time_taken_seconds,
        quizzes (
          title,
          type,
          courses (
            id,
            code,
            title
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    if (error) {
      console.error('[analytics/metrics] Error fetching quiz attempts:', error);
    }

    const hasRealData = !!(attempts && attempts.length > 0);

    let trendData: { date: string; score: number }[] = [];
    let courseAverages: { courseCode: string; courseTitle: string; average: number }[] = [];
    let speedAnalysis = {
      avgSecondsPerQuestion: 0,
      totalQuestions: 0,
      totalMinutes: Math.round(totalStudySeconds / 60),
      isPacingGood: true,
    };
    let totalAttempts = 0;
    let overallAccuracy = 0;
    let weakestSubject = '';

    if (hasRealData && attempts) {
      totalAttempts = attempts.length;

      const typedAttempts = attempts as unknown as QuizAttemptWithRelations[];

      // Score trends
      trendData = typedAttempts.map((a) => ({
        date: new Date(a.completed_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        }),
        score: Math.round(Number(a.percentage)),
      }));

      // Course averages (grouped by course code)
      const courseMap: Record<string, { totalScore: number; count: number; title: string }> = {};
      let totalQuestions = 0;
      let totalSeconds = 0;

      typedAttempts.forEach((a) => {
        const course = a.quizzes?.courses;
        if (course) {
          const code = course.code;
          const title = course.title || `Course ${code}`;
          if (!courseMap[code]) {
            courseMap[code] = { totalScore: 0, count: 0, title };
          }
          courseMap[code].totalScore += Number(a.percentage);
          courseMap[code].count += 1;
        }
        totalQuestions += (a.total_questions as number) || 0;
        totalSeconds += (a.time_taken_seconds as number) || 0;
      });

      courseAverages = Object.entries(courseMap)
        .map(([code, d]) => ({
          courseCode: code,
          courseTitle: d.title,
          average: Math.round(d.totalScore / d.count),
        }))
        .sort((a, b) => b.average - a.average);

      // Speed Analysis
      const avgSecondsPerQuestion =
        totalQuestions > 0 ? Math.round(totalSeconds / totalQuestions) : 0;

      speedAnalysis = {
        avgSecondsPerQuestion,
        totalQuestions,
        totalMinutes: Math.round(totalStudySeconds / 60),
        isPacingGood: avgSecondsPerQuestion > 0 ? avgSecondsPerQuestion < 60 : true,
      };

      // General aggregations
      const sumPct = typedAttempts.reduce((sum, a) => sum + Number(a.percentage), 0);
      overallAccuracy = Math.round(sumPct / totalAttempts);

      // Weakest subject
      const lowestEntry = courseAverages.reduce(
        (worst, c) => (c.average < worst.average ? c : worst),
        courseAverages[0]
      );
      weakestSubject = lowestEntry?.courseCode ?? '';
    } else {
      // 0-STATE: Fall back to real registered courses with 0% mastery
      courseAverages = (coursesData || []).map(c => ({
        courseCode: c.code,
        courseTitle: c.title,
        average: 0,
      }));
    }

    return NextResponse.json({
      hasRealData,
      trendData,
      courseAverages,
      speedAnalysis,
      totalAttempts,
      overallAccuracy,
      weakestSubject,
    });

  } catch (err) {
    console.error('[analytics/metrics] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
