import { queryPrometheus, queryPrometheusRange } from '@/lib/prometheus'; 
import { getMonthInterval } from '@/lib/utils';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('query');
  const month = parseInt(searchParams.get('month') || '');
  const year = parseInt(searchParams.get('year') || '2026');

  if (!q) {
    return NextResponse.json({ error: 'Parâmetro query é obrigatório' }, { status: 400 });
  }

  try {
    if (month) {
      // Pega o início e fim exato do mês (Fevereiro, Março, etc)
      const { start, end } = getMonthInterval(year, month);
      
      // Busca no histórico exato do mês selecionado
      const data = await queryPrometheusRange(q, start, end, '4h'); 
      return NextResponse.json(data);
    }

    // Se não tiver mês, busca o dado de agora
    const data = await queryPrometheus(q);
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao consultar Prometheus' }, { status: 500 });
  }
}