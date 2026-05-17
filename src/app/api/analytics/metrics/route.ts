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

    // 1. Fetch real quiz attempts
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select(`
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
      console.error('Error fetching quiz attempts:', error);
    }

    // Determine if we need to inject mock data because there are no attempts
    const hasAttempts = attempts && attempts.length > 0;

    let trendData: any[] = [];
    let courseAverages: any[] = [];
    let speedAnalysis: any = {
      avgSecondsPerQuestion: 0,
      totalQuestions: 0,
      totalMinutes: 0,
      isPacingGood: false,
    };

    if (hasAttempts) {
      // Build Trend Data
      trendData = attempts.map((a: any) => ({
        date: new Date(a.completed_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        }),
        score: Math.round(Number(a.percentage)),
        fullDate: new Date(a.completed_at).toLocaleDateString('en-GB'),
      }));

      // Build Course Averages (grouped by course code)
      const courseMap: Record<string, { totalScore: number; count: number; title: string }> = {};
      let totalQuestions = 0;
      let totalSeconds = 0;

      attempts.forEach((a: any) => {
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

        totalQuestions += a.total_questions || 0;
        totalSeconds += a.time_taken_seconds || 0;
      });

      courseAverages = Object.entries(courseMap).map(([code, data]) => ({
        courseCode: code,
        courseTitle: data.title,
        average: Math.round(data.totalScore / data.count),
      }));

      // Speed Tracking
      const totalMinutes = Math.round(totalSeconds / 60);
      const avgSecondsPerQuestion = totalQuestions > 0 ? Math.round(totalSeconds / totalQuestions) : 0;

      speedAnalysis = {
        avgSecondsPerQuestion,
        totalQuestions,
        totalMinutes,
        isPacingGood: avgSecondsPerQuestion < 60,
      };
    } else {
      // FALLBACK MOCK DATASET
      // Generated dynamically with historical date strings for maximum premium feel
      const today = new Date();
      trendData = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (5 - i));
        return {
          date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          score: [65, 72, 68, 80, 85, 92][i],
          fullDate: d.toLocaleDateString('en-GB'),
        };
      });

      courseAverages = [
        { courseCode: 'CHM101', courseTitle: 'General Chemistry', average: 78 },
        { courseCode: 'CSC101', courseTitle: 'Introduction to Computer Science', average: 85 },
        { courseCode: 'GST103', courseTitle: 'Nigerian Peoples & Culture', average: 55 },
        { courseCode: 'MTH101', courseTitle: 'Elementary Mathematics I', average: 82 },
        { courseCode: 'PHY101', courseTitle: 'General Physics I', average: 70 },
      ];

      speedAnalysis = {
        avgSecondsPerQuestion: 42,
        totalQuestions: 120,
        totalMinutes: 84,
        isPacingGood: true,
      };
    }

    return NextResponse.json({
      hasRealData: hasAttempts,
      trendData,
      courseAverages,
      speedAnalysis,
    });
  } catch (error) {
    console.error('Analytics Metrics route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
