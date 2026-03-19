import axios from 'axios';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL;

const api = axios.create({
  baseURL: `${PROMETHEUS_URL}/api/v1`,
});

// Função para busca instantânea 
export async function queryPrometheus(promql: string, time?: string) {
  try {
    const response = await api.get('/query', {
      params: { 
        query: promql,
        ...(time && { time }) 
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erro no Prometheus (Instant):", error);
    throw error;
  }
}

// FUNÇÃO para buscas históricas (Relatórios Mensais)
export async function queryPrometheusRange(promql: string, start: string, end: string, step: string = '1h') {
  try {
    const response = await api.get('/query_range', {
      params: {
        query: promql,
        start,
        end,
        step, // Intervalo entre os pontos (ex: '1h' para cada hora)
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erro no Prometheus (Range):", error);
    throw error;
  }
}