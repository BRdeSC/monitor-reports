import { NextResponse } from 'next/server';
import { access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import axios from 'axios';
import packageInfo from '../../../../package.json';
import { getDb } from '@/lib/diagnostics/db';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  const start = performance.now();
  const memory = process.memoryUsage();
  const uptimeSeconds = Math.round(process.uptime());
  const timestamp = new Date().toISOString();

  const checks: Record<string, { status: 'up' | 'down'; latency_ms: number; message: string }> = {
    api: {
      status: 'up',
      latency_ms: Math.round((performance.now() - start) * 10) / 10,
      message: 'API operacional',
    },
  };

  // CHECAGENS DE DEPENDÊNCIAS / CONTAINERS
  // 1. Banco de Dados SQLite (diagnostics.db)
  const dbStart = performance.now();
  try {
    const db = getDb();
    const result = db.prepare('SELECT 1 as ping').get() as { ping: number } | undefined;
    if (!result || result.ping !== 1) {
      throw new Error('Retorno inválido ao executar ping no banco de dados');
    }
    checks.database = {
      status: 'up',
      latency_ms: Math.round((performance.now() - dbStart) * 10) / 10,
      message: 'Banco de dados operacional',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao acessar banco de dados';
    checks.database = {
      status: 'down',
      latency_ms: Math.round((performance.now() - dbStart) * 10) / 10,
      message: `Falha na verificação: ${msg.slice(0, 150)}`,
    };
  }

  // 2. Servidor Upstream Prometheus (Métricas e Telemetria)
  const promStart = performance.now();
  const prometheusUrl = process.env.PROMETHEUS_URL;
  if (!prometheusUrl) {
    checks.prometheus = {
      status: 'down',
      latency_ms: 0,
      message: 'Variável PROMETHEUS_URL não definida no ambiente',
    };
  } else {
    try {
      const response = await axios.get(`${prometheusUrl}/api/v1/query`, {
        params: { query: 'up' },
        timeout: 3000,
      });
      if (response.status >= 200 && response.status < 300) {
        checks.prometheus = {
          status: 'up',
          latency_ms: Math.round((performance.now() - promStart) * 10) / 10,
          message: 'Servidor Prometheus operacional',
        };
      } else {
        checks.prometheus = {
          status: 'down',
          latency_ms: Math.round((performance.now() - promStart) * 10) / 10,
          message: `Prometheus retornou status HTTP ${response.status}`,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na conexão com Prometheus';
      checks.prometheus = {
        status: 'down',
        latency_ms: Math.round((performance.now() - promStart) * 10) / 10,
        message: `Falha na verificação: ${msg.slice(0, 150)}`,
      };
    }
  }

  // 3. Armazenamento Local / Diretório de Dados (data/)
  const storageStart = performance.now();
  try {
    const dataDir = path.join(process.cwd(), 'data');
    await access(dataDir, constants.R_OK | constants.W_OK);
    checks.storage = {
      status: 'up',
      latency_ms: Math.round((performance.now() - storageStart) * 10) / 10,
      message: 'Armazenamento de dados local operacional (permissões R/W OK)',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Diretório de dados inacessível ou sem permissão';
    checks.storage = {
      status: 'down',
      latency_ms: Math.round((performance.now() - storageStart) * 10) / 10,
      message: `Falha na verificação: ${msg.slice(0, 150)}`,
    };
  }

  const isHealthy = Object.values(checks).every((c) => c.status === 'up');
  const httpStatus = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: packageInfo.name || 'monitor-reports',
      version: packageInfo.version || '1.0.0',
      timestamp,
      uptime_seconds: uptimeSeconds,
      checks,
      metrics: {
        uptime_seconds: uptimeSeconds,
        memory_rss_mb: Math.round(memory.rss / 1024 / 1024),
        memory_heap_used_mb: Math.round(memory.heapUsed / 1024 / 1024),
      },
    },
    {
      status: httpStatus,
      headers: NO_CACHE_HEADERS,
    }
  );
}
