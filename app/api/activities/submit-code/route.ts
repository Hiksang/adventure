import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';
import { validateCode, validateQuizAnswers } from '@/lib/utils/validation';

const MOCK_CODES: Record<string, string> = {
  '1': 'WORLD2025',
};

const MOCK_QUIZ_ANSWERS: Record<string, number[]> = {
  '2': [0, 1, 1],
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { activityId, code, answers } = body;

  if (IS_DEV) {
    if (code !== undefined) {
      const expected = MOCK_CODES[activityId];
      if (!expected) return NextResponse.json({ success: false, message: 'Activity not found' });
      const valid = validateCode(code, expected);
      return NextResponse.json({
        success: valid,
        message: valid ? 'Code verified!' : 'Invalid code. Try again.',
        xp_earned: valid ? 100 : 0,
      });
    }
    if (answers !== undefined) {
      const correctAnswers = MOCK_QUIZ_ANSWERS[activityId];
      if (!correctAnswers) return NextResponse.json({ success: false, message: 'Activity not found' });
      const result = validateQuizAnswers(answers, correctAnswers);
      const xp = Math.round((result.correct / result.total) * 150);
      return NextResponse.json({
        success: true,
        correct: result.correct,
        total: result.total,
        xp_earned: xp,
      });
    }
    return NextResponse.json({ success: false, message: 'Invalid request' });
  }

  // PROD: fetch activity from DB and validate
  const { data: activity } = await supabaseAdmin
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .single();

  if (!activity) {
    return NextResponse.json({ success: false, message: 'Activity not found' }, { status: 404 });
  }

  if (code !== undefined && activity.code) {
    const valid = validateCode(code, activity.code);
    return NextResponse.json({
      success: valid,
      message: valid ? 'Code verified!' : 'Invalid code.',
      xp_earned: valid ? activity.xp_reward : 0,
    });
  }

  if (answers !== undefined && activity.questions) {
    const correctAnswers = activity.questions.map((q: any) => q.correct_index);
    const result = validateQuizAnswers(answers, correctAnswers);
    const xp = Math.round((result.correct / result.total) * activity.xp_reward);
    return NextResponse.json({
      success: true,
      correct: result.correct,
      total: result.total,
      xp_earned: xp,
    });
  }

  return NextResponse.json({ success: false, message: 'Invalid request' });
}
