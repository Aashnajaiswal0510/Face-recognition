import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const preset = (searchParams.get('preset') ?? 'all') as
      | 'today'
      | '7d'
      | '30d'
      | 'all'
      | 'custom';
    const startDate = searchParams.get('startDate') ?? undefined;
    const endDate = searchParams.get('endDate') ?? undefined;
    const source = searchParams.get('source') ?? undefined;

    const summary = getAnalytics({ preset, startDate, endDate, source });
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute analytics' },
      { status: 500 }
    );
  }
}
