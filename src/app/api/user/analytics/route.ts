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

    // 1. YOUR PROGRESS
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('read_chunks')
      .eq('user_id', user.id);

    const { data: materialsData } = await supabase
      .from('course_materials')
      .select('parsed_content')
      .eq('is_active', true);

    let totalRead = 0;
    progressData?.forEach(p => {
      if (Array.isArray(p.read_chunks)) totalRead += p.read_chunks.length;
    });

    let totalChunks = 0;
    materialsData?.forEach(m => {
      try {
        const parsed = JSON.parse(m.parsed_content || '[]');
        if (Array.isArray(parsed)) totalChunks += parsed.length;
      } catch (e) {}
    });

    const progressPercentage = totalChunks > 0 ? Math.round((totalRead / totalChunks) * 100) : 0;

    // 2. AVG STUDY TIME & CHART DATA
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('duration_seconds, started_at')
      .eq('user_id', user.id)
      .gte('started_at', sevenDaysAgoStr);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyStats: Record<string, number> = {};
    
    // Initialize last 7 days in order
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
        dailyStats[dayLabel] += s.duration_seconds / 3600; // Convert to hours
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
      progress: `${progressPercentage}%`,
      avgStudyTime: `${avgStudyHours}h`,
      quizzesDone: quizzesDone || 0,
      personalBest: `${Math.round(Number(personalBest))}%`,
      chartData
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
