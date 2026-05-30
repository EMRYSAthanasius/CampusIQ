import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { QuizService } from '@/lib/quiz-service';
import { verifyAdminRole } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/generate-quiz?courseCode=CSC101
 * Retrieves or builds a Mock Exam for a course.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get('courseCode');

    if (!courseCode) {
      return NextResponse.json({ error: 'Course code is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { isAdmin, userId } = await verifyAdminRole(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Rate Limiting: 5 requests per user per 5 minutes (each call triggers expensive Gemini processing)
    const limitRes = await rateLimit(`quiz_fetch_${userId}`, 5, 5 * 60 * 1000);
    if (!limitRes.success) {
      return NextResponse.json(
        { error: 'Too many quiz generation requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    const result = await QuizService.getOrCreateMockExam(courseCode);

    return NextResponse.json({
      courseCode,
      quizId: result.quizId,
      questions: result.questions,
      totalAvailable: result.questions.length,
      durationSeconds: result.durationSeconds,
      source: 'database-and-ocr-unified'
    });

  } catch (error: any) {
    console.error('[GET /api/generate-quiz] Fatal error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/generate-quiz
 * Generates a practice quiz from a specific course material ID.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { isAdmin, userId } = await verifyAdminRole(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Rate Limiting: 5 requests per user per 5 minutes (each call sends material to Gemini)
    const limitRes = await rateLimit(`generate_quiz_${userId}`, 5, 5 * 60 * 1000);
    if (!limitRes.success) {
      return NextResponse.json(
        { error: 'Too many quiz generation requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { materialId, courseId } = body;

    if (!materialId || !courseId) {
      return NextResponse.json({ error: 'Missing materialId or courseId' }, { status: 400 });
    }

    const quizId = await QuizService.generateQuizFromMaterial(materialId, courseId);

    return NextResponse.json({ success: true, quizId });

  } catch (error: any) {
    console.error('[POST /api/generate-quiz] Fatal error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
