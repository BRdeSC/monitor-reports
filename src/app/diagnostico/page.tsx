'use client'
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  Loader2,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import PlatformSummaryCards from '@/components/diagnostico/PlatformSummaryCards';
import ServiceRowAccordion from '@/components/diagnostico/ServiceRowAccordion';
import InfraServiceRow from '@/components/diagnostico/InfraServiceRow';
import ServiceModal from '@/components/diagnostico/ServiceModal';
import OutagesModal from '@/components/diagnostico/OutagesModal';
import { ServiceWithDetails, DiagnosticsStats } from '@/lib/diagnostics/types';

export default function DiagnosticoPage() {
  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [stats, setStats] = useState<DiagnosticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [checkingServiceId, setCheckingServiceId] = useState<string | null>(null);

  // Navegação por Abas
  const [activeTab, setActiveTab] = useState<'applications' | 'infrastructure'>('applications');

  // Filtros e busca
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'down' | 'paused'>('all');

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceWithDetails | null>(null);
  const [isOutagesModalOpen, setIsOutagesModalOpen] = useState(false);
  const [outagesInitialCategory, setOutagesInitialCategory] = useState<'all' | 'application' | 'service'>('all');

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(10);

  // Carrega serviços e estatísticas
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [servicesRes, statsRes] = await Promise.all([
        fetch('/metrics/api/diagnostics/services'),
        fetch('/metrics/api/diagnostics/stats'),
      ]);

      const servicesJson = await servicesRes.json();
      const statsJson = await statsRes.json();

      if (servicesJson.success) {
        setServices(servicesJson.data);
      }
      if (statsJson.success) {
        setStats(statsJson.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de diagnóstico:', error);
    } finally {
      setLoading(false);
      setSecondsUntilRefresh(10);
    }
  }, []);

  // Efeito inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ciclo de auto-refresh (10s)
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchData(true);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

  // Ação: Checar todos os serviços agora
  const handleCheckAll = async () => {
    setRefreshingAll(true);
    try {
      const response = await fetch('/metrics/api/diagnostics/check-all', {
        method: 'POST',
      });
      const json = await response.json();
      if (json.success) {
        setServices(json.data);
        if (json.stats) setStats(json.stats);
      }
    } catch (error) {
      console.error('Erro ao verificar todos os serviços:', error);
    } finally {
      setRefreshingAll(false);
      setSecondsUntilRefresh(10);
    }
  };

  // Ação: Checar serviço individual
  const handleCheckNow = async (service: ServiceWithDetails) => {
    setCheckingServiceId(service.id);
    try {
      const response = await fetch(`/metrics/api/diagnostics/services/${service.id}/check`, {
        method: 'POST',
      });
      const json = await response.json();
      if (json.success && json.service) {
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? json.service : s))
        );
        // Atualiza stats
        const statsRes = await fetch('/metrics/api/diagnostics/stats');
        const statsJson = await statsRes.json();
        if (statsJson.success) setStats(statsJson.data);
      }
    } catch (error) {
      console.error(`Erro ao verificar serviço ${service.name}:`, error);
    } finally {
      setCheckingServiceId(null);
    }
  };

  // Ação: Alternar Ativo/Pausado
  const handleToggleStatus = async (service: ServiceWithDetails) => {
    try {
      const response = await fetch(`/metrics/api/diagnostics/services/${service.id}/toggle`, {
        method: 'PATCH',
      });
      const json = await response.json();
      if (json.success && json.data) {
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, is_active: json.data.is_active } : s))
        );
        fetchData(true);
      }
    } catch (error) {
      console.error('Erro ao alternar status:', error);
    }
  };

  // Ação: Excluir serviço
  const handleDeleteService = async (service: ServiceWithDetails) => {
    if (!window.confirm(`Tem certeza que deseja excluir o monitoramento de "${service.name}"? Todo o histórico de métricas e incidentes será removido.`)) {
      return;
    }

    try {
      const response = await fetch(`/metrics/api/diagnostics/services/${service.id}`, {
        method: 'DELETE',
      });
      const json = await response.json();
      if (json.success) {
        setServices((prev) => prev.filter((s) => s.id !== service.id));
        fetchData(true);
      }
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
    }
  };

  // Divisão dos serviços por categoria
  const applications = services.filter((s) => s.category !== 'service' && s.check_type !== 'tcp');
  const infraServices = services.filter((s) => s.category === 'service' || s.check_type === 'tcp');

  const currentList = activeTab === 'applications' ? applications : infraServices;

  // Filtro de serviços dentro da aba ativa
  const filteredServices = currentList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.host && s.host.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'paused') return s.is_active === 0;
    if (s.is_active === 0) return false; // Se pausado e filtro for up/down, esconde

    if (statusFilter === 'up') return s.latest_log?.is_up === 1;
    if (statusFilter === 'down') return s.latest_log?.is_up === 0;

    return true;
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* HEADER DA PÁGINA */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight uppercase flex items-center gap-3">
            <span>Diagnóstico & Health Check</span>
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Sondagem Contínua de Aplicações, Microsserviços & Infraestrutura TCP
            </p>
          </div>
        </div>

        {/* Botões de Ação Superior */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle Auto-refresh */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              autoRefresh
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Alternar atualização automática a cada 10 segundos"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`} />
            <span>{autoRefresh ? `Auto (${secondsUntilRefresh}s)` : 'Pausado'}</span>
          </button>

          {/* Botão Relatório de Quedas & Incidentes */}
          <button
            onClick={() => {
              setOutagesInitialCategory(activeTab === 'applications' ? 'application' : 'service');
              setIsOutagesModalOpen(true);
            }}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700/80 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 group"
            title="Abrir histórico consolidado e relatório de incidentes"
          >
            <BarChart3 size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Incidentes & Quedas</span>
            {(stats?.recent_outages_count || 0) > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-[10px] font-mono font-bold">
                {stats?.recent_outages_count}
              </span>
            )}
          </button>

          {/* Botão Verificar Todos Agora */}
          <button
            onClick={handleCheckAll}
            disabled={refreshingAll || loading}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-200 hover:border-slate-700 hover:text-white transition-all shadow-xs active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshingAll ? 'animate-spin text-cyan-400' : ''} />
            <span>{refreshingAll ? 'Sondando...' : 'Verificar Todos Agora'}</span>
          </button>

          {/* Botão + Novo Alvo */}
          <button
            onClick={() => {
              setServiceToEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Novo Alvo</span>
          </button>
        </div>
      </header>

      {/* 1. NAVEGAÇÃO POR ABAS NO TOPO (LOGO ABAIXO DO HEADER) */}
      <section className="border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          {/* Aba 1: Aplicações */}
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-t-2xl text-xs font-bold uppercase tracking-wider transition-all border-t border-x ${
              activeTab === 'applications'
                ? 'bg-slate-900 text-cyan-300 border-slate-700/80 border-b-2 border-b-cyan-400 shadow-md -mb-px'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40'
            }`}
          >
            <span className="text-base">🚀</span>
            <span>Aplicações</span>
            <span
              className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'applications'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {applications.length}
            </span>
          </button>

          {/* Aba 2: Serviços & Infra */}
          <button
            type="button"
            onClick={() => setActiveTab('infrastructure')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-t-2xl text-xs font-bold uppercase tracking-wider transition-all border-t border-x ${
              activeTab === 'infrastructure'
                ? 'bg-slate-900 text-cyan-300 border-slate-700/80 border-b-2 border-b-cyan-400 shadow-md -mb-px'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40'
            }`}
          >
            <span className="text-base">🖧</span>
            <span>Serviços & Infra</span>
            <span
              className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'infrastructure'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {infraServices.length}
            </span>
          </button>
        </div>
      </section>

      {/* 2. CARDS DE MÉTRICAS CONTEXTUAIS POR ABA */}
      <section>
        <PlatformSummaryCards
          activeTab={activeTab}
          services={services}
          stats={stats}
          loading={loading}
          onOpenOutages={(category) => {
            setOutagesInitialCategory(category);
            setIsOutagesModalOpen(true);
          }}
        />
      </section>

      {/* 3. BARRA DE FILTROS E BUSCA (OTIMIZADA PARA ESPAÇO VERTICAL) */}
      <section className="bg-slate-900/60 p-3 sm:p-3.5 rounded-2xl border border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'applications'
                ? 'Filtrar por nome ou URL da aplicação...'
                : 'Filtrar por nome, host ou porta do serviço...'
            }
            className="w-full pl-9 pr-8 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500/60 outline-none transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros de Status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden md:inline">
            Status:
          </span>
          <div className="flex items-center bg-slate-950/60 border border-slate-800 rounded-xl p-1">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'up', label: 'Operacionais' },
              { id: 'down', label: 'Fora do Ar' },
              { id: 'paused', label: 'Pausados' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as 'all' | 'up' | 'down' | 'paused')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TABELA DE ALVOS (ACCORDION / LINHAS DE SERVIÇOS) */}
      <section className="space-y-2">
        {/* Cabeçalho de colunas desktop adaptativo */}
        {filteredServices.length > 0 && (
          <div className="hidden lg:flex items-center justify-between px-4 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest select-none">
            {activeTab === 'applications' ? (
              <>
                <div className="min-w-[180px] max-w-[260px]">Aplicação / Serviço</div>
                <div className="w-28">Modo</div>
                <div className="flex-1 min-w-[170px] max-w-sm px-2">Endpoint HTTP</div>
                <div className="w-32 text-right">Latência</div>
                <div className="w-28 sm:w-32 text-right">Status</div>
                <div className="pl-3 text-right">Ações</div>
              </>
            ) : (
              <>
                <div className="min-w-[180px] max-w-[260px]">Serviço de Infra</div>
                <div className="w-32">Protocolo</div>
                <div className="flex-1 min-w-[170px] max-w-sm px-2">Endereço de Rede</div>
                <div className="w-32 text-right">Handshake TCP</div>
                <div className="w-40 sm:w-44 text-right">Status da Porta</div>
                <div className="pl-3 text-right">Ações</div>
              </>
            )}
          </div>
        )}

        {loading && services.length === 0 ? (
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 size={36} className="animate-spin text-cyan-400" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Carregando diagnósticos de integridade...
            </p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-12 text-center space-y-3">
            <AlertCircle size={36} className="text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">
              {activeTab === 'applications' ? 'Nenhuma aplicação encontrada' : 'Nenhum serviço de infraestrutura encontrado'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Nenhum alvo corresponde aos filtros aplicados nesta aba.'
                : activeTab === 'applications'
                ? 'Você ainda não cadastrou nenhuma aplicação web ou API monitorada. Clique em "+ Novo Alvo" para começar.'
                : 'Você ainda não cadastrou nenhum serviço de infraestrutura (MySQL, PostgreSQL, Redis, Brokers). Clique em "+ Novo Alvo" e selecione "Serviço / Infra" para começar.'}
            </p>
          </div>
        ) : activeTab === 'applications' ? (
          filteredServices.map((service) => (
            <ServiceRowAccordion
              key={service.id}
              service={service}
              onCheckNow={handleCheckNow}
              onToggleStatus={handleToggleStatus}
              onEdit={(s) => {
                setServiceToEdit(s);
                setIsModalOpen(true);
              }}
              onDelete={handleDeleteService}
              isChecking={checkingServiceId === service.id}
            />
          ))
        ) : (
          filteredServices.map((service) => (
            <InfraServiceRow
              key={service.id}
              service={service}
              onCheckNow={handleCheckNow}
              onToggleStatus={handleToggleStatus}
              onEdit={(s) => {
                setServiceToEdit(s);
                setIsModalOpen(true);
              }}
              onDelete={handleDeleteService}
              isChecking={checkingServiceId === service.id}
            />
          ))
        )}
      </section>

      {/* MODAL DE CADASTRO / EDIÇÃO (+ NOVO ALVO) */}
      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setServiceToEdit(null);
        }}
        onSaved={() => fetchData(true)}
        serviceToEdit={serviceToEdit}
      />

      {/* MODAL DE HISTÓRICO DE INCIDENTES & SLA */}
      <OutagesModal
        isOpen={isOutagesModalOpen}
        onClose={() => setIsOutagesModalOpen(false)}
        services={services}
        initialCategory={outagesInitialCategory}
      />
    </div>
  );
}

