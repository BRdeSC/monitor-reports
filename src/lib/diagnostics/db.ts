import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  MonitoredService,
  ServiceHealthLog,
  ServiceOutage,
  ServiceWithDetails,
  DiagnosticsStats,
  HealthCheckPayload,
  CheckType,
  ServiceCategory,
  OutagesFilterOptions,
  OutagesReportSummary,
} from './types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'diagnostics.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');

    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: Database.Database) {
  // Migração transparente do schema para permitir novos tipos (como TCP) e colunas (category, host, port)
  const tableCheck = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='monitored_services'").get() as { sql: string } | undefined;
  
  if (tableCheck) {
    const columns = db.prepare("PRAGMA table_info(monitored_services)").all() as { name: string }[];
    const colNames = columns.map(c => c.name);
    const hasOldCheck = tableCheck.sql.includes("check_type IN ('intelligent', 'basic')");
    const hasCategory = colNames.includes('category');

    if (hasOldCheck || !hasCategory) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE monitored_services_mig (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          check_type TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'application',
          host TEXT,
          port INTEGER,
          interval_seconds INTEGER NOT NULL DEFAULT 30,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO monitored_services_mig (id, name, url, check_type, category, host, port, interval_seconds, is_active, created_at, updated_at)
        SELECT 
          id, 
          name, 
          url, 
          check_type, 
          'application', 
          NULL, 
          NULL, 
          interval_seconds, 
          is_active, 
          created_at, 
          updated_at 
        FROM monitored_services;
        DROP TABLE monitored_services;
        ALTER TABLE monitored_services_mig RENAME TO monitored_services;
        PRAGMA foreign_keys = ON;
      `);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS monitored_services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      check_type TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'application',
      host TEXT,
      port INTEGER,
      interval_seconds INTEGER NOT NULL DEFAULT 30,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_health_logs (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL REFERENCES monitored_services(id) ON DELETE CASCADE,
      status_code INTEGER,
      response_time_ms REAL,
      is_up INTEGER NOT NULL,
      payload_json TEXT,
      checked_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_health_logs_service_checked 
      ON service_health_logs (service_id, checked_at DESC);

    CREATE TABLE IF NOT EXISTS service_outages (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL REFERENCES monitored_services(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      resolved_at TEXT,
      duration_seconds REAL,
      error_reason TEXT,
      payload_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_outages_service 
      ON service_outages (service_id, started_at DESC);

    CREATE INDEX IF NOT EXISTS idx_outages_active 
      ON service_outages (service_id, resolved_at);
  `);

  try {
    db.exec('ALTER TABLE service_outages ADD COLUMN payload_json TEXT;');
  } catch {
    // Column already exists, ignore
  }

  // Seed default self-service if none exists
  const countRow = db.prepare('SELECT COUNT(*) as count FROM monitored_services').get() as { count: number };
  if (countRow.count === 0) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO monitored_services (id, name, url, check_type, category, interval_seconds, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      'Monitor Reports (Local)',
      'http://localhost:3000/metrics/api/health',
      'intelligent',
      'application',
      30,
      1,
      now,
      now
    );
  }
}

// -------------------------------------------------------------
// Queries & Operations
// -------------------------------------------------------------

export function getAllServices(): ServiceWithDetails[] {
  const db = getDb();
  const services = db.prepare('SELECT * FROM monitored_services ORDER BY name ASC').all() as MonitoredService[];

  return services.map(service => {
    const latestLog = db.prepare(`
      SELECT * FROM service_health_logs 
      WHERE service_id = ? 
      ORDER BY checked_at DESC 
      LIMIT 1
    `).get(service.id) as ServiceHealthLog | undefined;

    const activeOutage = db.prepare(`
      SELECT * FROM service_outages 
      WHERE service_id = ? AND resolved_at IS NULL 
      ORDER BY started_at DESC 
      LIMIT 1
    `).get(service.id) as ServiceOutage | undefined;

    let parsedPayload: HealthCheckPayload | null = null;
    if (latestLog?.payload_json) {
      try {
        parsedPayload = JSON.parse(latestLog.payload_json);
      } catch {
        parsedPayload = null;
      }
    }

    return {
      ...service,
      latest_log: latestLog || null,
      active_outage: activeOutage || null,
      parsed_payload: parsedPayload,
    };
  });
}

