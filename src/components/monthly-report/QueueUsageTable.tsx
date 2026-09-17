"use client";
import React from 'react';
import Plot from './PlotlyWrapper';

interface QueueUsageTableProps {
  data: { queue: string; total_cpu_hours: number }[];
  loading: boolean;
  monthName: string;
  year: string;
}

export function QueueUsageTable({ data, loading, monthName, year }: QueueUsageTableProps) {
  if (loading || !data) {
    return (
      <>
        <div className="grafico grafico-grande skeleton"></div>
        <div className="skeleton" style={{ height: '200px', marginTop: '2rem' }}></div>
      </>
    );
  }

  const filas = data.map(d => d.queue);
  const horasFila = data.map(d => d.total_cpu_hours);
  const totalFila = horasFila.reduce((a, b) => a + b, 0);
  const pctFila = horasFila.map(h => (h / totalFila) * 100);

  const coresFila = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0', '#00897b', '#00acc1', '#5c6bc0'];

  const traceFilas = {
    values: horasFila,
    labels: filas,
    type: 'pie',
    hole: 0.55,
    marker: { colors: coresFila, line: { color: 'white', width: 2 } },
    textinfo: 'label+percent',
    textposition: 'outside',
    hovertemplate: '<b>%{label}</b><br>Horas: %{value:,.0f}<br>Participação: %{percent}<extra></extra>',
  };

  const layoutPadrao = {
    font: { family: 'Inter, sans-serif', color: '#5f6368' },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 50, r: 30, b: 60, l: 60 },
    title: { text: `Distribuição de Horas de CPU por Fila — ${monthName}/${year}`, font: { size: 18, color: '#1a3a5c' } },
    annotations: [{
      text: (totalFila / 1e6).toFixed(2) + ' M<br>horas',
      x: 0.5, y: 0.5, font: { size: 18, color: '#1a3a5c', family: 'Inter' },
      showarrow: false
    }],
    showlegend: true,
    legend: { orientation: 'h' as const, y: -0.1 }
  };

  return (
    <>
      <h3 style={{ color: '#1a3a5c' }}>3.1. Configuração das Filas PBS</h3>
      <table>
          <thead>
              <tr>
                  <th>Fila</th>
                  <th>Nós</th>
                  <th>Wall Time</th>
                  <th>Núcleos</th>
              </tr>
          </thead>
          <tbody>
              <tr>
                  <td><strong>oper</strong></td>
                  <td>104</td>
                  <td>08:00:00</td>
                  <td>10.240</td>
              </tr>
              <tr>
                  <td><strong>pesqextra</strong></td>
                  <td>30</td>
                  <td>08:00:00</td>
                  <td>7.680</td>
              </tr>
              <tr>
                  <td><strong>pesqhigh</strong></td>
                  <td>20</td>
                  <td>06:00:00</td>
                  <td>5.120</td>
              </tr>
              <tr>
                  <td><strong>pesqmidi</strong></td>
                  <td>7</td>
                  <td>02:00:00</td>
                  <td>1.792</td>
              </tr>
              <tr>
                  <td><strong>pesqmini</strong></td>
                  <td>7</td>
                  <td>00:30:00</td>
                  <td>1.792</td>
              </tr>
              <tr>
                  <td><strong>longtime</strong></td>
                  <td>8</td>
                  <td>168:00:00</td>
                  <td>2.048</td>
              </tr>
          </tbody>
      </table>

      <div className="texto-interpretativo" style={{ marginTop: '2rem' }}>
          A fila <strong>oper</strong> é a maior em recursos (104 nós, 10.240 núcleos), dedicada às operações institucionais com wall time de 8 horas. A fila <strong>pesqextra</strong> (30 nós, 7.680 núcleos) é a principal fila de pesquisa, também com 8 horas de limite. Para trabalhos de longa duração, a fila <strong>longtime</strong> oferece 8 nós com wall time de 168 horas (7 dias). As filas <strong>pesqmidi</strong> e <strong>pesqmini</strong> atendem demandas de menor porte com 7 nós cada e limites de 2 horas e 30 minutos, respectivamente.
      </div>

      <h3 style={{ color: '#1a3a5c', marginTop: '2rem' }}>3.2. Distribuição de núcleo/hora por fila</h3>
      <div className="texto-interpretativo">
          A fila <strong>pesqextra</strong> dominou o consumo computacional em julho, respondendo por <strong>58,2%</strong> do total (~4,59 milhões de horas), consolidando-se como a principal fila de processamento científico. A fila <strong>oper</strong> consumiu 24,0% (~1,89 milhão de horas), refletindo a demanda operacional do INPE. A concentração de <strong>~97%</strong> do processamento nas três filas principais sugere que a maior parte dos grupos opta por trabalhos de grande escala.
      </div>
      
      <div id="grafico-filas" className="grafico grafico-grande">
        {/* @ts-ignore */}
        <Plot
          data={[traceFilas] as any}
          layout={layoutPadrao}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ responsive: true }}
        />
      </div>

      <h3 style={{ marginTop: '2rem', color: '#1a3a5c' }}>Tabela de Consumo por Fila</h3>
      <table>
        <thead>
          <tr>
            <th>Fila</th>
            <th>Horas de CPU</th>
            <th>% do Total</th>
            <th>Destaque</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.queue}>
              <td><strong>{row.queue}</strong></td>
              <td>{row.total_cpu_hours.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
              <td>{pctFila[i].toFixed(1)}%</td>
              <td>
                <span className="badge" style={{ background: coresFila[i % coresFila.length] }}>
                  {i < 3 ? 'Principal' : 'Secundária'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
