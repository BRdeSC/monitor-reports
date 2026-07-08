import axios from 'axios';
import { subDays, formatISO } from 'date-fns';
import { HostReport } from './utils';

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

export async function getConsolidatedMetrics(range: string): Promise<{ data: HostReport[], timestamp: Date, startDate: Date, endDate: Date }> {
  let days = 30;
  let step = '1h';

  if (range === '1d') {
    days = 1;
    step = '15m';
  } else if (range === '7d') {
    days = 7;
    step = '30m';
  } else if (range === '60d') {
    days = 60;
    step = '2h';
  } else if (range === '90d') {
    days = 90;
    step = '3h';
  }

  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = subDays(endDate, days);
  startDate.setHours(0, 0, 0, 0);

  const start = formatISO(startDate);
  const end = formatISO(endDate);

  // Queries do Prometheus
  const cpuQuery = '100 * (1 - avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])))';
  const memQuery = '100 * (1 - (node_memory_MemFree_bytes + node_memory_Cached_bytes + node_memory_Buffers_bytes + node_memory_SReclaimable_bytes) / node_memory_MemTotal_bytes)';
  const rxQuery = 'sum by(instance)(rate(node_network_receive_bytes_total{device!~"lo|docker.*|veth.*|br.*|virbr.*|tun.*"}[5m])) / 1024 / 1024';
  const txQuery = 'sum by(instance)(rate(node_network_transmit_bytes_total{device!~"lo|docker.*|veth.*|br.*|virbr.*|tun.*"}[5m])) / 1024 / 1024';
  const hostnameQuery = 'node_uname_info';

  // Executa em paralelo
  const [cpuRes, memRes, rxRes, txRes, hostnameRes] = await Promise.all([
    queryPrometheusRange(cpuQuery, start, end, step).catch(err => { console.error('Erro na query CPU:', err); return null; }),
    queryPrometheusRange(memQuery, start, end, step).catch(err => { console.error('Erro na query Memória:', err); return null; }),
    queryPrometheusRange(rxQuery, start, end, step).catch(err => { console.error('Erro na query RX:', err); return null; }),
    queryPrometheusRange(txQuery, start, end, step).catch(err => { console.error('Erro na query TX:', err); return null; }),
    queryPrometheus(hostnameQuery).catch(err => { console.error('Erro na query Hostname:', err); return null; }),
  ]);

  // Função para calcular média
  const calculateAverage = (values?: [number, string][]) => {
    if (!values || values.length === 0) return 0;
    const sum = values.reduce((acc, curr) => {
      const val = parseFloat(curr[1]);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    return sum / values.length;
  };

  const cpuAverages: Record<string, number> = {};
  const memAverages: Record<string, number> = {};
  const rxAverages: Record<string, number> = {};
  const txAverages: Record<string, number> = {};
  const hostnameMap: Record<string, string> = {};

  // Processa CPU
  if (cpuRes?.data?.result) {
    for (const item of cpuRes.data.result) {
      const instance = item.metric.instance;
      if (instance) {
        cpuAverages[instance] = calculateAverage(item.values);
      }
    }
  }

  // Processa Memória
  if (memRes?.data?.result) {
    for (const item of memRes.data.result) {
      const instance = item.metric.instance;
      if (instance) {
        memAverages[instance] = calculateAverage(item.values);
      }
    }
  }

  // Processa RX
  if (rxRes?.data?.result) {
    for (const item of rxRes.data.result) {
      const instance = item.metric.instance;
      if (instance) {
        rxAverages[instance] = calculateAverage(item.values);
      }
    }
  }

  // Processa TX
  if (txRes?.data?.result) {
    for (const item of txRes.data.result) {
      const instance = item.metric.instance;
      if (instance) {
        txAverages[instance] = calculateAverage(item.values);
      }
    }
  }

  // Processa Mapeamento de Hostnames (Nodename)
  if (hostnameRes?.data?.result) {
    for (const item of hostnameRes.data.result) {
      const instance = item.metric.instance;
      const nodename = item.metric.nodename;
      if (instance && nodename) {
        hostnameMap[instance] = nodename;
      }
    }
  }

  // Junta todas as instâncias únicas observadas nas métricas
  const allInstances = new Set([
    ...Object.keys(cpuAverages),
    ...Object.keys(memAverages),
    ...Object.keys(rxAverages),
    ...Object.keys(txAverages)
  ]);

  const consolidated = Array.from(allInstances).map((instance) => {
    const nodename = hostnameMap[instance] || instance;
    const cpu = cpuAverages[instance] !== undefined ? cpuAverages[instance] : 0;
    const mem = memAverages[instance] !== undefined ? memAverages[instance] : 0;
    
    const rxVal = rxAverages[instance] !== undefined ? rxAverages[instance] : 0;
    const txVal = txAverages[instance] !== undefined ? txAverages[instance] : 0;
    const network = rxVal + txVal;

    return {
      instance,
      nodename,
      cpu,
      mem,
      network
    };
  });

  // Ordena por Hostname por padrão
  consolidated.sort((a, b) => a.nodename.localeCompare(b.nodename));

  return {
    data: consolidated,
    timestamp: new Date(),
    startDate,
    endDate
  };
}