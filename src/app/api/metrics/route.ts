// src/app/api/metrics/route.ts
import { queryPrometheus } from '@/lib/prometheus';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // 1. Pegamos os parâmetros da URL (ex: ?query=up)
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('query');

  // 2. Validação básica: se não enviou query, damos erro 400
  if (!q) {
    return NextResponse.json({ error: 'Parâmetro query é obrigatório' }, { status: 400 });
  }

  try {
    // 3. Passamos a query dinâmica para nossa função da LIB
    const data = await queryPrometheus(q);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao consultar Prometheus' }, { status: 500 });
  }
}