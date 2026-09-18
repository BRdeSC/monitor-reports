'use client'
import React, { useState } from 'react';
import {
  ChevronDown,
  RefreshCw,
  Play,
  Pause,
  Pencil,
  Trash2,
  AlertTriangle,
  Database,
  Layers,
  Cpu,
  Server,
  Code,
  CheckCircle2,
  XCircle,
  Network
} from 'lucide-react';
import { ServiceWithDetails } from '@/lib/diagnostics/types';

interface Props {
  service: ServiceWithDetails;
  onCheckNow: (service: ServiceWithDetails) => void;
  onToggleStatus: (service: ServiceWithDetails) => void;
  onEdit: (service: ServiceWithDetails) => void;
  onDelete: (service: ServiceWithDetails) => void;
  isChecking: boolean;
}

// Detector dinâmico de protocolo e serviço com base na porta ou nome
function getProtocolInfo(service: ServiceWithDetails): {
  label: string;
  category: 'database' | 'cache' | 'broker' | 'storage' | 'tcp';
  badgeClass: string;
  icon: React.ReactNode;
} {
  const port = service.port || (() => {
    const parts = (service.url || '').split(':');
    return parseInt(parts[parts.length - 1], 10);
  })();

  const nameLower = service.name.toLowerCase();

  if (port === 3306 || nameLower.includes('mysql') || nameLower.includes('mariadb')) {
    return {
      label: 'MySQL',
      category: 'database',
      badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: <Database size={11} className="text-blue-400" />,
    };
  }

  if (port === 5432 || nameLower.includes('postgres') || nameLower.includes('pgsql')) {
    return {
      label: 'PostgreSQL',
      category: 'database',
      badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      icon: <Database size={11} className="text-indigo-400" />,
    };
  }

  if (port === 6379 || nameLower.includes('redis')) {
    return {
      label: 'Redis Cache',
      category: 'cache',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: <Layers size={11} className="text-rose-400" />,
    };
  }

  if (port === 27017 || nameLower.includes('mongo')) {
    return {
      label: 'MongoDB',
      category: 'database',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <Database size={11} className="text-emerald-400" />,
    };
  }

  if (port === 5672 || port === 15672 || nameLower.includes('rabbit')) {
    return {
      label: 'RabbitMQ',
      category: 'broker',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: <Cpu size={11} className="text-amber-400" />,
    };
  }

  if (port === 9092 || nameLower.includes('kafka')) {
    return {
      label: 'Apache Kafka',
      category: 'broker',
      badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      icon: <Cpu size={11} className="text-purple-400" />,
    };
  }

  if (port === 2049 || nameLower.includes('nfs') || nameLower.includes('storage')) {
    return {
      label: 'Storage NFS',
      category: 'storage',
      badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      icon: <Server size={11} className="text-teal-400" />,
    };
  }

  return {
    label: 'TCP Socket',
    category: 'tcp',
    badgeClass: 'bg-slate-800/90 text-slate-300 border-slate-700/60',
    icon: <Network size={11} className="text-slate-400" />,
  };
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

export default function InfraServiceRow({
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

  const protocolInfo = getProtocolInfo(service);
  const displayAddress = service.host && service.port 
    ? `${service.host}:${service.port}` 
    : service.url;

  // Cor do tempo de resposta TCP
  const getLatencyColor = (ms?: number | null) => {
    if (ms == null) return 'text-slate-400';
    if (ms < 50) return 'text-emerald-400';
    if (ms <= 200) return 'text-emerald-300';
    return 'text-amber-400';
  };

  // Extrai mensagem amigável do status da porta
  const getStatusBadge = () => {
    if (isPaused) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800/90 text-slate-400 border border-slate-700/70">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Pausado
        </span>
      );
    }

    if (!hasChecked) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Aguardando
        </span>
      );
    }

    if (isUp) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.12)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          Aberta / Operacional
        </span>
      );
    }

    // Identifica se foi timeout ou recusa
    const errorText = activeOutage?.error_reason || '';
    const isTimeout = errorText.toLowerCase().includes('timeout') || errorText.includes('ETIMEDOUT');

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
        </span>
        {isTimeout ? 'Porta Inacessível / Timeout' : 'Conexão Recusada'}
      </span>
    );
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      !isUp && hasChecked && !isPaused
        ? 'bg-slate-900/90 border-rose-500/40 hover:border-rose-500/60 shadow-xs shadow-rose-950/20'
        : isExpanded
        ? 'bg-slate-900/95 border-blue-500/50 shadow-lg shadow-black/20 ring-1 ring-blue-500/20'
        : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-xs'
    }`}>
      {/* LINHA PRINCIPAL DA TABELA DE INFRAESTRUTURA */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
      >
        {/* COLUNA 1: NOME DO SERVIÇO */}
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

          <div>
            <h3 className="text-sm font-medium text-white truncate tracking-tight" title={service.name}>
              {service.name}
            </h3>
          </div>
        </div>

        {/* COLUNA 2: PROTOCOLO / SERVIÇO BADGE */}
        <div className="hidden sm:flex items-center w-32 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border backdrop-blur-xs ${protocolInfo.badgeClass}`}>
            {protocolInfo.icon}
            <span>{protocolInfo.label}</span>
          </span>
        </div>

        {/* COLUNA 3: ENDEREÇO DE REDE (HOST:PORT MONO) */}
        <div className="hidden md:flex items-center flex-1 min-w-[170px] max-w-sm px-2">
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800/80 px-2.5 py-1 rounded-lg">
            <Network size={12} className="text-cyan-400 flex-shrink-0" />
            <span className="text-xs font-mono font-medium text-cyan-300 truncate" title={displayAddress}>
              {displayAddress}
            </span>
          </div>
        </div>

        {/* COLUNA 4: LATÊNCIA TCP HANDSHAKE */}
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

        {/* COLUNA 5: STATUS DO SOCKET */}
        <div className="flex items-center justify-end w-40 sm:w-44 flex-shrink-0">
          {getStatusBadge()}
        </div>

        {/* COLUNA 6: AÇÕES RÁPIDAS */}
        <div
          className="flex items-center gap-0.5 sm:gap-1 pl-2 sm:pl-3 border-l border-slate-800/80 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botão Re-testar */}
          <button
            onClick={() => onCheckNow(service)}
            disabled={isChecking}
            title="Disparar teste de socket TCP agora"
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/70 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isChecking ? 'animate-spin text-cyan-400' : ''} />
          </button>

          {/* Botão Pausar / Ativar */}
          <button
            onClick={() => onToggleStatus(service)}
            title={isPaused ? 'Ativar checagens periódicas' : 'Pausar checagens periódicas'}
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
            title="Editar configurações do alvo"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-lg transition-all"
          >
            <Pencil size={14} />
          </button>

          {/* Botão Excluir */}
          <button
            onClick={() => onDelete(service)}
            title="Excluir monitoramento deste alvo"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/70 rounded-lg transition-all"
          >
            <Trash2 size={14} />
          </button>

          {/* Chevron Giratório */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Recolher detalhes de rede' : 'Expandir detalhes de rede'}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-lg transition-all"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-400' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* ÁREA EXPANDIDA (DIAGNÓSTICO E AUDITORIA DE REDE) */}
      {isExpanded && (
        <div className="border-t border-slate-800/80 bg-slate-950/50 p-4 sm:p-5 space-y-4 animate-fadeIn">
          {/* Banner de Erro em caso de Indisponibilidade */}
          {!isUp && hasChecked && (
            <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3.5 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg flex-shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                      Falha de Conexão TCP Detectada
                    </h4>
                    {activeOutage && (
                      <span className="text-[11px] font-medium text-rose-300 font-mono bg-rose-900/40 border border-rose-700/40 px-2 py-0.5 rounded-md">
                        Tempo fora do ar: {formatDowntimeDuration(activeOutage.started_at)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-rose-200/80 mt-1">
                    {activeOutage?.started_at ? (
                      <>Queda registrada em <strong className="font-mono text-rose-200">{new Date(activeOutage.started_at).toLocaleString('pt-BR')}</strong></>
                    ) : (
                      'Porta de rede inacessível na última sondagem periódica.'
                    )}
                  </p>

                  <div className="mt-2.5 p-2.5 bg-slate-950/80 border border-rose-900/50 rounded-lg">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
                      Causa / Mensagem do Socket:
                    </span>
                    <p className="text-xs font-mono text-rose-200/90 break-words leading-relaxed">
                      {activeOutage?.error_reason || latestLog?.payload_json || 'Conexão recusada ou timeout'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cartões de Parâmetros de Rede e Desempenho */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Endereço / Socket */}
            <div className="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Destino TCP
              </span>
              <span className="text-xs font-mono font-medium text-slate-200 mt-1 block truncate">
                {displayAddress}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Porta: {service.port || 'definida na URL'}
              </span>
            </div>

            {/* Handshake Latency */}
            <div className="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Abertura de Socket (Latência)
              </span>
              <span className={`text-xs font-mono font-medium mt-1 block ${getLatencyColor(latestLog?.response_time_ms)}`}>
                {latestLog?.response_time_ms != null ? `${latestLog.response_time_ms} ms` : '—'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {isUp ? 'Handshake concluído com sucesso' : 'Falha ao estabelecer conexão'}
              </span>
            </div>

            {/* Intervalo & Atualização */}
            <div className="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Periodicidade
              </span>
              <span className="text-xs font-mono font-medium text-slate-200 mt-1 block">
                A cada {service.interval_seconds}s
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Última checagem: {formatRelativeTime(latestLog?.checked_at)}
              </span>
            </div>
          </div>

          {/* Visualizador de Payload JSON Bruto do Socket */}
          {latestLog?.payload_json && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Code size={13} />
                <span>{showRawJson ? 'Ocultar JSON da Verificação' : 'Inspecionar JSON da Verificação'}</span>
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
