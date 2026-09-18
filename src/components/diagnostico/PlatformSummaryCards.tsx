'use client'
import React from 'react';
import { 
  AlertOctagon, 
  Activity, 
  Zap, 
  Server, 
  Globe, 
  Network,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
import { DiagnosticsStats, ServiceWithDetails } from '@/lib/diagnostics/types';

interface Props {
  activeTab: 'applications' | 'infrastructure';
  services: ServiceWithDetails[];
  stats: DiagnosticsStats | null;
  loading: boolean;
  onOpenOutages?: (category: 'application' | 'service') => void;
}

export default function PlatformSummaryCards({ 
  activeTab, 
  services, 
  stats, 
  loading, 
  onOpenOutages 
}: Props) {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl animate-pulse h-24" 
          />
        ))}
      </div>
    );
  }

  const isAppTab = activeTab === 'applications';

  // Filtra serviços da aba ativa
  const tabServices = services.filter((s) => 
    isAppTab 
      ? s.category !== 'service' && s.check_type !== 'tcp'
      : s.category === 'service' || s.check_type === 'tcp'
  );

  const totalCount = tabServices.length;
  const activeCount = tabServices.filter((s) => s.is_active === 1).length;
  const offlineCount = tabServices.filter((s) => s.is_active === 1 && s.latest_log?.is_up === 0).length;
  const onlineCount = tabServices.filter((s) => s.is_active === 1 && s.latest_log?.is_up === 1).length;

  // Latência média contextual dos serviços operacionais ativos
  const responseTimes = tabServices
    .filter((s) => s.is_active === 1 && s.latest_log?.is_up === 1 && s.latest_log?.response_time_ms != null)
    .map((s) => s.latest_log!.response_time_ms!);

  const avgLatency = responseTimes.length > 0
    ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
    : null;

  // Quedas em 24h contextuais
  const recentOutagesCount = isAppTab
    ? (stats?.recent_app_outages_count ?? 0)
    : (stats?.recent_infra_outages_count ?? 0);

  // Status contextual
  const hasFailures = offlineCount > 0;
  const allOperational = activeCount > 0 && onlineCount === activeCount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Status Contextual (Aplicações vs Serviços de Rede) */}
      <div 
        className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
          hasFailures
            ? 'bg-rose-950/20 border-rose-500/30'
            : allOperational
            ? 'bg-emerald-950/15 border-emerald-500/30'
            : 'bg-slate-900/60 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isAppTab ? 'Status das Aplicações' : 'Status dos Serviços de Rede'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                hasFailures ? 'bg-rose-400' : allOperational ? 'bg-emerald-400' : 'bg-slate-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                hasFailures ? 'bg-rose-500' : allOperational ? 'bg-emerald-500' : 'bg-slate-500'
              }`} />
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-lg font-black tracking-tight ${
            hasFailures 
              ? 'text-rose-400' 
              : allOperational 
              ? 'text-emerald-400' 
              : 'text-slate-300'
          }`}>
            {hasFailures
              ? isAppTab
                ? `${offlineCount} com Falha`
                : `${offlineCount} Recusado(s)`
              : allOperational
              ? isAppTab
                ? 'Todas Operacionais'
                : 'Todos Abertos'
              : totalCount === 0
              ? 'Nenhum Cadastrado'
              : 'Pausados'}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 mt-1 truncate">
          {hasFailures
            ? isAppTab
              ? `${offlineCount} aplicação(ões) sem resposta HTTP`
              : `${offlineCount} porta(s) com conexão recusada/timeout`
            : allOperational
            ? isAppTab
              ? `${activeCount} aplicação(ões) ativas e saudáveis`
              : `${activeCount} porta(s) TCP respondendo normalmente`
            : totalCount === 0
            ? 'Adicione alvos no botão "+ Novo Alvo"'
            : 'Monitoramento pausado'}
        </p>
      </div>

      {/* 2. Total Monitorados na Aba */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isAppTab ? 'Total de Aplicações' : 'Serviços & Portas'}
          </span>
          <div className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
            {isAppTab ? <Globe size={15} /> : <Network size={15} />}
          </div>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-black text-white font-mono tracking-tight">
            {activeCount}
          </span>
          <span className="text-xs text-slate-400">
            de {totalCount} {isAppTab ? 'aplicações' : 'portas'}
          </span>
        </div>

        <div className="mt-2 w-full bg-slate-800/80 rounded-full h-1 overflow-hidden">
          <div 
            className="bg-cyan-500 h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${totalCount > 0 ? ((activeCount / totalCount) * 100) : 0}%` 
            }}
          />
        </div>
      </div>

      {/* 3. Quedas Recentes (24h) Contextuais */}
      <div 
        onClick={() => onOpenOutages?.(isAppTab ? 'application' : 'service')}
        className={`bg-slate-900/60 p-4 rounded-2xl border transition-all group ${
          onOpenOutages 
            ? 'cursor-pointer hover:border-slate-700 hover:bg-slate-850' 
            : ''
        } ${
          recentOutagesCount > 0 
            ? 'border-rose-500/30 bg-rose-950/10' 
            : 'border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isAppTab ? 'Quedas em Apps (24h)' : 'Quedas em Infra (24h)'}
          </span>
          <div className={`p-1.5 rounded-xl transition-all ${
            recentOutagesCount > 0 
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' 
              : 'bg-slate-800 text-slate-400'
          }`}>
            <AlertOctagon size={15} />
          </div>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-xl font-black font-mono tracking-tight ${
            recentOutagesCount > 0 ? 'text-rose-400' : 'text-white'
          }`}>
            {recentOutagesCount}
          </span>
          <span className="text-xs text-slate-400">
            incidente(s)
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate">
            {recentOutagesCount === 0 
              ? 'Nenhuma queda recente' 
              : 'Clique para auditar'}
          </span>
          {onOpenOutages && (
            <span className="text-[10px] font-bold text-cyan-400 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              <span>Auditar</span>
              <ArrowUpRight size={12} />
            </span>
          )}
        </div>
      </div>

      {/* 4. Latência Média Contextual */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isAppTab ? 'Latência Média HTTP' : 'Handshake TCP Médio'}
          </span>
          <div className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Zap size={15} />
          </div>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-black text-amber-300 tracking-tight font-mono">
            {avgLatency !== null ? `${avgLatency} ms` : '—'}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 mt-1 truncate">
          {isAppTab 
            ? 'Tempo de resposta HTTP dos endpoints' 
            : 'Tempo de estabelecimento de socket'}
        </p>
      </div>
    </div>
  );
}