export function getServiceById(id: string): (ServiceWithDetails & { recent_logs: ServiceHealthLog[]; outages: ServiceOutage[] }) | null {
  const db = getDb();
  const service = db.prepare('SELECT * FROM monitored_services WHERE id = ?').get(id) as MonitoredService | undefined;
  if (!service) return null;

  const latestLog = db.prepare(`
    SELECT * FROM service_health_logs 
    WHERE service_id = ? 
    ORDER BY checked_at DESC 
    LIMIT 1
  `).get(id) as ServiceHealthLog | undefined;

  const activeOutage = db.prepare(`
    SELECT * FROM service_outages 
    WHERE service_id = ? AND resolved_at IS NULL 
    ORDER BY started_at DESC 
    LIMIT 1
  `).get(id) as ServiceOutage | undefined;

  const recentLogs = db.prepare(`
    SELECT * FROM service_health_logs 
    WHERE service_id = ? 
    ORDER BY checked_at DESC 
    LIMIT 10
  `).all(id) as ServiceHealthLog[];

  const outages = db.prepare(`
    SELECT * FROM service_outages 
    WHERE service_id = ? 
    ORDER BY started_at DESC 
    LIMIT 10
  `).all(id) as ServiceOutage[];

  let parsedPayload: HealthCheckPayload | null = null;
  if (latestLog?.payload_json) {
    try {
      parsedPayload = JSON.parse(latestLog.payload_json);
    } catch {
      parsedPayload = null;
    }
  }

  return {
    ...service,
    latest_log: latestLog || null,
    active_outage: activeOutage || null,
    parsed_payload: parsedPayload,
    recent_logs: recentLogs,
    outages: outages,
  };
}

export function createService(data: {
  name: string;
  url: string;
  check_type: CheckType;
  category?: ServiceCategory;
  host?: string | null;
  port?: number | null;
  interval_seconds?: number;
  is_active?: number;
}): MonitoredService {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const interval = data.interval_seconds && data.interval_seconds >= 5 ? data.interval_seconds : 30;
  const active = data.is_active !== undefined ? data.is_active : 1;
  const category: ServiceCategory = data.category || (data.check_type === 'tcp' ? 'service' : 'application');
  const host = data.host || null;
  const port = data.port != null ? Number(data.port) : null;

  db.prepare(`
    INSERT INTO monitored_services (id, name, url, check_type, category, host, port, interval_seconds, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name.trim(), data.url.trim(), data.check_type, category, host, port, interval, active, now, now);

  return db.prepare('SELECT * FROM monitored_services WHERE id = ?').get(id) as MonitoredService;
}

export function updateService(
  id: string,
  data: {
    name?: string;
    url?: string;
    check_type?: CheckType;
    category?: ServiceCategory;
    host?: string | null;
    port?: number | null;
    interval_seconds?: number;
    is_active?: number;
  }
): MonitoredService | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM monitored_services WHERE id = ?').get(id) as MonitoredService | undefined;
  if (!existing) return null;

  const now = new Date().toISOString();
  const name = data.name !== undefined ? data.name.trim() : existing.name;
  const url = data.url !== undefined ? data.url.trim() : existing.url;
  const check_type = data.check_type !== undefined ? data.check_type : existing.check_type;
  const category = data.category !== undefined ? data.category : (existing.category || 'application');
  const host = data.host !== undefined ? data.host : existing.host;
  const port = data.port !== undefined ? (data.port != null ? Number(data.port) : null) : existing.port;
  const interval = data.interval_seconds && data.interval_seconds >= 5 ? data.interval_seconds : existing.interval_seconds;
  const is_active = data.is_active !== undefined ? data.is_active : existing.is_active;

  db.prepare(`
    UPDATE monitored_services 
    SET name = ?, url = ?, check_type = ?, category = ?, host = ?, port = ?, interval_seconds = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(name, url, check_type, category, host, port, interval, is_active, now, id);

  return db.prepare('SELECT * FROM monitored_services WHERE id = ?').get(id) as MonitoredService;
}

export function deleteService(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM monitored_services WHERE id = ?').run(id);
  return result.changes > 0;
}

export function toggleServiceStatus(id: string): MonitoredService | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM monitored_services WHERE id = ?').get(id) as MonitoredService | undefined;
  if (!existing) return null;

  const nextStatus = existing.is_active === 1 ? 0 : 1;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE monitored_services 
    SET is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(nextStatus, now, id);

  return db.prepare('SELECT * FROM monitored_services WHERE id = ?').get(id) as MonitoredService;
}

