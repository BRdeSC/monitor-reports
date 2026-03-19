'use client'
import { useState, useEffect } from 'react';
import MonthPicker from '@/components/MonthPicker';
import MetricsTable from '@/components/MetricsTable';
import { Loader2, FileDown, Activity, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  // Estados de seleção
  const [query, setQuery] = useState('up');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);

  // 1. Carrega a lista de métricas para o Select
  const fetchMetricsList = async () => {
    setLoadingMetrics(true);
    try {
      const response = await fetch('/api/metrics/list');
      const result = await response.json();
      if (result.status === 'success') {
        // Ordenamos alfabeticamente para facilitar a leitura no Select
        const sorted = (result.data as string[]).sort();
        setAvailableMetrics(sorted);
      }
    } catch (error) {
      console.error("Erro ao carregar lista:", error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // 2. Busca os dados da métrica selecionada
  const fetchMetricsData = async (month?: string, customQuery?: string) => {
    const activeMonth = month || selectedMonth;
    const activeQuery = customQuery || query;

    setLoading(true);
    try {
      const url = activeMonth 
        ? `/api/metrics?query=${activeQuery}&month=${activeMonth}&year=2026` 
        : `/api/metrics?query=${activeQuery}`;
        
      const response = await fetch(url);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsList();
    fetchMetricsData();
  }, []);

  return (
    <main className="p-8 bg-gray-50 min-h-screen max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-8 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Relatórios de Monitoramento</h1>
          <p className="text-gray-500 font-medium">Análise de métricas consolidadas</p>
        </div>
        
        {data && (
          <button className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition shadow-md font-semibold">
            <FileDown size={20} />
            Exportar PDF
          </button>
        )}
      </header>

      {/* FILTROS */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-home">
          
          {/* SELECT DE MÉTRICAS */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase">
              <Activity size={16} className="text-blue-500" />
              Escolha a Métrica
            </label>
            <div className="relative">
              <select 
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  fetchMetricsData(selectedMonth, e.target.value);
                }}
                disabled={loadingMetrics}
                className="w-full border-2 border-gray-100 p-3 rounded-xl bg-gray-50 focus:border-blue-500 focus:bg-white outline-none text-gray-900 appearance-none cursor-pointer"
              >
                {loadingMetrics ? (
                  <option>Carregando métricas...</option>
                ) : (
                  availableMetrics.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))
                )}
              </select>
              {/* Ícone de seta customizado para o select */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <RefreshCw size={16} className={loadingMetrics ? "animate-spin" : ""} />
              </div>
            </div>
          </div>

          {/* SELEÇÃO DO MÊS */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 uppercase">Período Mensal</label>
            <MonthPicker onChange={(m) => {
              setSelectedMonth(m);
              fetchMetricsData(m);
            }} />
          </div>
          
        </div>
      </section>

      {/* RESULTADOS */}
      <section className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 space-y-4 bg-white rounded-2xl border-2 border-dashed">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <span className="text-gray-600 font-bold">Acessando Prometheus...</span>
          </div>
        ) : (
          <MetricsTable data={data} />
        )}
      </section>
    </main>
  );
}