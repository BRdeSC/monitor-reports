'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Activity, 
  Calendar, 
  Filter, 
  Sparkles, 
  Globe, 
  Code, 
  RefreshCw, 
  Loader2, 
  ShieldCheck, 
  AlertOctagon,
  FileSpreadsheet
} from 'lucide-react';
import { ServiceOutage, OutagesReportSummary, MonitoredService, CheckType } from '@/lib/diagnostics/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  services: MonitoredService[];
  initialCategory?: 'all' | 'application' | 'service';
}

// Formata segundos em texto amigável: ex 4747s -> "1h 19m 7s"
function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds)) return '—';
  if (seconds === 0) return '0s';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

// Formata data e hora em padrão local
function formatDateTime(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Data inválida';
  }
}

export default function OutagesModal({ isOpen, onClose, services, initialCategory = 'all' }: Props) {
  const [data, setData] = useState<OutagesReportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'application' | 'service'>(initialCategory);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'resolved'>('all');

  // Atualiza categoria quando o prop initialCategory mudar
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Snapshot visualizador
  const [inspectingPayload, setInspectingPayload] = useState<{ title: string; json: string } | null>(null);

  const fetchOutages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('period', selectedPeriod);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedServiceId !== 'all') params.set('service_id', selectedServiceId);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);

      const res = await fetch(`/metrics/api/diagnostics/outages?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de incidentes:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedPeriod, selectedServiceId, selectedStatus]);

  useEffect(() => {
    if (isOpen) {
      fetchOutages();
    }
  }, [isOpen, fetchOutages]);

  if (!isOpen) return null;

  const sla = data?.sla_percentage ?? 100;
  const isHighSla = sla >= 99.5;
  const isMediumSla = sla >= 98.0 && sla < 99.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-fadeIn select-none">
      <div 
        className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER DO MODAL */}
        <div className="px-6 py-4.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Relatório & Histórico de Incidentes</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Métricas de disponibilidade, histórico de indisponibilidade e auditoria de causa-raiz.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOutages}
              disabled={loading}
              title="Atualizar dados"
              className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-cyan-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 1. MÉTRICAS CONSOLIDADAS NO TOPO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Total de Incidentes */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>Total de Incidentes</span>
                <AlertOctagon size={16} className="text-rose-400" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">
                  {data?.total_outages ?? 0}
                </span>
                <span className="text-xs text-slate-400">
                  {data?.active_outages_count ? `(${data.active_outages_count} ativo)` : 'resolvidos'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Registrados no período selecionado
              </p>
            </div>

            {/* Tempo Total Fora do Ar */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>Tempo Fora do Ar</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-300 font-mono">
                  {formatDuration(data?.total_downtime_seconds)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Downtime acumulado na janela de análise
              </p>
            </div>

            {/* Taxa de Disponibilidade (SLA %) */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <span>Disponibilidade (SLA)</span>
                <ShieldCheck size={16} className={isHighSla ? 'text-emerald-400' : isMediumSla ? 'text-amber-400' : 'text-rose-400'} />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className={`text-2xl font-black font-mono ${
                  isHighSla ? 'text-emerald-400' : isMediumSla ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {data?.sla_percentage != null ? `${data.sla_percentage}%` : '100%'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {isHighSla ? 'Excelente índice operacional' : 'SLA impactado por interrupções'}
              </p>
            </div>
          </div>

          {/* 2. FILTROS DE CONSULTA */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Filtro Rápido por Categoria */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'application', label: 'Apenas Aplicações' },
                  { id: 'service', label: 'Apenas Infraestrutura' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id as any);
                      setSelectedServiceId('all');
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Filtro de Período */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
                {[
                  { id: '24h', label: '24h' },
                  { id: '7d', label: '7d' },
                  { id: '30d', label: '30d' },
                  { id: 'all', label: 'Tudo' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriod(p.id as any)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      selectedPeriod === p.id
                        ? 'bg-slate-800 text-cyan-300 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Filtro por Alvo / Serviço */}
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="all">Todos os alvos</option>
                  {services
                    .filter((s) => {
                      if (selectedCategory === 'application') return s.category !== 'service' && s.check_type !== 'tcp';
                      if (selectedCategory === 'service') return s.category === 'service' || s.check_type === 'tcp';
                      return true;
                    })
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.category === 'service' || s.check_type === 'tcp' ? '(Infra TCP)' : '(Aplicação)'}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Filtro por Status */}
            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'active', label: 'Ativos' },
                { id: 'resolved', label: 'Resolvidos' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStatus(st.id as any)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                    selectedStatus === st.id
                      ? 'bg-slate-800 border-slate-700 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. TABELA / HISTÓRICO DE INCIDENTES */}
          <div className="space-y-2">
            {loading ? (
              <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-3">
                <Loader2 size={28} className="animate-spin text-cyan-400" />
                <span className="text-xs text-slate-400 font-medium">Carregando incidentes...</span>
              </div>
            ) : !data || data.outages.length === 0 ? (
              <div className="p-10 text-center bg-slate-950/40 rounded-2xl border border-slate-800 space-y-2">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto opacity-80" />
                <h4 className="text-sm font-bold text-slate-200">Nenhum incidente registrado</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Não houve registros de quedas ou indisponibilidade para os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Alvo / Serviço</th>
                      <th className="py-3 px-4">Início da Queda</th>
                      <th className="py-3 px-4">Retorno</th>
                      <th className="py-3 px-4 text-right">Duração (Downtime)</th>
                      <th className="py-3 px-4">Causa-Raiz / Motivo</th>
                      <th className="py-3 px-4 text-center">Snapshot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {data.outages.map((outage) => {
                      const isStillActive = !outage.resolved_at;

                      return (
                        <tr key={outage.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Alvo / Serviço Afetado */}
                          <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-100">{outage.service_name || 'Alvo'}</span>
                              {outage.service_category === 'service' || outage.check_type === 'tcp' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-purple-500/15 text-purple-300 border-purple-500/30 font-medium">
                                  <span>🖧 Infraestrutura TCP</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-blue-500/15 text-blue-300 border-blue-500/30 font-medium">
                                  <span>🚀 Aplicação</span>
                                </span>
                              )}
                              {outage.check_type === 'intelligent' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-medium">
                                  IA
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Início */}
                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                            {formatDateTime(outage.started_at)}
                          </td>

                          {/* Retorno */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isStillActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                Em Andamento
                              </span>
                            ) : (
                              <span className="font-mono text-slate-300">
                                {formatDateTime(outage.resolved_at)}
                              </span>
                            )}
                          </td>

                          {/* Duração */}
                          <td className="py-3 px-4 text-right font-mono font-semibold whitespace-nowrap">
                            <span className={isStillActive ? 'text-rose-400' : 'text-amber-300'}>
                              {formatDuration(outage.duration_seconds)}
                            </span>
                          </td>

                          {/* Causa-Raiz */}
                          <td className="py-3 px-4 max-w-xs truncate text-slate-300 font-mono text-[11px]" title={outage.error_reason || ''}>
                            {outage.error_reason || 'Serviço inacessível'}
                          </td>

                          {/* Snapshot JSON */}
                          <td className="py-3 px-4 text-center">
                            {outage.payload_json ? (
                              <button
                                onClick={() => setInspectingPayload({
                                  title: `${outage.service_name || 'Serviço'} — Incidente em ${formatDateTime(outage.started_at)}`,
                                  json: outage.payload_json!,
                                })}
                                title="Inspecionar snapshot JSON da falha"
                                className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-all inline-flex items-center gap-1"
                              >
                                <Code size={14} />
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* SUB-MODAL DE INSPEÇÃO DE PAYLOAD */}
        {inspectingPayload && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div 
              className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                  {inspectingPayload.title}
                </h3>
                <button
                  onClick={() => setInspectingPayload(null)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto">
                <pre>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(inspectingPayload.json), null, 2);
                    } catch {
                      return inspectingPayload.json;
                    }
                  })()}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setInspectingPayload(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
