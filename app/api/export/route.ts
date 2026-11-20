import { NextRequest, NextResponse } from 'next/server';
import { exportDetectionsCsv } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const csv = exportDetectionsCsv({
      search: searchParams.get('search') ?? undefined,
      emotion: searchParams.get('emotion') ?? undefined,
      source: searchParams.get('source') ?? undefined,
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="detections_export.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export CSV' },
      { status: 500 }
    );
  }
}
