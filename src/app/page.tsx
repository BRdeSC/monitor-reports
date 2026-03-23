'use client'
import { useState, useEffect, useCallback } from 'react';
import MetricsTable from '@/components/MetricsTable';
import { Loader2, FileDown, Activity, RefreshCw, Search } from 'lucide-react';

export default function MetricsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [query, setQuery] = useState('up');
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);

  // 1. Carrega a lista de métricas disponíveis no servidor
  const fetchMetricsList = async () => {
    setLoadingMetrics(true);
    try {
      const response = await fetch('/api/metrics/list');
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
  const fetchMetricsData = useCallback(async (customQuery?: string, isManual = false) => {
    const activeQuery = customQuery || query;
    
    if (isManual) setIsRefreshing(true);
    else setLoading(true);

    try {
      // Chamando a rota /instant sem parâmetros de mês
      const url = `/api/metrics/instant?query=${encodeURIComponent(activeQuery)}`;
      const response = await fetch(url);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [query]);

  // Efeito inicial e Auto-refresh a cada 60 segundos
  useEffect(() => {
    fetchMetricsList();
    fetchMetricsData();

    const interval = setInterval(() => {
      fetchMetricsData(undefined, true);
    }, 60000); 

    return () => clearInterval(interval);
  }, [fetchMetricsData]);

  return (
    <main className="p-8 bg-gray-50 min-h-screen max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Explorador de Métricas</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Live Monitoring via Prometheus</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => fetchMetricsData(query, true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-[10px] font-black text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "ATUALIZANDO..." : "RECARREGAR DADOS"}
          </button>

          {data && (
            <button className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-black transition shadow-md text-[10px] font-black uppercase tracking-widest">
              <FileDown size={16} />
              Exportar Snapshot
            </button>
          )}
        </div>
      </header>

      {/* FILTRO DE BUSCA ÚNICO */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            <Search size={14} />
            Selecione a Métrica do Datacenter
          </label>
          <div className="relative">
            <select 
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                fetchMetricsData(e.target.value);
              }}
              disabled={loadingMetrics}
              className="w-full border-2 border-gray-50 p-4 rounded-2xl bg-gray-50 focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-mono text-sm appearance-none cursor-pointer transition-all"
            >
              {loadingMetrics ? (
                <option>Carregando catálogo do servidor...</option>
              ) : (
                availableMetrics.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))
              )}
            </select>
          </div>
        </div>
      </section>

      {/* ÁREA DE RESULTADOS */}
      <section className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 space-y-4 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Consultando Banco de Dados...</span>
          </div>
        ) : (
          <MetricsTable data={data} />
        )}
      </section>
    </main>
  );
}