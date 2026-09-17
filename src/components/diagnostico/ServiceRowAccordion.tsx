'use client'
import React, { useState } from 'react';
import { 
  ChevronDown, 
  RefreshCw, 
  Play, 
  Pause, 
  Pencil, 
  Trash2, 
  ExternalLink, 
  AlertTriangle, 
  Sparkles, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Code 
} from 'lucide-react';
import { ServiceWithDetails, DependencyCheck } from '@/lib/diagnostics/types';

interface Props {
  service: ServiceWithDetails;
  onCheckNow: (service: ServiceWithDetails) => void;
  onToggleStatus: (service: ServiceWithDetails) => void;
  onEdit: (service: ServiceWithDetails) => void;
  onDelete: (service: ServiceWithDetails) => void;
  isChecking: boolean;
}

// Formata nomes de chaves de dependência: ex "storage_data_dir" -> "Storage Data Dir"
function formatKeyName(key: string): string {
  return key
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Formata tempo relativo amigável
function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Nunca';
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 5) return 'agora';
    if (diff < 60) return `há ${diff}s`;
    if (diff < 3600) return `há ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    return `há ${Math.floor(diff / 86400)}d`;
  } catch {
    return '—';
  }
}

// Formata duração acumulada fora do ar
function formatDowntimeDuration(startedAt?: string | null): string {
  if (!startedAt) return 'Indeterminada';
  try {
    const totalSeconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  } catch {
    return 'Recente';
  }
}

export default function ServiceRowAccordion({
  service,
  onCheckNow,
  onToggleStatus,
  onEdit,
  onDelete,
  isChecking,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const isPaused = service.is_active === 0;
  const latestLog = service.latest_log;
  const isUp = latestLog?.is_up === 1;
  const hasChecked = !!latestLog;
  const activeOutage = service.active_outage;

  const payload = service.parsed_payload;
  const checks = payload?.checks;
  const metrics = payload?.metrics;

  // Cor do tempo de resposta (verde se < 100ms, amarelo/laranja se > 300ms)
  const getLatencyColor = (ms?: number | null) => {
    if (ms == null) return 'text-slate-400';
    if (ms < 100) return 'text-emerald-400';
    if (ms <= 300) return 'text-emerald-300';
    return 'text-amber-400';
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      !isUp && hasChecked && !isPaused
        ? 'bg-slate-900/90 border-rose-500/40 hover:border-rose-500/60 shadow-xs shadow-rose-950/20'
        : isExpanded
        ? 'bg-slate-900/95 border-blue-500/50 shadow-lg shadow-black/20 ring-1 ring-blue-500/20'
        : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-xs'
    }`}>
      {/* LINHA PRINCIPAL COMPACTA */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
      >
        {/* COLUNA 1: IDENTIFICAÇÃO (ESQUERDA) */}
        <div className="flex items-center gap-2.5 min-w-[180px] max-w-[260px] flex-shrink-0">
          <div className="flex-shrink-0">
            {isPaused ? (
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 block" />
            ) : !hasChecked ? (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse block" />
            ) : isUp ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              </span>
            ) : (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
              </span>
            )}
          </div>

          <h3 className="text-sm font-medium text-white truncate tracking-tight" title={service.name}>
            {service.name}
          </h3>
        </div>

        {/* COLUNA 2: MODO (CENTRO-ESQUERDA) */}
        <div className="hidden sm:flex items-center w-28 flex-shrink-0">
          {service.check_type === 'intelligent' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 backdrop-blur-xs">
              <Sparkles size={11} className="text-cyan-400" />
              <span>Inteligente</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 backdrop-blur-xs">
              <Globe size={11} className="text-slate-400" />
              <span>Básico</span>
            </span>
          )}
        </div>

        {/* COLUNA 3: ENDPOINT (CENTRO - PREENCHIMENTO ÚTIL) */}
        <div className="hidden md:flex items-center flex-1 min-w-[170px] max-w-sm px-2">
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-slate-400 hover:text-cyan-300 font-mono truncate transition-colors flex items-center gap-1.5 group/url max-w-full"
            title={service.url}
          >
            <span className="truncate">{service.url}</span>
            <ExternalLink size={11} className="flex-shrink-0 opacity-0 group-hover/url:opacity-100 transition-opacity text-cyan-400" />
          </a>
        </div>

        {/* COLUNA 4: PERFORMANCE (CENTRO-DIREITA) */}
        <div className="hidden lg:flex flex-col items-end w-32 flex-shrink-0 text-right">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-mono font-semibold ${getLatencyColor(latestLog?.response_time_ms)}`}>
              {latestLog?.response_time_ms != null ? `${latestLog.response_time_ms} ms` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({service.interval_seconds}s)
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {formatRelativeTime(latestLog?.checked_at)}
          </span>
        </div>

        {/* COLUNA 5: STATUS (DIREITA) */}
        <div className="flex items-center justify-end w-28 sm:w-32 flex-shrink-0">
          {isPaused ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800/90 text-slate-400 border border-slate-700/70">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              Pausado
            </span>
          ) : !hasChecked ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Aguardando
            </span>
          ) : isUp ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.12)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              Operacional
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
              </span>
              Fora do Ar
            </span>
          )}
        </div>

        {/* COLUNA 6: AÇÕES (EXTREMA DIREITA) */}
        <div 
          className="flex items-center gap-0.5 sm:gap-1 pl-2 sm:pl-3 border-l border-slate-800/80 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botão Checar Agora */}
          <button
            onClick={() => onCheckNow(service)}
            disabled={isChecking}
            title="Sondar serviço imediatamente"
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/70 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isChecking ? 'animate-spin text-cyan-400' : ''} />
          </button>

          {/* Botão Pausar / Ativar */}
          <button
            onClick={() => onToggleStatus(service)}
            title={isPaused ? 'Ativar sondagens' : 'Pausar sondagens'}
            className={`p-1.5 rounded-lg transition-all ${
              isPaused 
                ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/70' 
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/70'
            }`}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>

          {/* Botão Editar */}
          <button
            onClick={() => onEdit(service)}
            title="Editar configurações"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-lg transition-all"
          >
            <Pencil size={14} />
          </button>

          {/* Botão Excluir */}
          <button
            onClick={() => onDelete(service)}
            title="Excluir serviço"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/70 rounded-lg transition-all"
          >
            <Trash2 size={14} />
          </button>

          {/* Chevron Giratório */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-lg transition-all"
          >
            <ChevronDown 
              size={15} 
              className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-400' : ''}`} 
            />
          </button>
        </div>
      </div>

      {/* ÁREA EXPANDIDA (ACCORDION / DETALHES DE ALTO PADRÃO) */}
      {isExpanded && (
        <div className="border-t border-slate-800/80 bg-slate-950/50 p-4 sm:p-5 space-y-4 animate-fadeIn">
          {/* 1. SE O SERVIÇO ESTIVER DOWN: Banner de Alerta e Causa-Raiz */}
          {!isUp && hasChecked && (
            <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3.5 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg flex-shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                      Indisponibilidade Detectada
                    </h4>
                    {activeOutage && (
                      <span className="text-[11px] font-medium text-rose-300 font-mono bg-rose-900/40 border border-rose-700/40 px-2 py-0.5 rounded-md">
                        Tempo fora do ar: {formatDowntimeDuration(activeOutage.started_at)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-rose-200/80 mt-1">
                    {activeOutage?.started_at ? (
                      <>Queda iniciada em <strong className="font-mono text-rose-200">{new Date(activeOutage.started_at).toLocaleString('pt-BR')}</strong></>
                    ) : (
                      'Falha de resposta na última sondagem periódica.'
                    )}
                  </p>

                  {/* Causa Raiz / Erro Capturado */}
                  <div className="mt-2.5 p-2.5 bg-slate-950/80 border border-rose-900/50 rounded-lg">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
                      Causa-Raiz / Erro Capturado:
                    </span>
                    <p className="text-xs font-mono text-rose-200/90 break-words leading-relaxed">
                      {activeOutage?.error_reason || latestLog?.payload_json || 'Falha de comunicação ou timeout'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. RENDERIZAÇÃO 100% DINÂMICA DE DEPENDÊNCIAS INTERNAS (CHECKS) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-cyan-400" />
                <span>Dependências & Componentes Internos</span>
              </h4>
              {checks && (
                <span className="text-[10px] font-medium text-slate-500 font-mono">
                  {Object.keys(checks).length} inspecionado(s)
                </span>
              )}
            </div>

            {checks && Object.keys(checks).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {Object.entries(checks).map(([checkName, checkData]: [string, DependencyCheck]) => {
                  const checkStatus = checkData.status || 'up';
                  const isCheckUp = checkStatus === 'up';
                  const isCheckDegraded = checkStatus === 'degraded';

                  return (
                    <div
                      key={checkName}
                      className={`p-3 rounded-xl border transition-all ${
                        !isCheckUp && !isCheckDegraded
                          ? 'bg-rose-950/20 border-rose-500/30'
                          : isCheckDegraded
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-medium text-slate-200 truncate" title={checkName}>
                          {formatKeyName(checkName)}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isCheckUp
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isCheckDegraded
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {isCheckUp ? (
                            <>
                              <CheckCircle2 size={10} />
                              UP
                            </>
                          ) : isCheckDegraded ? (
                            <>
                              <AlertTriangle size={10} />
                              DEGRADED
                            </>
                          ) : (
                            <>
                              <XCircle size={10} />
                              DOWN
                            </>
                          )}
                        </span>
                      </div>

                      {/* Latência e mensagem interna */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="text-[10px] text-slate-500">Latência:</span>
                        <span className={`font-mono font-medium ${getLatencyColor(checkData.latency_ms)}`}>
                          {checkData.latency_ms != null ? `${checkData.latency_ms} ms` : '—'}
                        </span>
                      </div>

                      {checkData.message && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug" title={checkData.message}>
                          {checkData.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : service.check_type === 'intelligent' ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400">
                {hasChecked 
                  ? 'O payload retornado pelo serviço não contém o nó "checks".' 
                  : 'Aguardando execução da primeira checagem de integridade.'}
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
                <Globe size={14} className="text-cyan-400 flex-shrink-0" />
                <span>
                  Modo de <strong>Checagem Básica de URL</strong> ativo: Avaliando status HTTP {latestLog?.status_code ? `(${latestLog.status_code})` : ''} e tempo de resposta geral.
                </span>
              </div>
            )}
          </div>

          {/* 3. RENDERIZAÇÃO DINÂMICA DE MÉTRICAS EXTRAS (METRICS) */}
          {metrics && Object.keys(metrics).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity size={13} className="text-emerald-400" />
                <span>Métricas de Execução</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(metrics).map(([metricKey, metricVal]) => (
                  <div key={metricKey} className="bg-slate-900/60 border border-slate-800/70 rounded-lg p-2.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate" title={metricKey}>
                      {formatKeyName(metricKey)}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 font-mono mt-0.5 block truncate">
                      {typeof metricVal === 'number'
                        ? metricKey.includes('mb')
                          ? `${metricVal} MB`
                          : metricKey.includes('seconds')
                          ? `${metricVal}s`
                          : metricVal
                        : String(metricVal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. VISUALIZADOR DE PAYLOAD JSON BRUTO */}
          {latestLog?.payload_json && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Code size={13} />
                <span>{showRawJson ? 'Ocultar JSON Bruto' : 'Inspecionar JSON Bruto'}</span>
              </button>

              {showRawJson && (
                <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto">
                  <pre>{JSON.stringify(JSON.parse(latestLog.payload_json), null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
