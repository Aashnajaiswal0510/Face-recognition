import { NextRequest, NextResponse } from 'next/server';
import {
  clearAllDetections,
  getDashboardStats,
  insertDetections,
  queryDetections,
  type InsertDetectionInput,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');

    if (mode === 'stats') {
      const stats = getDashboardStats();
      return NextResponse.json(stats);
    }

    const result = queryDetections({
      search: searchParams.get('search') ?? undefined,
      emotion: searchParams.get('emotion') ?? undefined,
      source: searchParams.get('source') ?? undefined,
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
      sortBy: (searchParams.get('sortBy') as 'id' | 'timestamp' | 'confidence' | 'emotion' | 'source') ?? 'id',
      sortDir: (searchParams.get('sortDir') as 'asc' | 'desc') ?? 'desc',
      page: Number(searchParams.get('page') ?? 1),
      pageSize: Number(searchParams.get('pageSize') ?? 15),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to query detections' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: InsertDetectionInput[] = Array.isArray(body?.detections)
      ? body.detections
      : [body];

    if (!items.length) {
      return NextResponse.json({ error: 'No detection records provided' }, { status: 400 });
    }

    const inserted = insertDetections(items);
    return NextResponse.json({ inserted, count: inserted.length }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to insert detections' },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    const deletedCount = clearAllDetections();
    return NextResponse.json({ deletedCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear history' },
      { status: 500 }
    );
  }
}
