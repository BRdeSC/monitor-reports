'use client'
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Server, Layers, ListOrdered, RefreshCw, Clock, ArrowUpRight, LayoutGrid, Rows } from 'lucide-react';
import CustomGauge from '@/components/GaugeChart';

export default function PerformancePage() {
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'stack'>('grid');

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

  const isGrid = layoutMode === 'grid';

  return (
    <main className="space-y-8 pb-20 w-full">
      {/* CABEÇALHO DA PÁGINA */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 w-full">
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

        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {/* Alternador de Layout */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                isGrid 
                  ? 'bg-white text-blue-600 shadow-sm font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Modo Lado a Lado (Grid)"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setLayoutMode('stack')}
              className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                !isGrid 
                  ? 'bg-white text-blue-600 shadow-sm font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Modo Um Abaixo do Outro (Stack)"
            >
              <Rows size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 text-xs bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
            <Clock size={14} className="text-slate-400" />
            <span className="font-medium">Atualizado: {lastUpdate}</span>
          </div>

          <button 
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "ATUALIZANDO..." : "ATUALIZAR AGORA"}
          </button>
        </div>
      </header>

      {/* SEÇÃO DOS CLUSTERS (DINÂMICO) */}
      <div className={isGrid ? "grid grid-cols-1 xl:grid-cols-2 gap-6 items-start w-full" : "flex flex-col gap-6 w-full"}>
        
        {/* SEÇÃO JACI */}
        <section className={`animate-in fade-in duration-500 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-5 transition-all w-full ${
          isGrid ? 'p-5 md:p-6' : 'p-4 sm:p-5'
        }`}>
          <HeaderSection icon={<Server size={20}/>} title="Cluster Jaci (HPC - PBS)" color="bg-blue-600" />
          
          {/* Grid de CPU / Memória */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard 
              title="Uso de CPU" 
              value={res.jaci_cpu} 
              isPercentage 
              color="text-blue-600"
              compact={!isGrid}
            >
              <div className={!isGrid ? "w-[150px] h-[105px] flex items-center justify-center overflow-hidden -mr-2" : "w-[180px] h-[125px] flex items-center justify-center overflow-hidden -mr-2"}>
                <CustomGauge value={Number(res.jaci_cpu || 0)} width={!isGrid ? 170 : 200} height={!isGrid ? 110 : 130} />
              </div>
            </StatCard>

            <StatCard 
              title="Uso de Memória" 
              value={res.jaci_mem} 
              isPercentage 
              color="text-blue-600"
              compact={!isGrid}
            >
              <div className={!isGrid ? "w-[150px] h-[105px] flex items-center justify-center overflow-hidden -mr-2" : "w-[180px] h-[125px] flex items-center justify-center overflow-hidden -mr-2"}>
                <CustomGauge value={Number(res.jaci_mem || 0)} width={!isGrid ? 170 : 200} height={!isGrid ? 110 : 130} />
              </div>
            </StatCard>
          </div>

          {/* Grid de Métricas Secundárias / Nodes */}
          <div className={`grid gap-3 ${
            isGrid 
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-3' 
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
          }`}>
            <BadgeCard title="Jobs Executando" value={res.jaci_running} status="success" compact={!isGrid} />
            <BadgeCard 
              title="Jobs em Fila" 
              value={parseInt(res.jaci_queued || 0) + parseInt(res.jaci_held || 0)} 
              status="warning" 
              compact={!isGrid}
            />
            <BadgeCard title="Nodes Totais" value={res.jaci_nodes_total} status="neutral" compact={!isGrid} />
            <BadgeCard title="Nodes Livres" value={res.jaci_nodes_free} status="success" compact={!isGrid} />
            <BadgeCard title="Nodes Ocupados" value={res.jaci_nodes_busy} status="info" compact={!isGrid} />
            <BadgeCard title="Nodes Inativos" value={res.jaci_nodes_down} status="danger" compact={!isGrid} />
          </div>

          {/* Filas */}
          <QueueTable title="Filas de Processamento (Jaci)" queues={res.jaci_queues} color="border-blue-100/50" layoutMode={layoutMode} />
        </section>

        {/* SEÇÃO EGEON */}
        <section className={`animate-in fade-in duration-500 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-5 transition-all w-full ${
          isGrid ? 'p-5 md:p-6' : 'p-4 sm:p-5'
        }`}>
          <HeaderSection icon={<Layers size={20}/>} title="Cluster Egeon (HPC - Slurm)" color="bg-purple-600" />
          
          {/* Grid de CPU / Memória */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard 
              title="Uso de CPU" 
              value={res.egeon_cpu} 
              isPercentage 
              color="text-purple-600"
              compact={!isGrid}
            >
              <div className={!isGrid ? "w-[150px] h-[105px] flex items-center justify-center overflow-hidden -mr-2" : "w-[180px] h-[125px] flex items-center justify-center overflow-hidden -mr-2"}>
                <CustomGauge value={Number(res.egeon_cpu || 0)} width={!isGrid ? 170 : 200} height={!isGrid ? 110 : 130} />
              </div>
            </StatCard>

            <StatCard 
              title="Uso de Memória" 
              value={res.egeon_mem} 
              isPercentage 
              color="text-purple-600"
              compact={!isGrid}
            >
              <div className={!isGrid ? "w-[150px] h-[105px] flex items-center justify-center overflow-hidden -mr-2" : "w-[180px] h-[125px] flex items-center justify-center overflow-hidden -mr-2"}>
                <CustomGauge value={Number(res.egeon_mem || 0)} width={!isGrid ? 170 : 200} height={!isGrid ? 110 : 130} />
              </div>
            </StatCard>
          </div>

          {/* Grid de Métricas Secundárias / Nodes */}
          <div className={`grid gap-3 ${
            isGrid 
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-3' 
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
          }`}>
            <BadgeCard title="Jobs Executando" value={res.egeon_running} status="success" compact={!isGrid} />
            <BadgeCard title="Jobs em Fila" value={res.egeon_queued} status="warning" compact={!isGrid} />
            <BadgeCard title="Nodes Totais" value={res.egeon_nodes_total} status="neutral" compact={!isGrid} />
            <BadgeCard title="Nodes Livres" value={res.egeon_nodes_free} status="success" compact={!isGrid} />
            <BadgeCard title="Nodes Ocupados" value={res.egeon_nodes_busy} status="info" compact={!isGrid} />
            <BadgeCard title="Nodes Inativos" value={res.egeon_nodes_down} status="danger" compact={!isGrid} />
          </div>

          {/* Filas */}
          <QueueTable title="Partições Slurm (Egeon)" queues={res.egeon_queues} color="border-purple-100/50" layoutMode={layoutMode} />
        </section>
      </div>
    </main>
  );
}

// COMPONENTES AUXILIARES INTERNOS

function HeaderSection({ icon, title, color }: any) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
      <div className={`p-2 ${color} text-white rounded-xl shadow-md shadow-slate-900/5`}>
        {icon}
      </div>
      <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
    </div>
  );
}

function StatCard({ title, value, color, isPercentage, compact, children }: any) {
  const numericValue = typeof value === 'string' ? parseFloat(value) : Number(value || 0);
  const displayValue = isPercentage ? numericValue.toFixed(1) : numericValue;
  const isCritical = title.toUpperCase().includes("CPU") && numericValue > 90;

  return (
    <div className={`rounded-2xl border transition-all duration-300 flex items-center justify-between overflow-hidden shadow-sm hover:shadow-md ${
      compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'
    }  ${
      isCritical 
        ? 'bg-red-50/60 border-red-200' 
        : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50'
    }`}>
      <div className="space-y-1">
        <p className={`font-bold uppercase tracking-[0.15em] ${
          compact ? 'text-[8px]' : 'text-[9px]'
        } ${
          isCritical ? 'text-red-600' : 'text-slate-400'
        }`}>
          {title} {isCritical && "⚠️ CRÍTICO"}
        </p>
        <p className={`font-extrabold tracking-tighter ${
          compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
        } ${isCritical ? 'text-red-700' : 'text-slate-800'}`}>
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

function BadgeCard({ title, value, status, compact }: { title: string; value: any; status: 'success' | 'warning' | 'danger' | 'info' | 'neutral', compact?: boolean }) {
  const statusConfig = {
    success: { bg: 'bg-emerald-50/60', border: 'border-emerald-200', text: 'text-emerald-700', valText: 'text-emerald-800' },
    warning: { bg: 'bg-amber-50/60', border: 'border-amber-200', text: 'text-amber-700', valText: 'text-amber-800' },
    danger: { bg: 'bg-rose-50/60', border: 'border-rose-200', text: 'text-rose-700', valText: 'text-rose-800' },
    info: { bg: 'bg-sky-50/60', border: 'border-sky-200', text: 'text-sky-700', valText: 'text-sky-800' },
    neutral: { bg: 'bg-slate-50/70', border: 'border-slate-200', text: 'text-slate-500', valText: 'text-slate-800' },
  };

  const current = statusConfig[status];

  return (
    <div className={`border hover:scale-[1.02] transition-transform duration-200 flex flex-col justify-between shadow-sm ${
      compact ? 'p-2.5 rounded-xl h-16' : 'p-3 rounded-xl h-20'
    } ${current.bg} ${current.border}`}>
      <span className={`font-bold uppercase tracking-wider truncate ${
        compact ? 'text-[8px]' : 'text-[9px]'
      } ${current.text}`}>{title}</span>
      <span className={`font-black ${
        compact ? 'text-lg' : 'text-xl'
      } ${current.valText}`}>{value ?? 0}</span>
    </div>
  );
}

function QueueTable({ title, queues, color, layoutMode }: any) {
  if (!queues || queues.length === 0) return null;
  const isGrid = layoutMode === 'grid';
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className={`bg-slate-50 border-b border-slate-100 flex items-center gap-2 ${
        isGrid ? 'px-4 py-2.5' : 'px-3.5 py-2'
      }`}>
        <ListOrdered size={14} className="text-slate-400" />
        <h3 className={`font-bold text-slate-500 uppercase tracking-widest ${
          isGrid ? 'text-[10px]' : 'text-[9px]'
        }`}>{title}</h3>
      </div>
      <div className={`grid gap-px bg-slate-200 ${
        isGrid 
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-3' 
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
      }`}>
        {queues.map((q: any) => (
          <div key={q.name} className={`bg-white flex flex-col items-center justify-center hover:bg-slate-50/80 transition-colors group relative ${
            isGrid ? 'p-3' : 'p-2'
          }`}>
            <span className={`font-bold text-slate-400 uppercase mb-0.5 tracking-tight group-hover:text-blue-600 transition-colors ${
              isGrid ? 'text-[9px]' : 'text-[8px]'
            }`}>{q.name}</span>
            <span className={`font-extrabold text-slate-700 ${
              isGrid ? 'text-lg' : 'text-base'
            }`}>{q.value}</span>
            <ArrowUpRight size={10} className="absolute top-1.5 right-1.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  );
}