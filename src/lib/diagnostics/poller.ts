import { getAllServices } from './db';
import { checkService } from './checker';
import { MonitoredService } from './types';

// Global reference across hot-reloads in Node runtime
declare global {
  // eslint-disable-next-line no-var
  var __diagnosticsPollerTimer: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __diagnosticsInFlightChecks: Set<string> | undefined;
}

const inFlightChecks = global.__diagnosticsInFlightChecks ?? new Set<string>();
global.__diagnosticsInFlightChecks = inFlightChecks;

export async function checkSingleServiceById(service: MonitoredService) {
  if (inFlightChecks.has(service.id)) {
    return;
  }
  inFlightChecks.add(service.id);
  try {
    await checkService(service);
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

    // Check if the service is due for a probe
    if (now - lastChecked >= intervalMs) {
      // Fire asynchronously without awaiting so other services run concurrently
      checkSingleServiceById(s);
    }
  }
}

export function ensurePollerRunning() {
  if (!global.__diagnosticsPollerTimer) {
    // Tick every 5 seconds to inspect due services
    global.__diagnosticsPollerTimer = setInterval(() => {
      runPollerTick().catch(err => {
        console.error('Erro no ciclo de polling de diagnóstico:', err);
      });
    }, 5000);

    // Run initial tick immediately
    setTimeout(() => {
      runPollerTick().catch(() => {});
    }, 500);
  }
}
