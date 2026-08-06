'use client'

import { useState, useEffect, useCallback } from 'react';
import { 
  Server, 
  Cpu, 
  Layers, 
  Activity, 
  FileDown, 
  Search, 
  Loader2, 
  Calendar, 
  Wifi,
  TrendingUp,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  ReferenceLine, 
  Legend 
} from 'recharts';

interface HostMetricSeries {
  timestamp: number;
  value: number;
}

interface HostData {
  instance: string;
  nodename: string;
  hostname: string;
  environment: 'coids' | 'sesup' | 'dev';
  cpuMean: number;
  memMean: number;
  netMean: number;
  netPeakValue: number;
  netPeakTime: string;
  cpuSeries: HostMetricSeries[];
  memSeries: HostMetricSeries[];
  netSeries: HostMetricSeries[];
}

interface ApiResponse {
  success: boolean;
  isMock?: boolean;
  range: string;
  environment: string;
  timestamp: string;
  hosts: HostData[];
}

const LINE_COLORS = [
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#14b8a6', // Teal
  '#ef4444', // Red
  '#84cc16', // Lime
];

const DONUT_COLORS = {
  'Produção (COIDS)': '#10b981',      // Emerald
  'Homologação (SESUP)': '#06b6d4',    // Cyan
  'Desenvolvimento': '#6366f1',       // Indigo
};

// Helper function to format timestamp inside charts
const formatChartTime = (timestamp: number, selectedRange: string) => {
  const date = new Date(timestamp * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);

  return (selectedRange === '1h' || selectedRange === '24h') 
    ? `${h}:${min}` 
    : `${d}/${m} ${h}:${min}`;
};

