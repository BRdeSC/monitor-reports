"use client";
import React from 'react';
import Plot from './PlotlyWrapper';

interface TopUsersChartProps {
  data: { user_name: string; total_cpu_hours: number }[];
  loading: boolean;
  monthName: string;
  year: string;
}

export function TopUsersChart({ data, loading, monthName, year }: TopUsersChartProps) {
  if (loading || !data) {
    return (
      <>
        <div className="grafico grafico-grande skeleton"></div>
        <div className="skeleton" style={{ height: '300px', marginTop: '2rem' }}></div>
      </>
    );
  }

  const usuarios = data.map(d => d.user_name);
  const horasUsuario = data.map(d => d.total_cpu_hours);
  const totalTop10 = horasUsuario.reduce((a, b) => a + b, 0);

  const coresUsuario = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0',
        '#00897b', '#00acc1', '#5c6bc0', '#8e24aa', '#fb8c00'];

  const traceUsuarios = {
    y: usuarios.slice().reverse(),
    x: horasUsuario.slice().reverse(),
    type: 'bar',
    orientation: 'h',
    marker: {
        color: coresUsuario.slice(0, usuarios.length).reverse(),
        line: { color: 'white', width: 1 }
    },
    text: horasUsuario.slice().reverse().map(v => (v / 1e6).toFixed(2) + ' Mh'),
    textposition: 'outside',
    hovertemplate: '<b>%{y}</b><br>Horas: %{x:,.0f}<extra></extra>'
  };

  const layoutPadrao = {
    font: { family: 'Inter, sans-serif', color: '#5f6368' },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 50, r: 80, b: 60, l: 120 },
    title: { text: `Top 10 Usuários — Horas de CPU em ${monthName}/${year}`, font: { size: 18, color: '#1a3a5c' } },
    xaxis: { title: 'Horas de CPU' },
    yaxis: { title: '', autorange: 'reversed' as const }
  };

  return (
    <>
      <div id="grafico-usuarios" className="grafico grafico-grande">
        {/* @ts-ignore */}
        <Plot
          data={[traceUsuarios] as any}
          layout={layoutPadrao}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ responsive: true }}
        />
      </div>

      <h3 style={{ marginTop: '2rem', color: '#1a3a5c' }}>Tabela de Usuários</h3>
      <table>
        <thead>
          <tr>
            <th>Posição</th>
            <th>Usuário</th>
            <th>Horas de CPU</th>
            <th>% do Top 10</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const pct = (row.total_cpu_hours / totalTop10 * 100).toFixed(1);
            const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
            return (
              <tr key={row.user_name}>
                <td>{medalha}</td>
                <td><strong>{row.user_name}</strong></td>
                <td>{row.total_cpu_hours.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                <td>{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