export function insertHealthLog(log: {
  service_id: string;
  status_code: number | null;
  response_time_ms: number | null;
  is_up: number;
  payload_json: string | null;
  checked_at: string;
}): ServiceHealthLog {
  const db = getDb();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO service_health_logs (id, service_id, status_code, response_time_ms, is_up, payload_json, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    log.service_id,
    log.status_code,
    log.response_time_ms,
    log.is_up,
    log.payload_json,
    log.checked_at
  );

  // Prune old logs: keep at most 500 logs per service
  db.prepare(`
    DELETE FROM service_health_logs 
    WHERE service_id = ? AND id NOT IN (
      SELECT id FROM service_health_logs 
      WHERE service_id = ? 
      ORDER BY checked_at DESC 
      LIMIT 500
    )
  `).run(log.service_id, log.service_id);

  return {
    id,
    ...log,
  };
}

export function getActiveOutage(service_id: string): ServiceOutage | null {
  const db = getDb();
  const outage = db.prepare(`
    SELECT * FROM service_outages 
    WHERE service_id = ? AND resolved_at IS NULL 
    ORDER BY started_at DESC 
    LIMIT 1
  `).get(service_id) as ServiceOutage | undefined;

  return outage || null;
}

export function createOutage(data: {
  service_id: string;
  started_at: string;
  error_reason: string;
  payload_json?: string | null;
}): ServiceOutage {
  const db = getDb();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO service_outages (id, service_id, started_at, resolved_at, duration_seconds, error_reason, payload_json)
    VALUES (?, ?, ?, NULL, NULL, ?, ?)
  `).run(id, data.service_id, data.started_at, data.error_reason, data.payload_json || null);

  return {
    id,
    service_id: data.service_id,
    started_at: data.started_at,
    resolved_at: null,
    duration_seconds: null,
    error_reason: data.error_reason,
    payload_json: data.payload_json || null,
  };
}

export function getOutages(filters: OutagesFilterOptions = {}): OutagesReportSummary {
  const db = getDb();
  const { service_id, period = '24h', status = 'all', category = 'all' } = filters;

  let timeThreshold: string | null = null;
  const now = Date.now();
  let periodSeconds = 24 * 3600;

  if (period === '24h') {
    timeThreshold = new Date(now - 24 * 3600 * 1000).toISOString();
    periodSeconds = 24 * 3600;
  } else if (period === '7d') {
    timeThreshold = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    periodSeconds = 7 * 24 * 3600;
  } else if (period === '30d') {
    timeThreshold = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    periodSeconds = 30 * 24 * 3600;
  } else if (period === 'all') {
    timeThreshold = null;
    periodSeconds = 30 * 24 * 3600; // Benchmark de 30 dias para cálculo percentual SLA
  }

  const conditions: string[] = [];
  const params: any[] = [];

  if (service_id && service_id !== 'all') {
    conditions.push('o.service_id = ?');
    params.push(service_id);
  }

  if (category === 'service') {
    conditions.push("(s.category = 'service' OR s.check_type = 'tcp')");
  } else if (category === 'application') {
    conditions.push("(s.category != 'service' AND s.check_type != 'tcp')");
  }

  if (timeThreshold) {
    conditions.push('(o.started_at >= ? OR o.resolved_at >= ? OR o.resolved_at IS NULL)');
    params.push(timeThreshold, timeThreshold);
  }

  if (status === 'active') {
    conditions.push('o.resolved_at IS NULL');
  } else if (status === 'resolved') {
    conditions.push('o.resolved_at IS NOT NULL');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT 
      o.id,
      o.service_id,
      o.started_at,
      o.resolved_at,
      o.duration_seconds,
      o.error_reason,
      o.payload_json,
      s.name as service_name,
      s.check_type,
      s.category as service_category,
      s.url as service_url
    FROM service_outages o
    JOIN monitored_services s ON o.service_id = s.id
    ${whereClause}
    ORDER BY o.started_at DESC
  `).all(...params) as (ServiceOutage & { service_name: string; check_type: CheckType; service_category: ServiceCategory; service_url: string })[];

  let totalDowntime = 0;
  let activeCount = 0;
  let resolvedCount = 0;

  const outages: ServiceOutage[] = rows.map(row => {
    let currentDuration = row.duration_seconds;
    if (!row.resolved_at) {
      activeCount++;
      const startedTime = new Date(row.started_at).getTime();
      currentDuration = Math.max(1, Math.round((now - startedTime) / 1000));
    } else {
      resolvedCount++;
      if (currentDuration == null) {
        const startedTime = new Date(row.started_at).getTime();
        const resolvedTime = new Date(row.resolved_at).getTime();
        currentDuration = Math.max(1, Math.round((resolvedTime - startedTime) / 1000));
      }
    }

    totalDowntime += currentDuration || 0;

    return {
      ...row,
      duration_seconds: currentDuration,
    };
  });

  // Cálculo de SLA
  let countFilter = '';
  if (category === 'service') {
    countFilter = " AND (category = 'service' OR check_type = 'tcp')";
  } else if (category === 'application') {
    countFilter = " AND (category != 'service' AND check_type != 'tcp')";
  }

  const servicesCount = (service_id && service_id !== 'all') 
    ? 1 
    : Math.max(1, (db.prepare(`SELECT COUNT(*) as c FROM monitored_services WHERE is_active = 1${countFilter}`).get() as { c: number }).c);
  
  const totalPotentialSeconds = servicesCount * periodSeconds;
  const slaPercentage = totalPotentialSeconds > 0
    ? Math.max(0, Math.min(100, Math.round(((totalPotentialSeconds - totalDowntime) / totalPotentialSeconds) * 10000) / 100))
    : 100;

  return {
    total_outages: outages.length,
    active_outages_count: activeCount,
    resolved_outages_count: resolvedCount,
    total_downtime_seconds: totalDowntime,
    sla_percentage: slaPercentage,
    period,
    outages,
  };
}