// Custom interactive tooltip with dynamic sorting based on rankingType (crescent/decrescent)
const CustomTooltip = ({ active, payload, label, unit = '', rankingType = 'top_max' }: any) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload].sort((a, b) => {
      return rankingType === 'top_max' 
        ? b.value - a.value 
        : a.value - b.value;
    });
    
    return (
      <div className="bg-[#0c101d]/95 border border-slate-800/80 p-4 rounded-xl shadow-2xl backdrop-blur-sm max-h-[300px] overflow-y-auto">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">{label}</p>
        <div className="space-y-1.5 text-[11px] min-w-[160px]">
          {sortedPayload.map((item: any) => (
            <div key={item.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.stroke }}></div>
                <span className="font-semibold text-slate-300 font-mono">{String(item.name).toUpperCase()}</span>
              </div>
              <span className="font-black text-white">{item.value.toFixed(item.value >= 10 ? 1 : 2)}{unit}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardsPage() {
  const [mounted, setMounted] = useState(false);
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Global Filters
  const [range, setRange] = useState('7d');
  const [environment, setEnvironment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Local Ranking Filters (Per Chart)
  const [cpuRanking, setCpuRanking] = useState<'top_max' | 'top_min'>('top_max');
  const [memRanking, setMemRanking] = useState<'top_max' | 'top_min'>('top_max');
  const [netRanking, setNetRanking] = useState<'top_max' | 'top_min'>('top_max');

  // Prevent Next.js hydration issues with Recharts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch telemetry metrics
  const fetchDashboardData = useCallback(async (selectedRange: string, selectedEnv: string, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        range: selectedRange,
        environment: selectedEnv,
        search
      });
      const response = await fetch(`/metrics/api/dashboards/metrics?${params.toString()}`);
      const json = await response.json();
      if (json.success) {
        setApiData(json);
      } else {
        console.error("Erro na resposta da API:", json.error);
      }
    } catch (e) {
      console.error("Erro ao buscar dados do dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(range, environment, searchQuery);
  }, [range, environment, searchQuery, fetchDashboardData]);

  // Export PDF presentation (aligned to CPU Ranking selection)
  const handleExportPDF = () => {
    const params = new URLSearchParams({
      range,
      environment,
      search: searchQuery,
      comparison: cpuRanking
    });
    window.open(`/metrics/api/dashboards/export?${params.toString()}`, '_blank');
  };

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-[#090D1A] min-h-screen text-slate-400">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
        <p className="text-xs font-bold uppercase tracking-widest">Carregando painel...</p>
      </div>
    );
  }

  // --- Frontend logic to filter, sort and process data ---
  const hosts = apiData?.hosts || [];

  // 1. Calculate Top 10 CPU lists based on cpuRanking
  const top10CpuHosts = [...hosts]
    .sort((a, b) => cpuRanking === 'top_max' ? b.cpuMean - a.cpuMean : a.cpuMean - b.cpuMean)
    .slice(0, 10);

  // 2. Calculate Top 10 Memory lists based on memRanking
  const top10MemHosts = [...hosts]
    .sort((a, b) => memRanking === 'top_max' ? b.memMean - a.memMean : a.memMean - b.memMean)
    .slice(0, 10);

  // 3. Calculate Top 10 Network lists based on netRanking
  const top10NetHosts = [...hosts]
    .sort((a, b) => netRanking === 'top_max' ? b.netMean - a.netMean : a.netMean - b.netMean)
    .slice(0, 10);

  // 4. Build aligned Timeseries for CPU
  const cpuChartMap: Record<number, any> = {};
  top10CpuHosts.forEach(h => {
    h.cpuSeries.forEach(pt => {
      if (!cpuChartMap[pt.timestamp]) {
        cpuChartMap[pt.timestamp] = {
          timestamp: pt.timestamp,
          formattedTime: formatChartTime(pt.timestamp, range),
        };
      }
      cpuChartMap[pt.timestamp][h.hostname] = pt.value;
    });
  });
  const cpuChartData = Object.values(cpuChartMap).sort((a: any, b: any) => a.timestamp - b.timestamp);

  // 5. Build aligned Timeseries for Memory
  const memChartMap: Record<number, any> = {};
  top10MemHosts.forEach(h => {
    h.memSeries.forEach(pt => {
      if (!memChartMap[pt.timestamp]) {
        memChartMap[pt.timestamp] = {
          timestamp: pt.timestamp,
          formattedTime: formatChartTime(pt.timestamp, range),
        };
      }
      memChartMap[pt.timestamp][h.hostname] = pt.value;
    });
  });
  const memChartData = Object.values(memChartMap).sort((a: any, b: any) => a.timestamp - b.timestamp);

  // 6. Build aligned Timeseries for Network
  const netChartMap: Record<number, any> = {};
  top10NetHosts.forEach(h => {
    h.netSeries.forEach(pt => {
      if (!netChartMap[pt.timestamp]) {
        netChartMap[pt.timestamp] = {
          timestamp: pt.timestamp,
          formattedTime: formatChartTime(pt.timestamp, range),
        };
      }
      netChartMap[pt.timestamp][h.hostname] = pt.value;
    });
  });
  const netChartData = Object.values(netChartMap).sort((a: any, b: any) => a.timestamp - b.timestamp);

  // 7. Calculate KPI Cards (Top 4)
  const totalHosts = hosts.length;

  const maxCpuHost = hosts.length > 0 
    ? [...hosts].sort((a, b) => b.cpuMean - a.cpuMean)[0] 
    : null;

  const maxMemHost = hosts.length > 0 
    ? [...hosts].sort((a, b) => b.memMean - a.memMean)[0] 
    : null;

  const peakNetHost = hosts.length > 0
    ? [...hosts].sort((a, b) => b.netPeakValue - a.netPeakValue)[0]
    : null;

  // 8. Calculate Load Distribution for Donut Chart
  const envCpuTotals: Record<string, number> = { coids: 0, sesup: 0, dev: 0 };
  const envHostCounts: Record<string, number> = { coids: 0, sesup: 0, dev: 0 };
  hosts.forEach(h => {
    const env = h.environment;
    envHostCounts[env]++;
    envCpuTotals[env] += h.cpuMean;
  });
  const totalCpuProportion = envCpuTotals.coids + envCpuTotals.sesup + envCpuTotals.dev;
  const loadDistribution = [
    { 
      name: 'Produção (COIDS)', 
      value: totalCpuProportion > 0 ? Math.round((envCpuTotals.coids / totalCpuProportion) * 100) : 0, 
      hosts: envHostCounts.coids 
    },
    { 
      name: 'Homologação (SESUP)', 
      value: totalCpuProportion > 0 ? Math.round((envCpuTotals.sesup / totalCpuProportion) * 100) : 0, 
      hosts: envHostCounts.sesup 
    },
    { 
      name: 'Desenvolvimento', 
      value: totalCpuProportion > 0 ? Math.round((envCpuTotals.dev / totalCpuProportion) * 100) : 0, 
      hosts: envHostCounts.dev 
    },
  ];

  return (
    <div className="min-h-full bg-[#080B11] text-slate-100 p-6 md:p-8 rounded-3xl border border-slate-900 shadow-2xl space-y-8">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Apresentação Executiva
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
            Dashboard Executivo de Infraestrutura
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-medium">
            Visão consolidada de desempenho e consumo de recursos por ambiente
          </p>
        </div>

        <button 
          onClick={handleExportPDF}
          disabled={loading || hosts.length === 0}
          className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-blue-500/15 active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <FileDown size={15} />
          Exportar Apresentação (PDF)
        </button>
      </header>

      {/* FILTER BAR */}
      <section className="bg-[#0F1524]/60 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl shadow-lg flex flex-col xl:flex-row xl:items-end justify-between gap-5">
        <div className="flex flex-wrap items-end gap-5 flex-1">
          
          {/* Período de Análise */}
          <div className="flex flex-col gap-2 w-full sm:w-56">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={12} className="text-slate-500" />
              Período de Análise
            </label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="w-full bg-[#162035] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="1h">Última 1 hora</option>
              <option value="24h">Últimas 24h</option>
              <option value="7d">Última 1 semana</option>
              <option value="30d">Último 1 mês</option>
            </select>
          </div>

          {/* Separador por Ambiente */}
          <div className="flex flex-col gap-2 w-full sm:w-64">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers size={12} className="text-slate-500" />
              Separador por Ambiente
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full bg-[#162035] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="coids">Produção (COIDS)</option>
              <option value="sesup">Homologação (SESUP)</option>
              <option value="dev">Desenvolvimento</option>
            </select>
          </div>

          {/* Buscar Hostname */}
          <div className="flex flex-col gap-2 w-full sm:w-72">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Search size={12} className="text-slate-500" />
              Buscar Hostname
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: cn_ ou n01..."
                className="w-full bg-[#162035] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

        </div>

        {!loading && apiData && (
          <div className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800/30 border border-slate-800 px-4 py-2.5 rounded-xl self-start xl:self-auto flex items-center gap-2">
            <Server size={12} />
            <span>Hosts Analisados: <strong className="text-white">{totalHosts}</strong></span>
          </div>
        )}
      </section>

      {/* RENDER BODY CONTAINER (LOADING OR CHARTS) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-48 bg-[#0F1524]/30 border border-slate-850 rounded-2xl">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={44} />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sincronizando métricas do Prometheus...</p>
        </div>
      ) : hosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-[#0F1524]/30 border border-slate-850 rounded-2xl text-center px-6">
          <Info className="text-slate-500 mb-4" size={40} />
          <p className="text-slate-300 font-bold">Nenhum host encontrado para os filtros selecionados.</p>
          <p className="text-slate-500 text-xs mt-1">Experimente mudar o termo de busca ou o ambiente para recarregar.</p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">

          {/* EXECUTIVE KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* KPI 1: Active Hosts */}
            <div className="bg-[#0F1524]/75 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700/80 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors"></div>
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Server size={18} />
                </div>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  100% OK
                </span>
              </div>
              <div className="mt-4">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Total de Hosts Ativos</p>
                <p className="text-3xl font-black text-white mt-1">{totalHosts}</p>
              </div>
            </div>

            {/* KPI 2: Max CPU Consumer */}
            <div className="bg-[#0F1524]/75 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700/80 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-purple-500/10 transition-colors"></div>
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Cpu size={18} />
                </div>
                {maxCpuHost && (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 max-w-[120px] truncate font-mono">
                    {maxCpuHost.hostname}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Maior Consumo CPU</p>
                <p className="text-3xl font-black text-white mt-1">
                  {maxCpuHost ? `${maxCpuHost.cpuMean.toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>

            {/* KPI 3: Max Memory Consumer */}
            <div className="bg-[#0F1524]/75 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700/80 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-cyan-500/10 transition-colors"></div>
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
                  <Layers size={18} />
                </div>
                {maxMemHost && (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 max-w-[120px] truncate font-mono">
                    {maxMemHost.hostname}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Maior Consumo Memória</p>
                <p className="text-3xl font-black text-white mt-1">
                  {maxMemHost ? `${maxMemHost.memMean.toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>

            {/* KPI 4: Peak Network Traffic */}
            <div className="bg-[#0F1524]/75 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700/80 transition-all cursor-help">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-indigo-500/10 transition-colors"></div>
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Wifi size={18} />
                </div>
                <div className="flex items-center gap-1 text-[8px] text-slate-400 font-extrabold uppercase bg-slate-800/40 px-2 py-0.5 rounded border border-slate-700/50">
                  <Info size={9} />
                  Pico
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Pico Tráfego de Rede</p>
                <p className="text-3xl font-black text-white mt-1">
                  {peakNetHost ? `${peakNetHost.netPeakValue.toFixed(2)}` : '0.00'}{' '}
                  <span className="text-xs font-bold text-slate-400">MB/s</span>
                </p>
              </div>
              
              {/* Tooltip on hover */}
              {peakNetHost && (
                <div className="absolute inset-0 bg-[#0F1524]/95 border border-slate-700 rounded-2xl p-4 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <p className="text-[8px] font-black uppercase text-indigo-400 tracking-wider">Identificação do Pico</p>
                  <p className="text-xs font-bold text-white mt-1.5">Host: <span className="font-mono text-slate-200">{peakNetHost.hostname}</span></p>
                  <p className="text-[10px] text-slate-400 mt-1">Registrado em: {peakNetHost.netPeakTime}</p>
                </div>
              )}
            </div>

          </div>

          {/* GRID DE GRÁFICOS (2x2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* CHART 1: CPU USAGE */}
            <div className="bg-[#0F1524]/75 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col h-[380px]">
              <div className="flex justify-between items-center pb-4 mb-2 border-b border-slate-800/40">
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-purple-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-white">Uso de CPU (%)</h3>
                </div>
                
                {/* Individual Selector */}
                <select
                  value={cpuRanking}
                  onChange={(e) => setCpuRanking(e.target.value as 'top_max' | 'top_min')}
                  className="bg-[#162035] text-[10px] text-slate-200 font-extrabold uppercase tracking-wider rounded-lg px-2.5 py-1.5 border border-slate-800/60 focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="top_max">🔥 Top 10 Maiores</option>
                  <option value="top_min">❄️ Top 10 Menores</option>
                </select>
              </div>

              <div className="flex-1 w-full text-xs min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cpuChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937/40" vertical={false} />
                    <XAxis dataKey="formattedTime" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" domain={[0, 100]} tickLine={false} />
                    
                    <Tooltip content={<CustomTooltip unit="%" rankingType={cpuRanking} />} />
                    
                    {/* Alert reference lines */}
                    <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '90% Crítico', fill: '#ef4444', fontSize: 9, position: 'insideTopLeft' }} />
                    <ReferenceLine y={70} stroke="#d97706" strokeDasharray="4 4" label={{ value: '70% Alerta', fill: '#d97706', fontSize: 9, position: 'insideTopLeft' }} />
                    
                    {top10CpuHosts.map((h, idx) => (
                      <Line 
                        key={h.instance}
                        type="monotone" 
                        dataKey={h.hostname} 
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]} 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 4 }} 
                        name={h.hostname}
                      />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 2: MEMORY RAM CONSUMPTION */}
            <div className="bg-[#0F1524]/75 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col h-[380px]">
              <div className="flex justify-between items-center pb-4 mb-2 border-b border-slate-800/40">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-cyan-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-white">Consumo de Memória RAM (%)</h3>
                </div>
                
                {/* Individual Selector */}
                <select
                  value={memRanking}
                  onChange={(e) => setMemRanking(e.target.value as 'top_max' | 'top_min')}
                  className="bg-[#162035] text-[10px] text-slate-200 font-extrabold uppercase tracking-wider rounded-lg px-2.5 py-1.5 border border-slate-800/60 focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="top_max">🔥 Top 10 Maiores</option>
                  <option value="top_min">❄️ Top 10 Menores</option>
                </select>
              </div>

              <div className="flex-1 w-full text-xs min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={memChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937/40" vertical={false} />
                    <XAxis dataKey="formattedTime" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" domain={[0, 100]} tickLine={false} />
                    
                    <Tooltip content={<CustomTooltip unit="%" rankingType={memRanking} />} />
                    
                    {top10MemHosts.map((h, idx) => (
                      <Line 
                        key={h.instance}
                        type="monotone" 
                        dataKey={h.hostname} 
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]} 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 4 }} 
                        name={h.hostname}
                      />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 3: NETWORK TRAFFIC */}
            <div className="bg-[#0F1524]/75 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col h-[380px]">
              <div className="flex justify-between items-center pb-4 mb-2 border-b border-slate-800/40">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-indigo-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-white">Tráfego de Rede (MB/s)</h3>
                </div>
                
                {/* Individual Selector */}
                <select
                  value={netRanking}
                  onChange={(e) => setNetRanking(e.target.value as 'top_max' | 'top_min')}
                  className="bg-[#162035] text-[10px] text-slate-200 font-extrabold uppercase tracking-wider rounded-lg px-2.5 py-1.5 border border-slate-800/60 focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="top_max">🔥 Top 10 Maiores</option>
                  <option value="top_min">❄️ Top 10 Menores</option>
                </select>
              </div>

              <div className="flex-1 w-full text-xs min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={netChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937/40" vertical={false} />
                    <XAxis dataKey="formattedTime" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} />
                    
                    <Tooltip content={<CustomTooltip unit=" MB/s" rankingType={netRanking} />} />
                    
                    {top10NetHosts.map((h, idx) => (
                      <Line 
                        key={h.instance}
                        type="monotone" 
                        dataKey={h.hostname} 
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]} 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 4 }} 
                        name={h.hostname}
                      />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 4: LOAD DISTRIBUTION BY ENVIRONMENT */}
            <div className="bg-[#0F1524]/75 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col h-[380px]">
              <div className="flex justify-between items-center pb-4 mb-2 border-b border-slate-800/40">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-white">Carga por Ambiente</h3>
                </div>
                <span className="text-[9px] text-slate-400 font-bold bg-[#162035] px-2.5 py-1 rounded">
                  Proporção de Recursos
                </span>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8 min-h-0">
                
                {/* Donut chart */}
                <div className="w-[180px] h-[180px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={loadDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {loadDistribution.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={DONUT_COLORS[entry.name as keyof typeof DONUT_COLORS] || '#64748b'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Carga Proporcional']}
                        contentStyle={{ backgroundColor: '#0c101d', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut Legend */}
                <div className="flex-1 space-y-3 w-full">
                  {loadDistribution.map((row: any, i: number) => {
                    const color = DONUT_COLORS[row.name as keyof typeof DONUT_COLORS] || '#64748b';
                    return (
                      <div key={i} className="flex justify-between items-center bg-slate-800/10 border border-slate-850 p-2.5 rounded-xl hover:bg-slate-800/20 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                          <span className="text-xs font-bold text-slate-200">{row.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-white">{row.value}%</span>
                          <p className="text-[9px] font-bold text-slate-500">{row.hosts} hosts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}