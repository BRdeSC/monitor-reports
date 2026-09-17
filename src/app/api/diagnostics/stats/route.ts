import { NextResponse } from 'next/server';
import { getDiagnosticsStats } from '@/lib/diagnostics/db';
import { ensurePollerRunning } from '@/lib/diagnostics/poller';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    ensurePollerRunning();
    const stats = getDiagnosticsStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erro ao calcular estatísticas da plataforma', details: error.message },
      { status: 500 }
    );
  }
}
