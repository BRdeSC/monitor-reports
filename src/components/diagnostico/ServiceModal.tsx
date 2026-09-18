'use client'
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Globe, 
  Clock, 
  Check, 
  Loader2, 
  Server, 
  Network, 
  Database, 
  Layers, 
  Cpu 
} from 'lucide-react';
import { MonitoredService, CheckType, ServiceCategory } from '@/lib/diagnostics/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  serviceToEdit?: MonitoredService | null;
}

const COMMON_PORT_PRESETS = [
  { label: 'MySQL / MariaDB', port: '3306', icon: Database, defaultName: 'MySQL Banco' },
  { label: 'PostgreSQL', port: '5432', icon: Database, defaultName: 'PostgreSQL' },
  { label: 'Redis Cache', port: '6379', icon: Layers, defaultName: 'Redis Cache' },
  { label: 'RabbitMQ', port: '5672', icon: Cpu, defaultName: 'RabbitMQ Broker' },
  { label: 'Kafka', port: '9092', icon: Cpu, defaultName: 'Apache Kafka' },
  { label: 'SSH', port: '22', icon: Network, defaultName: 'Servidor SSH' },
];

export default function ServiceModal({ isOpen, onClose, onSaved, serviceToEdit }: Props) {
  const [category, setCategory] = useState<ServiceCategory>('application');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('3306');
  const [checkType, setCheckType] = useState<CheckType>('intelligent');
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (serviceToEdit) {
      const isServ = serviceToEdit.category === 'service' || serviceToEdit.check_type === 'tcp';
      setCategory(isServ ? 'service' : 'application');
      setName(serviceToEdit.name);
      setIntervalSeconds(serviceToEdit.interval_seconds || 30);
      setIsActive(serviceToEdit.is_active === 1);

      if (isServ) {
        setCheckType('tcp');
        if (serviceToEdit.host && serviceToEdit.port) {
          setHost(serviceToEdit.host);
          setPort(String(serviceToEdit.port));
        } else {
          const parts = (serviceToEdit.url || '').replace(/^tcp:\/\//i, '').split(':');
          setHost(parts[0] || '');
          setPort(parts[1] || '3306');
        }
        setUrl('');
      } else {
        setUrl(serviceToEdit.url);
        setCheckType(serviceToEdit.check_type === 'basic' ? 'basic' : 'intelligent');
        setHost('');
        setPort('3306');
      }
    } else {
      setCategory('application');
      setName('');
      setUrl('');
      setHost('');
      setPort('3306');
      setCheckType('intelligent');
      setIntervalSeconds(30);
      setIsActive(true);
    }
    setError(null);
  }, [serviceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof COMMON_PORT_PRESETS[0]) => {
    setPort(preset.port);
    if (!name.trim()) {
      setName(preset.defaultName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor, informe o nome do alvo monitorado.');
      return;
    }

    let finalUrl = '';
    let finalHost: string | null = null;
    let finalPort: number | null = null;

    if (category === 'service') {
      if (!host.trim()) {
        setError('Por favor, informe o hostname ou IP do serviço de infraestrutura.');
        return;
      }

      const parsedPort = parseInt(port.trim(), 10);
      if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
        setError('A porta TCP informada é inválida (deve estar entre 1 e 65535).');
        return;
      }

      finalHost = host.trim();
      finalPort = parsedPort;
      finalUrl = `${finalHost}:${finalPort}`;
    } else {
      if (!url.trim()) {
        setError('Por favor, informe a URL de checagem da aplicação.');
        return;
      }

      try {
        new URL(url.trim());
      } catch {
        setError('A URL de checagem deve iniciar com http:// ou https://');
        return;
      }

      finalUrl = url.trim();
    }

    setSaving(true);
    try {
      const endpoint = serviceToEdit
        ? `/metrics/api/diagnostics/services/${serviceToEdit.id}`
        : '/metrics/api/diagnostics/services';

      const method = serviceToEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          url: finalUrl,
          check_type: category === 'service' ? 'tcp' : checkType,
          host: finalHost,
          port: finalPort,
          interval_seconds: Number(intervalSeconds) || 30,
          is_active: isActive ? 1 : 0,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Erro ao salvar serviço');
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar o alvo monitorado';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const presetIntervals = [10, 30, 60, 300];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {serviceToEdit ? 'Editar Alvo Monitorado' : 'Cadastrar Novo Alvo'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure os parâmetros de monitoramento contínuo para aplicações ou infraestrutura.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 1. SELETOR DE CATEGORIA NO TOPO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Categoria do Alvo <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Aplicação (Web / API) */}
              <button
                type="button"
                onClick={() => setCategory('application')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  category === 'application'
                    ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className={category === 'application' ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="text-xs font-bold text-slate-900">Aplicação</span>
                  </div>
                  {category === 'application' && (
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Sites, APIs e microsserviços via HTTP / HTTPS.
                </p>
              </button>

              {/* Serviço de Infraestrutura (TCP) */}
              <button
                type="button"
                onClick={() => setCategory('service')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  category === 'service'
                    ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Server size={16} className={category === 'service' ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="text-xs font-bold text-slate-900">Serviço / Infra</span>
                  </div>
                  {category === 'service' && (
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Bancos, caches, brokers e portas de rede TCP.
                </p>
              </button>
            </div>
          </div>

          {/* Nome do Alvo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nome do Alvo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                category === 'service'
                  ? 'Ex: MySQL Produção, Storage NFS, Redis Cluster'
                  : 'Ex: API Catálogo, Coletor Slurm, Portal Web'
              }
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition-all shadow-inner"
            />
          </div>

          {/* CAMPOS ESPECÍFICOS DE ACORDO COM A CATEGORIA */}
          {category === 'service' ? (
            <div className="space-y-4 pt-1">
              {/* Presets Rápidos de Portas de Infraestrutura */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Atalhos de Portas Comuns:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_PORT_PRESETS.map((p) => {
                    const isSelected = port === p.port;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.port}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200/80'
                        }`}
                      >
                        <Icon size={12} className={isSelected ? 'text-cyan-400' : 'text-slate-500'} />
                        <span>{p.label}</span>
                        <span className="font-mono text-[10px] opacity-75">({p.port})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Host e Porta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Host / IP de Rede <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="Ex: 10.0.1.20 ou mysql.inpe.br"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Porta TCP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    required
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="3306"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-500">
                <Network size={15} className="text-blue-600 flex-shrink-0" />
                <span>
                  O monitor central testará periodicamente a abertura do socket TCP em{' '}
                  <strong className="font-mono text-slate-800">
                    {host.trim() || 'host'}:{port || 'porta'}
                  </strong>.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* URL de Checagem */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  URL de Checagem (Health/Ping) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.servico.com/health ou http://localhost:8080/ping"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition-all shadow-inner"
                />
                <p className="text-[11px] text-slate-400">
                  O monitor central fará requisições periódicas via GET nesta URL HTTP/HTTPS.
                </p>
              </div>

              {/* Tipo de Checagem HTTP */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tipo de Checagem HTTP
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opção Inteligente */}
                  <button
                    type="button"
                    onClick={() => setCheckType('intelligent')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      checkType === 'intelligent'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className={checkType === 'intelligent' ? 'text-blue-600' : 'text-slate-400'} />
                        <span className="text-xs font-bold text-slate-900">Health Check Inteligente</span>
                      </div>
                      {checkType === 'intelligent' && (
                        <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug mt-1">
                      Analisa payload JSON em profundidade, inspecionando dependências internas e métricas.
                    </p>
                  </button>

                  {/* Opção Básica */}
                  <button
                    type="button"
                    onClick={() => setCheckType('basic')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      checkType === 'basic'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Globe size={16} className={checkType === 'basic' ? 'text-blue-600' : 'text-slate-400'} />
                        <span className="text-xs font-bold text-slate-900">Checagem Básica de URL</span>
                      </div>
                      {checkType === 'basic' && (
                        <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug mt-1">
                      Valida apenas o código de status HTTP (200 OK) e o tempo de resposta da rota.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Intervalo de Sondagem */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                Intervalo de Sondagem (segundos)
              </label>
              <span className="text-xs font-bold text-blue-600 font-mono">
                {intervalSeconds}s
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                max="3600"
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
              />
              <div className="flex items-center gap-1.5">
                {presetIntervals.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setIntervalSeconds(preset)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      intervalSeconds === preset
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {preset}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggle Ativo / Pausado */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Monitoramento Ativo
              </span>
              <span className="text-[11px] text-slate-500">
                {isActive ? 'O alvo será sondado periodicamente' : 'Sondagens automáticas pausadas'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isActive ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wide flex items-center gap-2 shadow-md shadow-blue-500/10 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              <span>{serviceToEdit ? 'Salvar Alterações' : 'Cadastrar Alvo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
