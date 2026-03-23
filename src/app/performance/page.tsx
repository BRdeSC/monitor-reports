'use client'
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Server, Layers, Activity, ListOrdered, RefreshCw, Clock } from 'lucide-react';

export default function PerformancePage() {
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Função memorizada para buscar dados
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
    <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sincronizando com HPC...</p>
    </div>
  );

  if (!res) return <div className="p-10 text-center text-red-500 font-bold">Falha ao carregar dados do Prometheus.</div>;

  return (
    <main className="space-y-6 pb-20">
      {/* CABEÇALHO DE CONTROLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Monitoramento em Tempo Real</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Clock size={14} />
            <span className="text-xs font-medium">Última atualização: {lastUpdate}</span>
          </div>
        </div>

        <button 
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "ATUALIZANDO..." : "ATUALIZAR AGORA"}
        </button>
      </div>

      {/* SEÇÃO JACI */}
      <section className="animate-in fade-in duration-700">
        <HeaderSection icon={<Server size={22}/>} title="Jaci (HPC - PBS)" color="bg-blue-600" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Uso CPU" value={res.jaci_cpu} isPercentage color="text-blue-600" />
          <StatCard title="Nodes Totais" value={res.jaci_nodes_total} color="text-gray-900" />
          <StatCard title="Jobs Executando" value={res.jaci_running} color="text-emerald-600" />
          <StatCard title="Jobs em Fila" value={res.jaci_queued} color="text-orange-500" />
        </div>
        <QueueTable title="Filas de Processamento (Jaci)" queues={res.jaci_queues} color="border-blue-100" />
      </section>

      <hr className="border-gray-100" />

      {/* SEÇÃO EGEON */}
      <section className="animate-in fade-in duration-1000">
        <HeaderSection icon={<Layers size={22}/>} title="Egeon (HPC - Slurm)" color="bg-purple-600" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Uso CPU" value={res.egeon_cpu} isPercentage color="text-purple-600" />
          <StatCard title="Nodes Totais" value={res.egeon_nodes_total} color="text-gray-900" />
          <StatCard title="Jobs Executando" value={res.egeon_running} color="text-emerald-600" />
          <StatCard title="Jobs em Fila" value={res.egeon_queued} color="text-orange-500" />
        </div>
        <QueueTable title="Partições Slurm (Egeon)" queues={res.egeon_queues} color="border-purple-100" />
      </section>
    </main>
  );
}

// COMPONENTES AUXILIARES

function HeaderSection({ icon, title, color }: any) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className={`p-3 ${color} text-white rounded-2xl shadow-lg`}>{icon}</div>
      <h2 className="text-2xl font-black text-yellow-200 uppercase tracking-tighter">{title}</h2>
    </div>
  );
}

function StatCard({ title, value, color, isPercentage }: any) {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const isCritical = title === "Uso CPU" && numericValue > 90;

  return (
    <div className={`p-7 rounded-3xl border transition-all group shadow-sm hover:shadow-xl ${
      isCritical ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-white border-gray-100'
    }`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${
        isCritical ? 'text-red-600' : 'text-gray-800 group-hover:text-blue-500'
      }`}>
        {title} {isCritical && "⚠️ CRÍTICO"}
      </p>
      <p className={`text-5xl font-black tracking-tighter ${isCritical ? 'text-red-700' : color}`}>
        {Math.round(numericValue)}{isPercentage ? '%' : ''}
      </p>
    </div>
  );
}

function QueueTable({ title, queues, color }: any) {
  if (!queues || queues.length === 0) return null;
  return (
    <div className={`bg-white rounded-3xl border-2 ${color} overflow-hidden shadow-sm`}>
      <div className="px-6 py-4 bg-gray-50/50 border-b flex items-center gap-2">
        <ListOrdered size={16} className="text-gray-400" />
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-gray-100">
        {queues.map((q: any) => (
          <div key={q.name} className="bg-white p-5 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors">
            <span className="text-[10px] font-bold text-gray-700 uppercase mb-1">{q.name}</span>
            <span className="text-2xl font-black text-gray-800">{q.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}