export function resolveOutage(
  outage_id: string,
  resolved_at: string,
  duration_seconds: number
): void {
  const db = getDb();
  db.prepare(`
    UPDATE service_outages 
    SET resolved_at = ?, duration_seconds = ? 
    WHERE id = ?
  `).run(resolved_at, duration_seconds, outage_id);
}

export function getDiagnosticsStats(): DiagnosticsStats {
  const db = getDb();
  const allServices = getAllServices();
  const total = allServices.length;
  const active = allServices.filter(s => s.is_active === 1);
  const activeCount = active.length;

  let onlineCount = 0;
  let offlineCount = 0;
  const responseTimes: number[] = [];

  for (const s of active) {
    if (s.latest_log) {
      if (s.latest_log.is_up === 1) {
        onlineCount++;
        if (s.latest_log.response_time_ms != null && s.latest_log.response_time_ms > 0) {
          responseTimes.push(s.latest_log.response_time_ms);
        }
      } else {
        offlineCount++;
      }
    }
  }

  // Count outages in the last 24h with category breakdown
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const outages24hRow = db.prepare(`
    SELECT 
      COUNT(*) as total_count,
      COUNT(CASE WHEN s.category = 'service' OR s.check_type = 'tcp' THEN 1 END) as infra_count,
      COUNT(CASE WHEN s.category != 'service' AND s.check_type != 'tcp' THEN 1 END) as app_count
    FROM service_outages o
    JOIN monitored_services s ON o.service_id = s.id
    WHERE o.started_at >= ?
  `).get(oneDayAgo) as { total_count: number; infra_count: number; app_count: number };

  const avgResponseTime = responseTimes.length > 0
    ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
    : 0;

  let platform_status: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (offlineCount > 0) {
    platform_status = 'critical';
  } else if (activeCount > 0 && onlineCount < activeCount) {
    platform_status = 'degraded';
  }

  return {
    platform_status,
    total_services: total,
    active_services: activeCount,
    online_services: onlineCount,
    offline_services: offlineCount,
    recent_outages_count: outages24hRow?.total_count || 0,
    recent_app_outages_count: outages24hRow?.app_count || 0,
    recent_infra_outages_count: outages24hRow?.infra_count || 0,
    average_response_time_ms: avgResponseTime,
    last_updated: new Date().toISOString(),
  };
}
