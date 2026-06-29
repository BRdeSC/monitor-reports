'use client'
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Server, Layers, ListOrdered, RefreshCw, Clock, ArrowUpRight } from 'lucide-react';
import CustomGauge from '@/components/GaugeChart';

export default function PerformancePage() {
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Função para buscar dados
  const fetchData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const response = await fetch('/api/metrics/performance');
      const json = await response.json();
      if (json.success) {
        setRes(json.data);
        setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
      }
    } catch (e) {
      console.error("Erro na atualização:", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sincronizando com HPC...</p>
    </div>
  );

  if (!res) return (
    <div className="p-12 text-center bg-white rounded-3xl border border-red-100 shadow-sm">
      <p className="text-red-500 font-bold">Falha ao carregar dados do Prometheus.</p>
      <button 
        onClick={() => fetchData()} 
        className="mt-4 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition-all"
      >
        Tentar Novamente
      </button>
    </div>
  );

  return (
    <main className="space-y-8 pb-20">
      {/* CABEÇALHO DA PÁGINA */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Status do Ambiente</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Estado operacional dos clusters</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
            <Clock size={14} className="text-slate-400" />
            <span className="font-medium">Atualizado: {lastUpdate}</span>
          </div>

          <button 
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-blue-500/10"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "ATUALIZANDO..." : "ATUALIZAR AGORA"}
          </button>
        </div>
      </header>

      {/* SEÇÃO JACI */}
      <section className="animate-in fade-in duration-500 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <HeaderSection icon={<Server size={20}/>} title="Cluster Jaci (HPC - PBS)" color="bg-blue-600" />
        
        {/* Grid de CPU / Memória */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard 
            title="Uso de CPU" 
            value={res.jaci_cpu} 
            isPercentage 
            color="text-blue-600"
          >
            <div className="w-[180px] h-[125px] flex items-center justify-center overflow-hidden -mr-2">
              <CustomGauge value={Number(res.jaci_cpu || 0)} />
            </div>
          </StatCard>

          <StatCard 
            title="Uso de Memória" 
            value={res.jaci_mem} 
            isPercentage 
            color="text-blue-600"
          >
            <div className="w-[180px] h-[125px] flex items-center justify-center overflow-hidden -mr-2">
              <CustomGauge value={Number(res.jaci_mem || 0)} />
            </div>
          </StatCard>
        </div>

        {/* Grid de Métricas Secundárias / Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <BadgeCard title="Jobs Executando" value={res.jaci_running} status="success" />
          <BadgeCard 
            title="Jobs em Fila" 
            value={parseInt(res.jaci_queued || 0) + parseInt(res.jaci_held || 0)} 
            status="warning" 
          />
          <BadgeCard title="Nodes Totais" value={res.jaci_nodes_total} status="neutral" />
          <BadgeCard title="Nodes Livres" value={res.jaci_nodes_free} status="success" />
          <BadgeCard title="Nodes Ocupados" value={res.jaci_nodes_busy} status="info" />
          <BadgeCard title="Nodes Inativos" value={res.jaci_nodes_down} status="danger" />
        </div>

        {/* Filas */}
        <QueueTable title="Filas de Processamento (Jaci)" queues={res.jaci_queues} color="border-blue-100/50" />
      </section>

      {/* SEÇÃO EGEON */}
      <section className="animate-in fade-in duration-500 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <HeaderSection icon={<Layers size={20}/>} title="Cluster Egeon (HPC - Slurm)" color="bg-purple-600" />
        
        {/* Grid de CPU / Memória */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard 
            title="Uso de CPU" 
            value={res.egeon_cpu} 
            isPercentage 
            color="text-purple-600"
          >
            <div className="w-[180px] h-[125px] flex items-center justify-center overflow-hidden -mr-2">
              <CustomGauge value={Number(res.egeon_cpu || 0)} />
            </div>
          </StatCard>

          <StatCard 
            title="Uso de Memória" 
            value={res.egeon_mem} 
            isPercentage 
            color="text-purple-600"
          >
            <div className="w-[180px] h-[125px] flex items-center justify-center overflow-hidden -mr-2">
              <CustomGauge value={Number(res.egeon_mem || 0)} />
            </div>
          </StatCard>
        </div>

        {/* Grid de Métricas Secundárias / Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <BadgeCard title="Jobs Executando" value={res.egeon_running} status="success" />
          <BadgeCard title="Jobs em Fila" value={res.egeon_queued} status="warning" />
          <BadgeCard title="Nodes Totais" value={res.egeon_nodes_total} status="neutral" />
          <BadgeCard title="Nodes Livres" value={res.egeon_nodes_free} status="success" />
          <BadgeCard title="Nodes Ocupados" value={res.egeon_nodes_busy} status="info" />
          <BadgeCard title="Nodes Inativos" value={res.egeon_nodes_down} status="danger" />
        </div>

        {/* Filas */}
        <QueueTable title="Partições Slurm (Egeon)" queues={res.egeon_queues} color="border-purple-100/50" />
      </section>
    </main>
  );
}

// COMPONENTES AUXILIARES INTERNOS

function HeaderSection({ icon, title, color }: any) {
  return (
    <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
      <div className={`p-2.5 ${color} text-white rounded-xl shadow-md shadow-slate-900/5`}>
        {icon}
      </div>
      <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
    </div>
  );
}

function StatCard({ title, value, color, isPercentage, children }: any) {
  const numericValue = typeof value === 'string' ? parseFloat(value) : Number(value || 0);
  const displayValue = isPercentage ? numericValue.toFixed(1) : numericValue;
  const isCritical = title.toUpperCase().includes("CPU") && numericValue > 90;

  return (
    <div className={`p-6 rounded-2xl border transition-all duration-300 flex items-center justify-between overflow-hidden shadow-sm hover:shadow-md ${
      isCritical 
        ? 'bg-red-50/60 border-red-200' 
        : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50'
    }`}>
      <div className="space-y-1.5">
        <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
          isCritical ? 'text-red-600' : 'text-slate-400'
        }`}>
          {title} {isCritical && "⚠️ CRÍTICO"}
        </p>
        <p className={`text-4xl font-extrabold tracking-tighter ${isCritical ? 'text-red-700' : 'text-slate-800'}`}>
          {displayValue}{isPercentage ? '%' : ''}
        </p>
      </div>

      {children && (
        <div className="relative">
          {children}
        </div>
      )}
    </div>
  );
}

function BadgeCard({ title, value, status }: { title: string; value: any; status: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  const statusConfig = {
    success: { bg: 'bg-emerald-50/60', border: 'border-emerald-200', text: 'text-emerald-700', valText: 'text-emerald-800' },
    warning: { bg: 'bg-amber-50/60', border: 'border-amber-200', text: 'text-amber-700', valText: 'text-amber-800' },
    danger: { bg: 'bg-rose-50/60', border: 'border-rose-200', text: 'text-rose-700', valText: 'text-rose-800' },
    info: { bg: 'bg-sky-50/60', border: 'border-sky-200', text: 'text-sky-700', valText: 'text-sky-800' },
    neutral: { bg: 'bg-slate-50/70', border: 'border-slate-200', text: 'text-slate-500', valText: 'text-slate-800' },
  };

  const current = statusConfig[status];

  return (
    <div className={`p-4 rounded-2xl border ${current.bg} ${current.border} hover:scale-[1.02] transition-transform duration-200 flex flex-col justify-between h-24 shadow-sm`}>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${current.text}`}>{title}</span>
      <span className={`text-2xl font-black ${current.valText}`}>{value ?? 0}</span>
    </div>
  );
}

function QueueTable({ title, queues, color }: any) {
  if (!queues || queues.length === 0) return null;
  
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm`}>
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <ListOrdered size={14} className="text-slate-400" />
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px bg-slate-200">
        {queues.map((q: any) => (
          <div key={q.name} className="bg-white p-4.5 flex flex-col items-center justify-center hover:bg-slate-50/80 transition-colors group relative">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-tight group-hover:text-blue-600 transition-colors">{q.name}</span>
            <span className="text-xl font-extrabold text-slate-700">{q.value}</span>
            <ArrowUpRight size={10} className="absolute top-2 right-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  );
}