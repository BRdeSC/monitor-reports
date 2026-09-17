import axios from 'axios';
import { MonitoredService, ServiceHealthLog, HealthCheckPayload } from './types';
import {
  insertHealthLog,
  getActiveOutage,
  createOutage,
  resolveOutage,
} from './db';

export interface CheckResult {
  is_up: boolean;
  statusCode: number | null;
  latencyMs: number;
  payloadJson: string | null;
  errorReason: string | null;
  log: ServiceHealthLog;
}

export async function checkService(service: MonitoredService): Promise<CheckResult> {
  const start = performance.now();
  const checkedAt = new Date().toISOString();

  let isUp = false;
  let statusCode: number | null = null;
  let latencyMs = 0;
  let payloadJson: string | null = null;
  let errorReason: string | null = null;

  try {
    const response = await axios.get(service.url, {
      timeout: 10000,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'MonitorReports-HealthChecker/1.0',
      },
      // Do not throw for 4xx or 5xx so we can inspect status and payload body
      validateStatus: () => true,
    });

    latencyMs = Math.round((performance.now() - start) * 10) / 10;
    statusCode = response.status;

    if (service.check_type === 'intelligent') {
      let data = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          data = null;
        }
      }

      if (data && typeof data === 'object') {
        payloadJson = JSON.stringify(data);

        if (statusCode >= 200 && statusCode < 300) {
          const payload = data as HealthCheckPayload;
          const statusStr = String(payload.status || '').toLowerCase();

          // Check if checks object has any failed dependency
          let failedChecksCount = 0;
          let failedNames: string[] = [];

          if (payload.checks && typeof payload.checks === 'object') {
            for (const [key, val] of Object.entries(payload.checks)) {
              if (val && typeof val === 'object' && val.status === 'down') {
                failedChecksCount++;
                failedNames.push(`${key} (${val.message || 'down'})`);
              }
            }
          }

          if (statusStr === 'unhealthy' || statusStr === 'down' || failedChecksCount > 0) {
            isUp = false;
            errorReason = failedChecksCount > 0
              ? `Dependências com falha detectada: ${failedNames.join(', ')}`
              : `Serviço reportou status '${payload.status}'`;
          } else {
            isUp = true;
            errorReason = null;
          }
        } else {
          isUp = false;
          errorReason = `HTTP ${statusCode}: ${data.message || data.status || 'Serviço indisponível'}`;
        }
      } else {
        isUp = false;
        errorReason = `Resposta inválida: esperava JSON, mas recebeu payload textual (HTTP ${statusCode})`;
        payloadJson = JSON.stringify({
          error: errorReason,
          raw_snippet: typeof response.data === 'string' ? response.data.slice(0, 300) : null,
        });
      }
    } else {
      // Basic HTTP 200 check
      if (statusCode >= 200 && statusCode < 300) {
        isUp = true;
        errorReason = null;
      } else {
        isUp = false;
        errorReason = `HTTP ${statusCode}: Código de resposta fora da faixa de sucesso (200-299)`;
      }

      payloadJson = typeof response.data === 'object'
        ? JSON.stringify(response.data)
        : JSON.stringify({
            status_code: statusCode,
            body_snippet: typeof response.data === 'string' ? response.data.slice(0, 300) : null,
          });
    }
  } catch (error: any) {
    latencyMs = Math.round(performance.now() - start);
    isUp = false;
    statusCode = null;

    if (error.code === 'ECONNREFUSED') {
      errorReason = `Conexão recusada (ECONNREFUSED): O serviço na porta informada não está respondendo.`;
    } else if (error.code === 'ENOTFOUND') {
      errorReason = `Host não encontrado (ENOTFOUND): O domínio ou hostname informado não pôde ser resolvido.`;
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      errorReason = `Tempo limite esgotado (Timeout): O serviço demorou mais de 10 segundos para responder.`;
    } else {
      errorReason = `Falha de rede: ${error.message || 'Erro desconhecido ao conectar ao serviço'}`;
    }

    payloadJson = JSON.stringify({
      error: errorReason,
      code: error.code || null,
      message: error.message,
    });
  }

  // Record health log
  const log = insertHealthLog({
    service_id: service.id,
    status_code: statusCode,
    response_time_ms: latencyMs,
    is_up: isUp ? 1 : 0,
    payload_json: payloadJson,
    checked_at: checkedAt,
  });

  // Manage outage cycle
  try {
    const activeOutage = getActiveOutage(service.id);

    if (!isUp) {
      if (!activeOutage) {
        createOutage({
          service_id: service.id,
          started_at: checkedAt,
          error_reason: errorReason || 'Serviço indisponível',
          payload_json: payloadJson,
        });
      }
    } else {
      if (activeOutage) {
        const started = new Date(activeOutage.started_at).getTime();
        const resolved = new Date(checkedAt).getTime();
        const durationSeconds = Math.max(1, Math.round((resolved - started) / 1000));
        resolveOutage(activeOutage.id, checkedAt, durationSeconds);
      }
    }
  } catch (outageErr) {
    console.error(`Erro ao atualizar ciclo de outage do serviço ${service.name}:`, outageErr);
  }

  return {
    is_up: isUp,
    statusCode,
    latencyMs,
    payloadJson,
    errorReason,
    log,
  };
}
