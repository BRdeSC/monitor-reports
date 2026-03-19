import { queryPrometheus } from '@/lib/prometheus';
import { getMonthInterval } from '@/lib/utils';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('query');

  // Validação 
  if (!q) {
    return NextResponse.json({ error: 'Parâmetro query é obrigatório' }, { status: 400 });
  }

  const month = parseInt(searchParams.get('month') || '');
  const year = parseInt(searchParams.get('year') || '2026');

  try {
    if (month) {
      const { end } = getMonthInterval(year, month);
      // Busca o histórico de 30 dias até o fim do mês escolhido
      const data = await queryPrometheus(`${q}[30d]`, end);
      return NextResponse.json(data);
    }

    // Busca o dado atual (tempo real)
    const data = await queryPrometheus(q);
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao consultar Prometheus' }, { status: 500 });
  }
}