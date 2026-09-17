"use client";
import React from 'react';

interface KpiCardsProps {
  data: {
    nodes: number;
    cores: number;
    storage: string;
    activeUsers: number;
    avgUsage: number;
    totalCpuHours: number;
    totalJobs?: number;
    taxaSucesso?: number;
  } | null;
  loading: boolean;
  monthName: string;
}

export function KpiCards({ data, loading, monthName }: KpiCardsProps) {
  if (loading || !data) {
    return (
      <div className="kpi-grid" id="kpi">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="kpi-card skeleton" style={{ height: '120px' }}></div>
        ))}
      </div>
    );
  }

  const jobsK = data.totalJobs ? (data.totalJobs / 1000).toFixed(1).replace('.', ',') + ' K' : '0';
  const sucessoStr = data.taxaSucesso ? data.taxaSucesso.toFixed(1).replace('.', ',') + '%' : '0%';

  return (
    <div className="kpi-grid" id="kpi">
      <div className="kpi-card">
        <h3>Nós Computacionais</h3>
        <div className="valor">{data.nodes}</div>
        <div className="sub">HPE Cray XD2000</div>
      </div>
      <div className="kpi-card">
        <h3>Núcleos Totais</h3>
        <div className="valor">{data.cores.toLocaleString('pt-BR')}</div>
        <div className="sub">2 Processadores AMD EPYC com 128 núcleos</div>
      </div>
      <div className="kpi-card">
        <h3>Armazenamento Paralelo</h3>
        <div className="valor">{data.storage}</div>
        <div className="sub">HPE Cray ClusterStor E1000</div>
      </div>
      {/* <div className="kpi-card"> */}
      <div className="kpi-card" style={{ position: 'relative' }}>
        <span 
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            fontSize: '0.65rem',
            background: '#e8f0fe',
            color: '#1a73e8',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 600
          }}
          title="Pendente de validação da regra de consolidação"
        >
          Verificar
        </span>
        <h3>Usuários ativos </h3>
        <div className="valor">{data.activeUsers}</div>
        <div className="sub">16 grupos de trabalho</div>
      </div>
      <div className="kpi-card">
        <h3>Uso Médio</h3>
        <div className="valor">{data.avgUsage.toFixed(1).replace('.', ',')}%</div>
        <div className="sub">~{(100 - data.avgUsage).toFixed(0)}% de capacidade disponível</div>
      </div>
      <div className="kpi-card">
        <h3>Jobs Executados</h3>
        <div className="valor">{jobsK}</div>
        <div className="sub">{sucessoStr} de sucesso</div>
      </div>
    </div>
  );
}
