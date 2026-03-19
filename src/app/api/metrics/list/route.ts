import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const PROMETHEUS_URL = process.env.PROMETHEUS_URL;
  try {
    // Endpoint do Prometheus que lista todos os nomes de métricas
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/label/__name__/values`);
    return NextResponse.json(response.data);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao listar métricas' }, { status: 500 });
  }
}