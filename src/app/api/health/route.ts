import { NextResponse } from 'next/server';
import { performSelfCheck } from '@/lib/diagnostics/selfCheck';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { statusCode, payload } = await performSelfCheck();
    return NextResponse.json(payload, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      {
        service: 'monitor-reports',
        version: '1.0.0',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        checks: {
          system: {
            status: 'down',
            message: `Erro interno crítico no coletor de saúde: ${error.message}`,
          },
        },
        metrics: {
          memory_used_mb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10,
        },
      },
      { status: 503 }
    );
  }
}
