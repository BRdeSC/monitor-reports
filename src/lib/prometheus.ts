// src/lib/prometheus.ts
import axios from 'axios';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL;

export async function queryPrometheus(promql: string, time?: string) {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
      params: { 
        query: promql,
        ...(time && { time }) // Se 'time' existir, adiciona à requisição
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar dados do Prometheus:", error);
    throw new Error("Falha na conexão com o Prometheus");
  }
}