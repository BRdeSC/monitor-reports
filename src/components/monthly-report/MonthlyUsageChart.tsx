"use client";
import React from 'react';
import Plot from './PlotlyWrapper';

interface MonthlyUsageChartProps {
  data: { month: string; usagePct: number }[];
  loading: boolean;
}

export function MonthlyUsageChart({ data, loading }: MonthlyUsageChartProps) {
  if (loading || !data) {
    return <div className="grafico grafico-grande skeleton"></div>;
  }

  const mesesMap = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const meses = data.map(d => mesesMap[parseInt(d.month) - 1]);
  const usoMensal = data.map(d => d.usagePct);
  
  const mediaPeriodo = usoMensal.length > 0 
    ? usoMensal.reduce((a, b) => a + b, 0) / usoMensal.length 
    : 0;

  const traceHistBar = {
    x: meses,
    y: usoMensal,
    type: 'bar',
    name: 'Utilização mensal (%)',
    marker: {
        color: ['#9ec9fa', '#7eb4f2', '#5e9fea', '#3e8ae2', '#1e75da', '#1a73e8', '#4a8ff0', '#4a8ff0', '#4a8ff0', '#4a8ff0', '#4a8ff0', '#4a8ff0'],
        line: { color: '#1a3a5c', width: 1 }
    },
    text: usoMensal.map(v => v.toFixed(2) + '%'),
    textposition: 'outside',
    hovertemplate: '%{x}: %{y:.2f}%<extra></extra>'
  };

  const traceHistLine = {
    x: meses,
    y: Array(meses.length).fill(mediaPeriodo),
    type: 'scatter',
    mode: 'lines',
    name: 'Média: ' + mediaPeriodo.toFixed(2) + '%',
    line: { color: '#ea4335', width: 2, dash: 'dash' },
    hovertemplate: 'Média: %{y:.2f}%<extra></extra>'
  };

  const layoutPadrao = {
    font: { family: 'Inter, sans-serif', color: '#5f6368' },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 50, r: 30, b: 60, l: 60 },
    title: { text: 'Evolução da Utilização do Cluster Jaci', font: { size: 18, color: '#1a3a5c' } },
    yaxis: { title: 'Utilização (%)', range: [0, 80], ticksuffix: '%' },
    xaxis: { title: '' },
    legend: { orientation: 'h' as const, y: -0.18 },
    hovermode: 'x unified' as const
  };

  return (
    <div id="grafico-historico" className="grafico grafico-grande">
      {/* @ts-ignore - Plot type is slightly complex with plotly.js */}
      <Plot
        data={[traceHistBar, traceHistLine] as any}
        layout={layoutPadrao}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true }}
      />
    </div>
  );
}
