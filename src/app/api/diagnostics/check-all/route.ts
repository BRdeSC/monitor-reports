import { NextResponse } from 'next/server';
import { checkAllActiveServices } from '@/lib/diagnostics/poller';
import { getAllServices, getDiagnosticsStats } from '@/lib/diagnostics/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await checkAllActiveServices();
    const services = getAllServices();
    const stats = getDiagnosticsStats();

    return NextResponse.json({
      success: true,
      data: services,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar todos os serviços', details: error.message },
      { status: 500 }
    );
  }
}
