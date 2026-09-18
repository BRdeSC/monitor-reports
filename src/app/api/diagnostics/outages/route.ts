import { NextRequest, NextResponse } from 'next/server';
import { getOutages } from '@/lib/diagnostics/db';
import { OutagesFilterOptions } from '@/lib/diagnostics/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service_id = searchParams.get('service_id') || undefined;
    const period = (searchParams.get('period') as OutagesFilterOptions['period']) || '24h';
    const status = (searchParams.get('status') as OutagesFilterOptions['status']) || 'all';
    const category = (searchParams.get('category') as OutagesFilterOptions['category']) || 'all';

    const validPeriod: OutagesFilterOptions['period'] = ['24h', '7d', '30d', 'all'].includes(period)
      ? period
      : '24h';

    const validStatus: OutagesFilterOptions['status'] = ['all', 'active', 'resolved'].includes(status)
      ? status
      : 'all';

    const validCategory: OutagesFilterOptions['category'] = ['all', 'application', 'service'].includes(category)
      ? category
      : 'all';

    const data = getOutages({
      service_id,
      period: validPeriod,
      status: validStatus,
      category: validCategory,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Erro ao buscar histórico de incidentes:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao buscar relatório de incidentes', details: error.message },
      { status: 500 }
    );
  }
}
