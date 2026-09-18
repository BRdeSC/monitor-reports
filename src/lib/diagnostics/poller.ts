import { getAllServices, getServiceById } from './db';
import { checkService } from './checker';
import { MonitoredService } from './types';

const CURRENT_POLLER_VERSION = 2;

// Global reference across hot-reloads in Node runtime
declare global {
  // eslint-disable-next-line no-var
  var __diagnosticsPollerTimer: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __diagnosticsPollerVersion: number | undefined;
  // eslint-disable-next-line no-var
  var __diagnosticsInFlightChecks: Set<string> | undefined;
  // eslint-disable-next-line no-var
  var __diagnosticsPollerTickHandler: (() => Promise<void>) | undefined;
}

const inFlightChecks = global.__diagnosticsInFlightChecks ?? new Set<string>();
global.__diagnosticsInFlightChecks = inFlightChecks;

export async function checkSingleServiceById(service: MonitoredService) {
  if (inFlightChecks.has(service.id)) {
    return;
  }
  inFlightChecks.add(service.id);
  try {
    // Garante que a checagem periódica utilize o registro completo e mais recente do banco,
    // passando exatamente os mesmos parâmetros (host, port, category, check_type) que a checagem manual
    const serviceDetails = getServiceById(service.id);
    const serviceToProbe = serviceDetails || service;
    await checkService(serviceToProbe);
  } catch (error) {
    console.error(`Erro ao checar serviço ${service.name} (${service.url}):`, error);
  } finally {
    inFlightChecks.delete(service.id);
  }
}

export async function checkAllActiveServices() {
  const services = getAllServices().filter(s => s.is_active === 1);
  const promises = services.map(s => checkSingleServiceById(s));
  await Promise.allSettled(promises);
}

export async function runPollerTick() {
  const now = Date.now();
  const services = getAllServices().filter(s => s.is_active === 1);

  for (const s of services) {
    const lastChecked = s.latest_log ? new Date(s.latest_log.checked_at).getTime() : 0;
    const intervalMs = Math.max(5, s.interval_seconds) * 1000;

    // Verifica se o serviço deve ser sondado neste ciclo
    if (now - lastChecked >= intervalMs) {
      // Dispara assincronamente sem bloquear o loop dos demais serviços
      checkSingleServiceById(s);
    }
  }
}

export function ensurePollerRunning() {
  // Sempre atualiza o handler de execução para a versão mais recente da função
  global.__diagnosticsPollerTickHandler = runPollerTick;

  // Invalidação de timers legados após hot-reloads ou atualizações de código
  if (global.__diagnosticsPollerVersion !== CURRENT_POLLER_VERSION) {
    if (global.__diagnosticsPollerTimer) {
      clearInterval(global.__diagnosticsPollerTimer);
      global.__diagnosticsPollerTimer = undefined;
    }
    global.__diagnosticsPollerVersion = CURRENT_POLLER_VERSION;
  }

  if (!global.__diagnosticsPollerTimer) {
    // Tick a cada 5 segundos para inspecionar alvos devidos
    global.__diagnosticsPollerTimer = setInterval(() => {
      if (global.__diagnosticsPollerTickHandler) {
        global.__diagnosticsPollerTickHandler().catch(err => {
          console.error('Erro no ciclo de polling de diagnóstico:', err);
        });
      }
    }, 5000);

    // Executa tick inicial
    setTimeout(() => {
      if (global.__diagnosticsPollerTickHandler) {
        global.__diagnosticsPollerTickHandler().catch(() => {});
      }
    }, 500);
  }
}

export function restartPoller() {
  if (global.__diagnosticsPollerTimer) {
    clearInterval(global.__diagnosticsPollerTimer);
    global.__diagnosticsPollerTimer = undefined;
  }
  global.__diagnosticsPollerVersion = CURRENT_POLLER_VERSION;
  ensurePollerRunning();
}
