import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    // 1. FOCUS DISTRIBUTION (Per Course Progress)
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, code, title');

    const { data: userProgressData } = await supabase
      .from('user_progress')
      .select('material_id, read_chunks')
      .eq('user_id', user.id);

    const { data: allMaterials } = await supabase
      .from('course_materials')
      .select('id, course_id, parsed_content')
      .eq('is_active', true);

    const focusDistribution = coursesData?.map(course => {
      const courseMaterials = allMaterials?.filter(m => m.course_id === course.id) || [];
      let courseTotalChunks = 0;
      let courseReadChunks = 0;

      courseMaterials.forEach(m => {
        // Total chunks in this material
        try {
          const parsed = JSON.parse(m.parsed_content || '[]');
          if (Array.isArray(parsed)) courseTotalChunks += parsed.length;
        } catch (e) {}

        // Read chunks for this material
        const progress = userProgressData?.find(p => p.material_id === m.id);
        if (progress && Array.isArray(progress.read_chunks)) {
          courseReadChunks += progress.read_chunks.length;
        }
      });

      const percentage = courseTotalChunks > 0 ? (courseReadChunks / courseTotalChunks) * 100 : 0;
      return {
        code: course.code,
        title: course.title,
        percentage: Math.round(percentage)
      };
    }).filter(f => f.percentage > 0 || coursesData?.length < 5) // Show some even if 0 if few courses
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5) || [];

    // Global Progress (derived from focus distribution for consistency)
    const avgProgress = focusDistribution.length > 0 
      ? Math.round(focusDistribution.reduce((acc, curr) => acc + curr.percentage, 0) / focusDistribution.length)
      : 0;

    // 2. AVG STUDY TIME & CHART DATA
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('duration_seconds, started_at')
      .eq('user_id', user.id)
      .gte('started_at', sevenDaysAgoStr);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyStats: Record<string, number> = {};
    
    const chartLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = days[d.getDay()];
      chartLabels.push(label);
      dailyStats[label] = 0;
    }

    let totalDurationSeconds = 0;
    sessions?.forEach(s => {
      totalDurationSeconds += s.duration_seconds;
      const dayLabel = days[new Date(s.started_at).getDay()];
      if (dailyStats[dayLabel] !== undefined) {
        dailyStats[dayLabel] += s.duration_seconds / 3600;
      }
    });

    const avgStudyHours = (totalDurationSeconds / 3600 / 7).toFixed(1);
    const chartData = chartLabels.map(label => ({
      day: label,
      hours: parseFloat((dailyStats[label] || 0).toFixed(1))
    }));

    // 3. QUIZZES DONE
    const { count: quizzesDone } = await supabase
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    // 4. PERSONAL BEST
    const { data: bestAttempt } = await supabase
      .from('quiz_attempts')
      .select('percentage')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('percentage', { ascending: false })
      .limit(1);

    const personalBest = bestAttempt?.[0]?.percentage || 0;

    return NextResponse.json({
      progress: `${avgProgress}%`,
      avgStudyTime: `${avgStudyHours}h`,
      quizzesDone: quizzesDone || 0,
      personalBest: `${Math.round(Number(personalBest))}%`,
      chartData,
      focusDistribution
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
