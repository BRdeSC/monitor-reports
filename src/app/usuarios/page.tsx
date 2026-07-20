'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Loader2, 
  RefreshCw, 
  Search, 
  Users, 
  Server, 
  Layers, 
  Clock, 
  AlertCircle,
  Calendar
} from 'lucide-react';

interface UserMetric {
  username: string;
  cluster: 'jaci' | 'egeon';
  coresUsed: number;
}

export default function UsuariosPage() {
  const [data, setData] = useState<UserMetric[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [clusterFilter, setClusterFilter] = useState<'all' | 'jaci' | 'egeon'>('all');
  const [range, setRange] = useState('30d');

  // Fetch metrics data
  const fetchUserData = useCallback(async (manual = false, selectedRange = range) => {
    if (manual) setIsRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const response = await fetch(`/metrics/api/metrics/users?range=${selectedRange}`);
      if (!response.ok) {
        throw new Error('Falha ao obter dados da API');
      }
      const json = await response.json();
      setData(json);
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
    } catch (err: any) {
      console.error('Erro ao buscar dados de usuários:', err);
      setError(err.message || 'Erro de conexão com a API');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [range]);

  // Load and refresh when range changes
  useEffect(() => {
    fetchUserData(false, range);
    const interval = setInterval(() => fetchUserData(true, range), 30000);
    return () => clearInterval(interval);
  }, [fetchUserData, range]);

  // Compute KPI card statistics
  const stats = useMemo(() => {
    if (!data) return { activeUsers: 0, jaciCores: 0, egeonCores: 0 };
    
    const uniqueUsers = new Set(data.map(item => item.username)).size;
    const jaciCores = data
      .filter(item => item.cluster === 'jaci')
      .reduce((sum, item) => sum + item.coresUsed, 0);
    const egeonCores = data
      .filter(item => item.cluster === 'egeon')
      .reduce((sum, item) => sum + item.coresUsed, 0);

    return { 
      activeUsers: uniqueUsers, 
      jaciCores: parseFloat(jaciCores.toFixed(1)), 
      egeonCores: parseFloat(egeonCores.toFixed(1)) 
    };
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(item => {
      const matchesSearch = item.username.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCluster = clusterFilter === 'all' || item.cluster === clusterFilter;
      return matchesSearch && matchesCluster;
    });
  }, [data, searchTerm, clusterFilter]);

  // Max cores for progress bar scaling
  const maxCores = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(item => item.coresUsed), 0.1);
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={44} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando métricas de usuários...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-red-100 shadow-sm max-w-2xl mx-auto mt-10">
        <div className="flex justify-center text-red-500 mb-4">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Ops! Ocorreu um erro</h2>
        <p className="text-red-500 font-medium mb-6">{error}</p>
        <button 
          onClick={() => fetchUserData(false, range)} 
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-500/10 cursor-pointer"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <main className="space-y-8 pb-20 w-full animate-in fade-in duration-300">
      {/* CABEÇALHO DA PÁGINA */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 w-full">
        <div>
          <h1 className="text-3xl font-black text-slate-400 tracking-tighter uppercase">Usuários</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Histórico de consumo médio de CPU por cluster
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {/* Hora de atualização */}
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-slate-500 text-xs bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
              <Clock size={14} className="text-slate-400" />
              <span className="font-semibold">Atualizado: {lastUpdate}</span>
            </div>
          )}

          {/* Botão de atualização */}
          <button 
            onClick={() => fetchUserData(true, range)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "ATUALIZANDO..." : "ATUALIZAR AGORA"}
          </button>
        </div>
      </header>

      {/* CARDS DE RESUMO (KPIs) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Usuários */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Usuários Ativos (Período)</span>
            <span className="text-3xl font-black text-slate-800 block">{stats.activeUsers}</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={22} />
          </div>
        </div>

        {/* Card 2: Cores Jaci */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Cores Médios - Jaci</span>
            <span className="text-3xl font-black text-slate-800 block">{stats.jaciCores}</span>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Server size={22} />
          </div>
        </div>

        {/* Card 3: Cores Egeon */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Cores Médios - Egeon</span>
            <span className="text-3xl font-black text-slate-800 block">{stats.egeonCores}</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Layers size={22} />
          </div>
        </div>
      </section>

      {/* FILTROS E BUSCA */}
      <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Input de Busca */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuário..."
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 outline-none text-slate-800 text-sm font-medium transition-all shadow-inner"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
          {/* Seletor de Período */}
          <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
            <Calendar size={14} className="text-slate-500" />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="1d">Último 1 dia</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="60d">Últimos 60 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
          </div>

          {/* Seletor de Cluster */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setClusterFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                clusterFilter === 'all' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setClusterFilter('jaci')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                clusterFilter === 'jaci' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Jaci (PBS)
            </button>
            <button
              onClick={() => setClusterFilter('egeon')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                clusterFilter === 'egeon' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Egeon (Slurm)
            </button>
          </div>
        </div>
      </section>

      {/* TABELA DE USUÁRIOS */}
      <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="text-center py-20">
            <Users className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">
              Nenhum usuário correspondente encontrado
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuário</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cluster</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Cores Médios</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-1/3">Impacto / Proporção de Uso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item, index) => {
                  const percentage = maxCores > 0 ? (item.coresUsed / maxCores) * 100 : 0;
                  
                  // Color variants for progress bar and badges based on cluster
                  const isJaci = item.cluster === 'jaci';
                  const barColor = isJaci ? 'bg-sky-500' : 'bg-purple-500';
                  const badgeStyle = isJaci 
                    ? 'bg-sky-50 text-sky-700 border-sky-200' 
                    : 'bg-purple-50 text-purple-700 border-purple-200';

                  return (
                    <tr 
                      key={`${item.username}-${item.cluster}-${index}`}
                      className="hover:bg-slate-50/50 transition-colors duration-150"
                    >
                      {/* Nome do Usuário */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-extrabold text-slate-800 text-sm tracking-tight block uppercase">
                          {item.username}
                        </span>
                      </td>

                      {/* Cluster */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide border ${badgeStyle}`}>
                          {isJaci ? 'Jaci (PBS)' : 'Egeon (Slurm)'}
                        </span>
                      </td>

                      {/* Cores Alocados */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="font-black text-slate-800 text-base">
                          {item.coresUsed.toFixed(1)}
                        </span>
                      </td>

                      {/* Proporção de Uso */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/30">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-500 min-w-[32px] text-right">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}