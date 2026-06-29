// src/app/reports/page.tsx
'use client'
import { useState, useEffect } from 'react';
import { Loader2, FileDown, Calendar, Server, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';

interface HostReport {
  instance: string;
  nodename: string;
  cpu: number;
  mem: number;
  network: number;
}

export default function ReportsPage() {
  const [data, setData] = useState<HostReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const itemsPerPage = 10;

  // Busca de dados do relatório
  const fetchReportData = async (selectedRange: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports?range=${selectedRange}`);
      const json = await response.json();
      if (json.success) {
        setData(json.data);
      } else {
        console.error("Erro no retorno da API:", json.error);
        setData([]);
      }
    } catch (e) {
      console.error("Erro de rede ao carregar relatório:", e);
      setData([]);
    } finally {
      setLoading(false);
      setCurrentPage(1); // Reseta para primeira página ao trocar período
    }
  };

  useEffect(() => {
    fetchReportData(range);
  }, [range]);

  // Paginação
  const totalPages = Math.max(Math.ceil(data.length / itemsPerPage), 1);
  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Exportar dados para PDF (stub)
  const handleExportPDF = () => {
    console.log("Exportando relatório como PDF...");
    alert("Exportação como PDF iniciada. (Funcionalidade stub/em desenvolvimento)");
  };

  // Exportar dados para XLSX (stub)
  const handleExportXLSX = () => {
    console.log("Exportando relatório como XLSX...");
    alert("Exportação como XLSX iniciada. (Funcionalidade stub/em desenvolvimento)");
  };

  // Exportar dados para CSV
  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = ['Hostname', 'Instancia (Prometheus)', 'Média CPU (%)', 'Média Memória (%)', 'Tráfego Rede Médio (MB/s)'];
    
    const rows = data.map(item => [
      item.nodename,
      item.instance,
      item.cpu.toFixed(2),
      item.mem.toFixed(2),
      item.network.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_utilizacao_hosts_${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="space-y-8">
      {/* CABEÇALHO DA TELA */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Relatório de Utilização</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Histórico de utilização média de Hosts</p>
          </div>
        </div>
        
        {data.length > 0 && !loading && (
          <div 
            className="relative"
            onMouseLeave={() => setIsExportOpen(false)}
          >
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl transition shadow-md text-[10px] font-black uppercase tracking-widest active:scale-95 cursor-pointer"
            >
              <FileDown size={14} />
              Exportar Relatório
            </button>
            
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button 
                  onClick={() => {
                    handleExportPDF();
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  Exportar como PDF
                </button>
                <button 
                  onClick={() => {
                    handleExportCSV();
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  Exportar como CSV
                </button>
                <button 
                  onClick={() => {
                    handleExportXLSX();
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  Exportar como XLSX
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* FILTROS E PARÂMETROS */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500">
            <Calendar size={18} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Período de Análise</label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="mt-1 block w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
            >
              <option value="30d">Últimos 30 dias</option>
              <option value="60d">Últimos 60 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-xl">
          <Server size={14} className="text-slate-400" />
          <span>Hosts Identificados no Período: <strong>{data.length}</strong></span>
        </div>
      </section>

      {/* TABELA DE DADOS */}
      <section className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 space-y-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculando médias de banco histórico...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-20 bg-white rounded-3xl border border-slate-200/80 shadow-sm text-center px-4">
            <BarChart2 className="text-slate-300 mb-3" size={48} />
            <h3 className="text-sm font-bold text-slate-700">Nenhum dado retornado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">Não foi possível calcular as médias dos hosts. Verifique a conexão e as métricas do Prometheus.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hostname</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instância</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">CPU Média</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Memória Média</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tráfego de Rede Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedData.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-800 uppercase font-mono bg-slate-100/50 border border-slate-200/50 px-2 py-0.5 rounded">
                          {item.nodename}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {item.instance}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-bold ${item.cpu > 80 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {item.cpu.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-bold ${item.mem > 85 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {item.mem.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-slate-700">
                          {item.network.toFixed(2)} MB/s
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CONTROLES DE PAGINAÇÃO */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500">
                  Mostrando <strong className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</strong> a{' '}
                  <strong className="font-semibold text-slate-700">
                    {Math.min(currentPage * itemsPerPage, data.length)}
                  </strong>{' '}
                  de <strong className="font-semibold text-slate-700">{data.length}</strong> hosts
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center px-4 text-xs font-bold text-slate-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
