import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { getDb } from './db';
import { DependencyCheck, HealthCheckPayload } from './types';

export interface SelfCheckResult {
  statusCode: number;
  payload: HealthCheckPayload;
}

export async function performSelfCheck(): Promise<SelfCheckResult> {
  const startTime = Date.now();
  const checks: Record<string, DependencyCheck> = {};

  // 1. Checagem do Diretório de Dados e Armazenamento (Leitura/Escrita)
  const storageStart = performance.now();
  try {
    const testDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const testFile = path.join(testDir, `.health_probe_${Date.now()}`);
    fs.writeFileSync(testFile, 'health-ok');
    const readBack = fs.readFileSync(testFile, 'utf-8');
    fs.unlinkSync(testFile);

    const storageLatency = Math.round((performance.now() - storageStart) * 100) / 100;
    if (readBack === 'health-ok') {
      checks.storage_data_dir = {
        status: 'up',
        latency_ms: storageLatency,
        message: 'Diretório de dados operacional (leitura/escrita OK)',
      };
    } else {
      throw new Error('Falha na verificação de integridade do arquivo de teste');
    }
  } catch (error: any) {
    const storageLatency = Math.round((performance.now() - storageStart) * 100) / 100;
    checks.storage_data_dir = {
      status: 'down',
      latency_ms: storageLatency,
      message: `Falha no acesso ao diretório de dados: ${error.message}`,
    };
  }

  // 2. Checagem do Banco de Dados SQLite (SELECT 1)
  const dbStart = performance.now();
  try {
    const db = getDb();
    const result = db.prepare('SELECT 1 as ping').get() as { ping: number };
    const dbLatency = Math.round((performance.now() - dbStart) * 100) / 100;

    if (result && result.ping === 1) {
      checks.diagnostics_db = {
        status: 'up',
        latency_ms: dbLatency,
        message: 'Banco SQLite operacional (SELECT 1 OK)',
      };
    } else {
      throw new Error('Retorno inválido ao executar ping no banco de dados');
    }
  } catch (error: any) {
    const dbLatency = Math.round((performance.now() - dbStart) * 100) / 100;
    checks.diagnostics_db = {
      status: 'down',
      latency_ms: dbLatency,
      message: `Erro no banco de dados: ${error.message}`,
    };
  }

  // 3. Checagem Ativa da API do Prometheus (Origem das métricas do coletor)
  const promStart = performance.now();
  const prometheusUrl = process.env.PROMETHEUS_URL;

  if (prometheusUrl) {
    try {
      const response = await axios.get(`${prometheusUrl}/api/v1/query`, {
        params: { query: 'up' },
        timeout: 3000,
      });
      const promLatency = Math.round((performance.now() - promStart) * 100) / 100;

      if (response.status >= 200 && response.status < 300) {
        checks.prometheus_api = {
          status: 'up',
          latency_ms: promLatency,
          message: 'Conectado à API Prometheus com sucesso',
        };
      } else {
        checks.prometheus_api = {
          status: 'down',
          latency_ms: promLatency,
          message: `Prometheus retornou código HTTP ${response.status}`,
        };
      }
    } catch (error: any) {
      const promLatency = Math.round((performance.now() - promStart) * 100) / 100;
      checks.prometheus_api = {
        status: 'down',
        latency_ms: promLatency,
        message: `Falha na conexão com Prometheus: ${error.message || 'Servidor inacessível'}`,
      };
    }
  } else {
    checks.prometheus_api = {
      status: 'down',
      latency_ms: 0,
      message: 'PROMETHEUS_URL não definida nas variáveis de ambiente',
    };
  }

  // Determinação do status geral:
  // Se qualquer dependência crítica estiver down -> 'unhealthy'
  const isAnyDown = Object.values(checks).some(c => c.status === 'down');
  const isAnyDegraded = Object.values(checks).some(c => c.status === 'degraded');

  const overallStatus = isAnyDown ? 'unhealthy' : isAnyDegraded ? 'degraded' : 'healthy';
  const httpStatusCode = isAnyDown ? 503 : 200;

  const memUsage = process.memoryUsage();
  const memoryUsedMb = Math.round((memUsage.heapUsed / 1024 / 1024) * 10) / 10;
  const memoryTotalMb = Math.round((memUsage.heapTotal / 1024 / 1024) * 10) / 10;
  const rssMb = Math.round((memUsage.rss / 1024 / 1024) * 10) / 10;

  const payload: HealthCheckPayload = {
    service: 'monitor-reports',
    version: '1.0.0',
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    checks,
    metrics: {
      memory_used_mb: memoryUsedMb,
      memory_total_mb: memoryTotalMb,
      memory_rss_mb: rssMb,
      node_version: process.version,
    },
  };

  return {
    statusCode: httpStatusCode,
    payload,
  };
}
