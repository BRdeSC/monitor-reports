'use client'
import { useState, useEffect, useCallback } from 'react';
import MetricsTable from '@/components/MetricsTable';
import { Loader2, FileDown, RefreshCw, Search } from 'lucide-react';

export default function MetricsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [query, setQuery] = useState('up');
  const [inputValue, setInputValue] = useState('up');
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);

  // 1. Carrega a lista de métricas disponíveis no servidor
  const fetchMetricsList = async () => {
    setLoadingMetrics(true);
    try {
      const response = await fetch('/metrics/api/metrics/list');
      const result = await response.json();
      if (result.status === 'success') {
        const sorted = (result.data as string[]).sort();
        setAvailableMetrics(sorted);
      }
    } catch (error) {
      console.error("Erro ao carregar catálogo:", error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // 2. Busca os dados da métrica selecionada (Tempo Real)
  const fetchMetricsData = useCallback(async (targetQuery: string, isManual = false) => {
    if (!targetQuery.trim()) return;

    if (isManual) setIsRefreshing(true);
    else setLoading(true);

    try {
      const url = `/metrics/api/metrics/instant?query=${encodeURIComponent(targetQuery)}`;
      const response = await fetch(url);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Carregar lista de métricas iniciais
  useEffect(() => {
    fetchMetricsList();
  }, []);

  // Efeito para carregar dados sempre que a query mudar
  useEffect(() => {
    fetchMetricsData(query);
  }, [query, fetchMetricsData]);

  // Auto-refresh a cada 60 segundos usando a query ativa
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetricsData(query, true);
    }, 60000); 

    return () => clearInterval(interval);
  }, [query, fetchMetricsData]);

  // Debounce do valor digitado
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.trim() && inputValue !== query) {
        setQuery(inputValue);
      }
    }, 800); // 800ms debounce
    return () => clearTimeout(timer);
  }, [inputValue, query]);

  // Submissão manual da busca
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setQuery(inputValue);
      fetchMetricsData(inputValue);
    }
  };

  // Exportar dados da tabela para CSV
  const handleExportCSV = () => {
    const results = data?.data?.result || [];
    if (results.length === 0) return;

    const headers = ['Hostname', 'IP/Instance', 'Métrica', 'Valor'];
    const rows = results.map((item: any) => {
      const metricName = item.metric.__name__ || 'query_result';
      const identifier = Object.entries(item.metric).find(
        ([key]) => !['__name__', 'instance', 'job', 'endpoint', 'service'].includes(key)
      );
      const hostname = identifier ? String(identifier[1]).toUpperCase() : '';
      const instance = item.metric.instance || '';
      const value = item.value?.[1] || '0';
      return [hostname, instance, metricName, value];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `metrics_snapshot_${query}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-400 tracking-tighter uppercase">Métricas Gerais</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live Monitoring via Prometheus</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchMetricsData(query, true)}
            disabled={isRefreshing || loading}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "ATUALIZANDO..." : "RECARREGAR DADOS"}
          </button>

          {data?.data?.result && data.data.result.length > 0 && (
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl transition shadow-md text-[10px] font-black uppercase tracking-widest active:scale-95"
            >
              <FileDown size={14} />
              Exportar Snapshot
            </button>
          )}
        </div>
      </header>

      {/* FILTRO DE BUSCA INTERATIVO */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
            <Search size={12} className="text-slate-400" />
            Selecione ou digite a métrica do datacenter
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input 
                type="text"
                list="metrics-catalog"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ex: node_load1, node_memory_Active_bytes, up"
                className="w-full border border-slate-200 p-3.5 rounded-xl bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 outline-none text-slate-800 font-mono text-sm transition-all shadow-inner"
              />
              {inputValue && (
                <button 
                  type="button"
                  onClick={() => setInputValue('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-base font-medium transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loadingMetrics}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
            >
              <Search size={14} />
              <span>BUSCAR</span>
            </button>
          </div>

          <datalist id="metrics-catalog">
            {availableMetrics.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          
          {loadingMetrics && (
            <p className="text-[10px] text-slate-400 italic">Sincronizando catálogo de métricas com o Prometheus...</p>
          )}
        </form>
      </section>

      {/* ÁREA DE RESULTADOS */}
      <section className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 space-y-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consultando Banco de Dados...</span>
          </div>
        ) : (
          <MetricsTable data={data} />
        )}
      </section>
    </main>
  );
}