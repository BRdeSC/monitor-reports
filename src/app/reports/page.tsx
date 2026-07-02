// src/app/reports/page.tsx
'use client'
import { useState, useEffect, useRef } from 'react';
import { Loader2, FileDown, Calendar, Server, ChevronLeft, ChevronRight, BarChart2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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
  const [range, setRange] = useState('7d');
  const [environment, setEnvironment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const itemsPerPage = 10;

  // Sorting state (default is sorted by hostname A-Z)
  const [sortColumn, setSortColumn] = useState<'nodename' | 'cpu' | 'mem' | 'network'>('nodename');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Busca de dados do relatório
  const fetchReportData = async (selectedRange: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/metrics/api/reports?range=${selectedRange}`);
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

  // Handle header sorting click
  const handleSort = (column: 'nodename' | 'cpu' | 'mem' | 'network') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'nodename' ? 'asc' : 'desc'); // padrão asc para hostname, desc para métricas
    }
  };

  // Filtragem de Ambiente e Busca por Hostname
  const filteredData = data.filter(item => {
    // Busca por Hostname
    if (searchQuery.trim() !== '') {
      const matchesSearch = item.nodename.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }

    // Filtragem de Ambiente (COIDS vs SESUP)
    if (environment === 'all') return true;
    
    const name = item.nodename.toLowerCase();
    const inst = item.instance.toLowerCase();
    
    // Data Center COIDS: contêm ".COIDS.INPE.BR" ou IPs do bloco do COIDS (ex: 150.163.212.*, 150.163.214.*)
    const isCoids = name.includes('.coids.inpe.br') || 
                    inst.includes('.coids.inpe.br') || 
                    /\b150\.163\.21[2-4]\./.test(inst);

    if (environment === 'coids') return isCoids;

    // Data Center SESUP: contêm ".CPTEC.INPE.BR" ou nomes específicos
    if (environment === 'sesup') {
      const sesupKeywords = ['areias', 'equinocio', 'oliveira', 'beberibe', 'trude', 'ouro', 'quilombo'];
      const isSesup = name.includes('.cptec.inpe.br') || 
                      inst.includes('.cptec.inpe.br') || 
                      sesupKeywords.some(kw => name.includes(kw)) ||
                      sesupKeywords.some(kw => inst.includes(kw));
      return isSesup;
    }
    
    return true;
  });

  // Ordenação dos dados filtrados
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortColumn === 'nodename') {
      return sortDirection === 'asc' 
        ? a.nodename.localeCompare(b.nodename)
        : b.nodename.localeCompare(a.nodename);
    }
    
    const valA = a[sortColumn];
    const valB = b[sortColumn];
    if (sortDirection === 'asc') {
      return valA - valB;
    } else {
      return valB - valA;
    }
  });

  // Paginação baseada nos dados filtrados e ordenados
  const totalPages = Math.max(Math.ceil(sortedData.length / itemsPerPage), 1);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reseta a página se a filtragem ou busca reduzir a quantidade de páginas
  useEffect(() => {
    setCurrentPage(1);
  }, [environment, searchQuery, sortColumn, sortDirection]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Dispara a exportação para o Route Handler correspondente
  const handleExport = async (format: 'pdf' | 'csv' | 'xlsx', scope: 'all' | 'top10') => {
    const exportItems = scope === 'all' ? sortedData : sortedData.slice(0, 10);
    if (exportItems.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    try {
      const response = await fetch('/metrics/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: exportItems,
          format,
          range,
          environment,
          searchQuery,
          scope
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na geração do arquivo');
      }

      // Trata a resposta como Blob conforme instrução (evita hashes temporários e arquivos corrompidos)
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_utilizacao.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro durante o download do relatório:", err);
      alert("Ocorreu um erro ao gerar o download. Tente novamente.");
    }
  };

  return (
    <main className="space-y-8 w-full">
      {/* CABEÇALHO DA TELA */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6 w-full">
        <div>
          <h1 className="text-3xl font-black text-slate-400 tracking-tighter uppercase">Relatório de Utilização</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Histórico de utilização média de Hosts</p>
          </div>
        </div>
        
        {sortedData.length > 0 && !loading && (
          <div 
            className="relative"
            ref={dropdownRef}
          >
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl transition shadow-md text-[10px] font-black uppercase tracking-widest active:scale-95 cursor-pointer"
            >
              <FileDown size={14} />
              Exportar Relatório
            </button>
            
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100">
                {/* Grupo Exportar Tudo */}
                <div className="px-4 pb-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Exportar Todos</span>
                  <div className="mt-1.5 space-y-1">
                    <button 
                      onClick={() => {
                        handleExport('pdf', 'all');
                        setIsExportOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      PDF Documento (.pdf)
                    </button>
                    <button 
                      onClick={() => {
                        handleExport('csv', 'all');
                        setIsExportOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      Planilha CSV (.csv)
                    </button>
                    <button 
                      onClick={() => {
                        handleExport('xlsx', 'all');
                        setIsExportOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      Planilha Excel (.xlsx)
                    </button>
                  </div>
                </div>

                {/* Grupo Exportar TOP 10 */}
                <div className="px-4 pt-2.5">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Exportar TOP 10</span>
                  <div className="mt-1.5 space-y-1">
                    <button 
                      onClick={() => {
                        handleExport('pdf', 'top10');
                        setIsExportOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      PDF Documento (.pdf)
                    </button>
                    <button 
                      onClick={() => {
                        handleExport('csv', 'top10');
                        setIsExportOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      Planilha CSV (.csv)
                    </button>
                    <button 
                      onClick={() => {
                        handleExport('xlsx', 'top10');
                        setIsExportOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      Planilha Excel (.xlsx)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* FILTROS E PARÂMETROS */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col xl:flex-row xl:items-end justify-between gap-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 flex-wrap">
          {/* Período de Análise */}
          <div className="flex items-end gap-3">
            <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 mb-0.5">
              <Calendar size={18} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Período de Análise</label>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="mt-1.5 block w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
              >
                <option value="1d">Últimos 1 dia</option>
                <option value="7d">Última 1 semana</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="60d">Últimos 60 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>
            </div>
          </div>

          {/* Separação de Ambiente */}
          <div className="flex items-end gap-3">
            <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 mb-0.5">
              <Server size={18} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Separação de Ambiente</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="mt-1.5 block w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
              >
                <option value="all">Todos</option>
                <option value="coids">Data Center COIDS</option>
                <option value="sesup">Data Center SESUP</option>
              </select>
            </div>
          </div>

          {/* Input de Busca Hostname */}
          <div className="flex items-end gap-3">
            <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 mb-0.5">
              <Search size={18} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Buscar Hostname</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: cn_ ou n01..."
                className="mt-1.5 block w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 placeholder:text-slate-400/70 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-xl self-start xl:self-auto mb-0.5">
          <Server size={14} className="text-slate-400" />
          <span>Hosts Filtrados: <strong>{sortedData.length}</strong> de <strong>{data.length}</strong></span>
        </div>
      </section>

      {/* TABELA DE DADOS */}
      <section className="min-h-[400px] w-full">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 space-y-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm w-full">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculando médias de banco histórico...</span>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-20 bg-white rounded-3xl border border-slate-200/80 shadow-sm text-center px-4 w-full">
            <BarChart2 className="text-slate-300 mb-3" size={48} />
            <h3 className="text-sm font-bold text-slate-700">Nenhum dado retornado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">Não foi possível calcular as médias dos hosts para os filtros ativos. Verifique o termo de busca ou tente outro período.</p>
          </div>
        ) : (
          <div className="space-y-4 w-full">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th 
                      onClick={() => handleSort('nodename')}
                      className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100/50 transition-colors select-none group whitespace-nowrap"
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span className="transition-colors group-hover:text-slate-700">Hostname</span>
                        {sortColumn === 'nodename' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 flex-shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">Instância</th>
                    
                    <th 
                      onClick={() => handleSort('cpu')}
                      className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100/50 transition-colors select-none group whitespace-nowrap"
                    >
                      <div className="inline-flex items-center justify-end gap-1.5 w-full">
                        <span className="transition-colors group-hover:text-slate-700">CPU Média</span>
                        {sortColumn === 'cpu' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 flex-shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        )}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('mem')}
                      className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100/50 transition-colors select-none group whitespace-nowrap"
                    >
                      <div className="inline-flex items-center justify-end gap-1.5 w-full">
                        <span className="transition-colors group-hover:text-slate-700">Memória Média</span>
                        {sortColumn === 'mem' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 flex-shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        )}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('network')}
                      className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100/50 transition-colors select-none group whitespace-nowrap"
                    >
                      <div className="inline-flex items-center justify-end gap-1.5 w-full">
                        <span className="transition-colors group-hover:text-slate-700">Tráfego de Rede Médio</span>
                        {sortColumn === 'network' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 flex-shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        )}
                      </div>
                    </th>
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
              <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm w-full">
                <div className="text-xs text-slate-500">
                  Mostrando <strong className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</strong> a{' '}
                  <strong className="font-semibold text-slate-700">
                    {Math.min(currentPage * itemsPerPage, sortedData.length)}
                  </strong>{' '}
                  de <strong className="font-semibold text-slate-700">{sortedData.length}</strong> hosts
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
