'use client'
import React from 'react';
import { ShieldCheck, AlertOctagon, Activity, Zap, Server, Clock } from 'lucide-react';
import { DiagnosticsStats } from '@/lib/diagnostics/types';

interface Props {
  stats: DiagnosticsStats | null;
  loading: boolean;
  onOpenOutages?: () => void;
}

export default function PlatformSummaryCards({ stats, loading, onOpenOutages }: Props) {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-pulse h-28" />
        ))}
      </div>
    );
  }

  const isCritical = stats?.platform_status === 'critical';
  const isDegraded = stats?.platform_status === 'degraded';
  const isHealthy = stats?.platform_status === 'healthy';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Status Geral da Plataforma */}
      <div className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 relative overflow-hidden ${
        isCritical 
          ? 'bg-rose-50/70 border-rose-200' 
          : isDegraded 
          ? 'bg-amber-50/70 border-amber-200' 
          : 'bg-emerald-50/60 border-emerald-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Status da Plataforma
          </span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isCritical ? 'bg-rose-400' : isDegraded ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isCritical ? 'bg-rose-600' : isDegraded ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-xl font-black tracking-tight ${
            isCritical ? 'text-rose-700' : isDegraded ? 'text-amber-700' : 'text-emerald-700'
          }`}>
            {isCritical ? 'Falhas Detectadas' : isDegraded ? 'Atenção / Parcial' : 'Todos Operacionais'}
          </span>
        </div>

        <p className="text-xs text-slate-500 mt-1 font-medium">
          {isCritical 
            ? `${stats?.offline_services || 0} serviço(s) com indisponibilidade ativa`
            : isDegraded 
            ? 'Alguns serviços demandam atenção'
            : 'Todos os serviços monitorados respondendo normalmente'}
        </p>
      </div>

      {/* 2. Serviços Ativos */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Serviços Monitorados
          </span>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Server size={18} />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats?.active_services || 0}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            de {stats?.total_services || 0} cadastrados
          </span>
        </div>

        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${stats?.total_services ? ((stats.active_services / stats.total_services) * 100) : 0}%` 
            }}
          />
        </div>
      </div>

      {/* 3. Quantidade de Quedas Recentes (Clicável para abrir histórico) */}
      <div 
        onClick={onOpenOutages}
        className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all group ${
          onOpenOutages ? 'cursor-pointer hover:border-slate-400 hover:shadow-md' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Quedas Recentes (24h)
          </span>
          <div className={`p-2 rounded-xl transition-all ${
            (stats?.recent_outages_count || 0) > 0 
              ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' 
              : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'
          }`}>
            <AlertOctagon size={18} />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-2xl font-black tracking-tight ${
            (stats?.recent_outages_count || 0) > 0 ? 'text-rose-600' : 'text-slate-900'
          }`}>
            {stats?.recent_outages_count || 0}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            incidente(s) registrado(s)
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            {(stats?.recent_outages_count || 0) === 0 
              ? 'Nenhuma queda nas últimas 24h'
              : 'Clique para ver o relatório detalhado'}
          </span>
          {onOpenOutages && (
            <span className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              Ver relatório →
            </span>
          )}
        </div>
      </div>

      {/* 4. Tempo Médio de Resposta */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Latência Média
          </span>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <Zap size={18} />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {stats?.average_response_time_ms ? `${stats.average_response_time_ms} ms` : '—'}
          </span>
        </div>

        <p className="text-xs text-slate-500 mt-1 font-medium">
          Tempo médio de resposta dos serviços operacionais
        </p>
      </div>
    </div>
  );
}
