export type CheckType = 'intelligent' | 'basic';

export interface MonitoredService {
  id: string;
  name: string;
  url: string;
  check_type: CheckType;
  interval_seconds: number;
  is_active: number; // 1 = active, 0 = paused
  created_at: string;
  updated_at: string;
}

export interface ServiceHealthLog {
  id: string;
  service_id: string;
  status_code: number | null;
  response_time_ms: number | null;
  is_up: number; // 1 = up, 0 = down
  payload_json: string | null;
  checked_at: string;
}

export interface ServiceOutage {
  id: string;
  service_id: string;
  started_at: string;
  resolved_at: string | null;
  duration_seconds: number | null;
  error_reason: string | null;
  payload_json?: string | null;
  service_name?: string;
  check_type?: CheckType;
  service_url?: string;
}

export interface OutagesFilterOptions {
  service_id?: string;
  period?: '24h' | '7d' | '30d' | 'all';
  status?: 'all' | 'active' | 'resolved';
}

export interface OutagesReportSummary {
  total_outages: number;
  active_outages_count: number;
  resolved_outages_count: number;
  total_downtime_seconds: number;
  sla_percentage: number;
  period: string;
  outages: ServiceOutage[];
}

export interface DependencyCheck {
  status: 'up' | 'down' | 'degraded';
  latency_ms?: number;
  message?: string;
  [key: string]: any;
}

export interface HealthCheckPayload {
  service?: string;
  version?: string;
  status: 'healthy' | 'unhealthy' | string;
  timestamp: string;
  uptime_seconds?: number;
  checks?: Record<string, DependencyCheck>;
  metrics?: Record<string, any>;
  [key: string]: any;
}

export interface ServiceWithDetails extends MonitoredService {
  latest_log?: ServiceHealthLog | null;
  active_outage?: ServiceOutage | null;
  parsed_payload?: HealthCheckPayload | null;
  uptime_percentage_24h?: number;
}

export interface DiagnosticsStats {
  platform_status: 'healthy' | 'degraded' | 'critical';
  total_services: number;
  active_services: number;
  online_services: number;
  offline_services: number;
  recent_outages_count: number;
  average_response_time_ms: number;
  last_updated: string;
}
