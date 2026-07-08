// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConsolidatedMetrics } from '@/lib/prometheus';
import { formatDateDDMMYYYY } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30d';

  try {
    const { data, timestamp, startDate, endDate } = await getConsolidatedMetrics(range);

    return NextResponse.json({
      success: true,
      range,
      data,
      timestamp: timestamp.toISOString(),
      startDate: formatDateDDMMYYYY(startDate),
      endDate: formatDateDDMMYYYY(endDate)
    });

  } catch (error: any) {
    console.error('Erro geral no processador de relatórios:', error);
    return NextResponse.json({
      success: false,
      error: 'Falha ao gerar o relatório histórico',
      details: error.message
    }, { status: 500 });
  }
}
