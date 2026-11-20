import { NextResponse } from 'next/server';
import { getDatabaseHealth, getTrainingMetrics } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbHealth = getDatabaseHealth();
  const trainingMetrics = getTrainingMetrics();
  return NextResponse.json({
    db: dbHealth,
    trainingMetrics,
  });
}
