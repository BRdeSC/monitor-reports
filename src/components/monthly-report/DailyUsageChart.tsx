"use client";
import React from 'react';
import Plot from './PlotlyWrapper';

interface DailyUsageChartProps {
  data: { day: number; usagePct: number }[];
  loading: boolean;
  monthName: string;
  year: string;
  avgUsage: number;
}

export function DailyUsageChart({ data, loading, monthName, year, avgUsage }: DailyUsageChartProps) {
  if (loading || !data) {
    return <div className="grafico grafico-grande skeleton"></div>;
  }

  const dias = data.map(d => d.day);
  const usoDiario = data.map(d => d.usagePct);

  const traceDiario = {
    x: dias,
    y: usoDiario,
    type: 'scatter',
    mode: 'lines+markers',
    fill: 'tozeroy',
    fillcolor: 'rgba(26, 115, 232, 0.15)',
    line: { color: '#1a73e8', width: 2.5 },
    marker: { size: 6, color: '#1a73e8', line: { color: 'white', width: 1 } },
    name: 'Uso diário (%)',
    hovertemplate: 'Dia %{x}: %{y:.2f}%<extra></extra>'
  };

  const traceMediaDiaria = {
    x: dias,
    y: Array(dias.length).fill(avgUsage),
    type: 'scatter',
    mode: 'lines',
    name: `Média ${monthName}: ${avgUsage.toFixed(2)}%`,
    line: { color: '#ea4335', width: 2, dash: 'dash' },
    hovertemplate: 'Média: %{y:.2f}%<extra></extra>'
  };

  const layoutPadrao = {
    font: { family: 'Inter, sans-serif', color: '#5f6368' },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 50, r: 30, b: 60, l: 60 },
    title: { text: `Uso Diário do Cluster Jaci — ${monthName}/${year}`, font: { size: 18, color: '#1a3a5c' } },
    yaxis: { title: 'Utilização (%)', range: [0, 100], ticksuffix: '%' },
    xaxis: { title: 'Dia do mês', dtick: 1 },
    legend: { orientation: 'h' as const, y: -0.18 },
    hovermode: 'x unified' as const
  };

  return (
    <div id="grafico-diario" className="grafico grafico-grande">
      {/* @ts-ignore */}
      <Plot
        data={[traceDiario, traceMediaDiaria] as any}
        layout={layoutPadrao}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true }}
      />
    </div>
  );
}
