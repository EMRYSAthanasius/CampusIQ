import { NextResponse } from 'next/server';
import { QuizService } from '@/lib/quiz-service';

export const maxDuration = 300;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get('course');
    if (!courseCode) throw new Error("No course code provided");

    console.log(`Temp Ingest: Starting ingest for ${courseCode}`);
    const res = await QuizService.getOrCreateMockExam(courseCode);
    
    return NextResponse.json({ success: true, count: res.questions.length, duration: res.durationSeconds });
  } catch (error: any) {
    console.error(`Temp Ingest Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
