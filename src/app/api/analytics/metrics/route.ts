import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all completed quiz attempts with course relation
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
      totalMinutes: 0,
      isPacingGood: true,
    };
    let totalAttempts = 0;
    let overallAccuracy = 0;
    let weakestSubject = '';

    if (hasRealData && attempts) {
      totalAttempts = attempts.length;

      // ── Trend Data ──────────────────────────────────────────
      trendData = attempts.map((a: any) => ({
        date: new Date(a.completed_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        }),
        score: Math.round(Number(a.percentage)),
      }));

      // ── Course Averages (grouped by course code) ────────────
      const courseMap: Record<string, { totalScore: number; count: number; title: string }> = {};
      let totalQuestions = 0;
      let totalSeconds = 0;

      attempts.forEach((a: any) => {
        const course = a.quizzes?.courses;
        if (course) {
          const code = course.code as string;
          const title = (course.title as string) || `Course ${code}`;
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

      // ── Speed Analysis ───────────────────────────────────────
      const totalMinutes = Math.round(totalSeconds / 60);
      const avgSecondsPerQuestion =
        totalQuestions > 0 ? Math.round(totalSeconds / totalQuestions) : 0;

      speedAnalysis = {
        avgSecondsPerQuestion,
        totalQuestions,
        totalMinutes,
        isPacingGood: avgSecondsPerQuestion > 0 ? avgSecondsPerQuestion < 60 : true,
      };

      // ── Derived Aggregates ───────────────────────────────────
      const sumPct = attempts.reduce((sum, a: any) => sum + Number(a.percentage), 0);
      overallAccuracy = Math.round(sumPct / totalAttempts);

      // Weakest subject = lowest average
      const lowestEntry = courseAverages.reduce(
        (worst, c) => (c.average < worst.average ? c : worst),
        courseAverages[0]
      );
      weakestSubject = lowestEntry?.courseCode ?? '';

    } else {
      // ── Fallback Demo Dataset ─────────────────────────────────
      const today = new Date();
      trendData = [65, 72, 68, 80, 85, 92].map((score, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (5 - i));
        return {
          date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          score,
        };
      });

      courseAverages = [
        { courseCode: 'CSC101', courseTitle: 'Introduction to Computer Science', average: 85 },
        { courseCode: 'MTH101', courseTitle: 'Elementary Mathematics I', average: 82 },
        { courseCode: 'CHM101', courseTitle: 'General Chemistry', average: 78 },
        { courseCode: 'PHY101', courseTitle: 'General Physics I', average: 70 },
        { courseCode: 'GST103', courseTitle: 'Nigerian Peoples & Culture', average: 55 },
      ];

      speedAnalysis = {
        avgSecondsPerQuestion: 42,
        totalQuestions: 120,
        totalMinutes: 84,
        isPacingGood: true,
      };

      totalAttempts = 0;
      overallAccuracy = Math.round(
        courseAverages.reduce((sum, c) => sum + c.average, 0) / courseAverages.length
      );
      weakestSubject = 'GST103';
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
