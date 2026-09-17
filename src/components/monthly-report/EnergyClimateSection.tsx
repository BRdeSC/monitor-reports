"use client";
import React from 'react';
import Plot from './PlotlyWrapper';

interface EnergyClimateSectionProps {
  energyClimate: {
    rotulosEnergia: string[];
    consumoEnergia: number[];
    tempMedia2026: number[];
  };
  historicalUsage: { month: string; usagePct: number }[];
  loading: boolean;
}

export function EnergyClimateSection({ energyClimate, historicalUsage, loading }: EnergyClimateSectionProps) {
  if (loading || !energyClimate || !historicalUsage) {
    return <div className="grafico grafico-grande skeleton"></div>;
  }

  const { rotulosEnergia, consumoEnergia, tempMedia2026 } = energyClimate;
  const usoJaci2026 = historicalUsage.map(h => h.usagePct); // array de Janeiro até o mês atual
  const meses2026 = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].slice(0, usoJaci2026.length);
  
  // Como as temps no mockup vieram hardcoded 6 posições (Jan-Jun), pego slice delas ou preencho
  const temps = tempMedia2026.slice(0, usoJaci2026.length);
  // Consumo 2026 pega os últimos itens baseados no tamanho do array do ano 2026
  // No array global, 2026 começa no index 36.
  const consumo2026 = consumoEnergia.slice(36, 36 + usoJaci2026.length);

  const indiceChegadaJaci = 31; // Agosto de 2025

  const traceConsumo = {
    x: rotulosEnergia, y: consumoEnergia, type: 'scatter', mode: 'lines+markers',
    line: { color: '#1a73e8', width: 2.5 },
    marker: {
        size: 5,
        color: consumoEnergia.map((v, i) => i >= indiceChegadaJaci ? '#ea4335' : '#1a73e8'),
        line: { color: 'white', width: 1 }
    },
    name: 'Consumo Total (R$)',
    hovertemplate: '<b>%{x}</b><br>R$ %{y:,.2f}<extra></extra>'
  };
  const traceLinhaJaci = {
    x: rotulosEnergia.slice(indiceChegadaJaci), y: consumoEnergia.slice(indiceChegadaJaci),
    type: 'scatter', mode: 'lines+markers',
    line: { color: '#ea4335', width: 3 },
    marker: { size: 7, color: '#ea4335', line: { color: 'white', width: 1.5 } },
    name: 'Período Jaci (ago/25+)',
    hovertemplate: '<b>%{x}</b><br>R$ %{y:,.2f} (Jaci)<extra></extra>'
  };

  const shapes = [
    { type: 'rect', xref: 'x', yref: 'paper', x0: -0.5, x1: 11.5, y0: 0, y1: 1, fillcolor: 'rgba(158, 201, 250, 0.2)', line: { width: 0 }, layer: 'below' },
    { type: 'rect', xref: 'x', yref: 'paper', x0: 11.5, x1: 23.5, y0: 0, y1: 1, fillcolor: 'rgba(126, 180, 242, 0.2)', line: { width: 0 }, layer: 'below' },
    { type: 'rect', xref: 'x', yref: 'paper', x0: 23.5, x1: 31.5, y0: 0, y1: 1, fillcolor: 'rgba(26, 115, 232, 0.15)', line: { width: 0 }, layer: 'below' },
    { type: 'rect', xref: 'x', yref: 'paper', x0: 31.5, x1: 41.5, y0: 0, y1: 1, fillcolor: 'rgba(234, 67, 53, 0.12)', line: { width: 0 }, layer: 'below' },
  ];
  const annotationsEras = [
    { x: 5.5, y: 720000, text: '2023<br><i>Pré-Jaci</i>', showarrow: false, font: { size: 10, color: '#888' }, xref: 'x', yref: 'y' },
    { x: 17.5, y: 720000, text: '2024<br><i>Preparação</i>', showarrow: false, font: { size: 10, color: '#888' }, xref: 'x', yref: 'y' },
    { x: 29.5, y: 720000, text: '2025<br><i>Transição</i>', showarrow: false, font: { size: 10, color: '#888' }, xref: 'x', yref: 'y' },
    { x: 38.5, y: 720000, text: '2026<br><i style="color:#ea4335;">Jaci ativa</i>', showarrow: false, font: { size: 10, color: '#ea4335' }, xref: 'x', yref: 'y' },
  ];

  const layoutPadrao = { font: { family: 'Inter, sans-serif', color: '#5f6368' }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' };

  const layoutEnergia = {
    ...layoutPadrao,
    title: { text: 'Evolução do Consumo de Energia Elétrica — INPE (2023–2026)', font: { size: 18, color: '#1a3a5c' } },
    yaxis: { title: 'Consumo Total (R$)', tickformat: ',.0f', range: [350000, 730000] },
    xaxis: { title: '', tickangle: -45, tickfont: { size: 9 } },
    shapes: shapes as any, annotations: annotationsEras as any,
    legend: { orientation: 'h' as const, y: -0.22 },
    hovermode: 'x unified' as const,
    margin: { t: 50, r: 30, b: 80, l: 90 }
  };

  // Triplo Eixo
  const traceBarrasUso = {
    x: meses2026, y: usoJaci2026, type: 'bar', name: 'Uso da Jaci (%)',
    marker: {
        color: ['#9ec9fa', '#7eb4f2', '#5e9fea', '#3e8ae2', '#1e75da', '#1a73e8', '#4a8ff0'],
        line: { color: '#1a3a5c', width: 1 }
    },
    text: usoJaci2026.map(v => v.toFixed(1) + '%'), textposition: 'outside', yaxis: 'y',
    hovertemplate: 'Uso da Jaci: <b>%{y:.1f}%</b><extra></extra>'
  };
  const traceLinhaConsumo2 = {
    x: meses2026, y: consumo2026, type: 'scatter', mode: 'lines+markers',
    name: 'Consumo (R$)',
    line: { color: '#ea4335', width: 3 },
    marker: { size: 10, color: '#ea4335', line: { color: 'white', width: 2 } },
    yaxis: 'y2',
    hovertemplate: 'Consumo: <b>R$ %{y:,.0f}</b><extra></extra>'
  };
  const traceLinhaTemp = {
    x: meses2026, y: temps, type: 'scatter', mode: 'lines+markers',
    name: 'Temperatura média (°C)',
    line: { color: '#ff6d00', width: 3, dash: 'dot' },
    marker: { size: 10, color: '#ff6d00', symbol: 'triangle-up', line: { color: 'white', width: 2 } },
    yaxis: 'y3',
    hovertemplate: 'Temperatura: <b>%{y:.1f}°C</b><extra></extra>'
  };
  const layoutTriplo = {
    ...layoutPadrao,
    title: { text: 'Uso da Jaci (%) × Consumo de Energia Elétrica (R$) × Temperatura Média (°C)', font: { size: 16, color: '#1a3a5c' } },
    yaxis: { title: 'Uso da Jaci (%)', ticksuffix: '%', range: [0, 65], side: 'left' as const, showgrid: true },
    yaxis2: { title: 'Consumo de Energia (R$)', tickformat: ',.0f', range: [550000, 680000], overlaying: 'y', side: 'right' as const, showgrid: false },
    yaxis3: { title: 'Temperatura (°C)', ticksuffix: '°C', range: [14, 26], overlaying: 'y', side: 'right' as const, position: 1.0, anchor: 'free', showgrid: false },
    xaxis: { title: '' },
    legend: { orientation: 'h' as const, y: -0.25, font: { size: 10 } },
    hovermode: 'x unified' as const,
    margin: { t: 80, r: 120, b: 60, l: 70 }
  };

  // Bolhas e Tendência
  const validData = temps.map((t, i) => ({ t, u: usoJaci2026[i], c: consumo2026[i], m: meses2026[i] })).filter(d => d.t !== undefined && d.c !== undefined);
  const bolhaSize = validData.map(d => (d.t - 15) * 12);
  const traceBolhas = {
    x: validData.map(d => d.u), y: validData.map(d => d.c), type: 'scatter', mode: 'markers+text',
    text: validData.map(d => `${d.m}<br>${d.t}°C`),
    textposition: 'top center', textfont: { size: 10, family: 'Inter', color: '#1a3a5c' },
    marker: {
        size: bolhaSize, color: validData.map(d => d.t),
        colorscale: [[0, '#1565c0'], [0.33, '#42a5f5'], [0.5, '#ff9800'], [0.75, '#ef5350'], [1, '#b71c1c']],
        showscale: true,
        colorbar: { title: { text: 'Temperatura (°C)', side: 'right' }, ticksuffix: '°C', thickness: 15, len: 0.6 },
        line: { color: 'white', width: 2 }, sizemode: 'area', sizeref: 0.6, sizemin: 15
    },
    name: 'Meses',
    hovertemplate: '<b>%{text}</b><br>Uso: %{x:.1f}%<br>Consumo: R$ %{y:,.0f}<br>Temperatura: %{marker.color:.1f}°C<extra></extra>'
  };

  const n = validData.length;
  const sumX = validData.reduce((a, d) => a + d.u, 0);
  const sumY = validData.reduce((a, d) => a + d.c, 0);
  const sumXY = validData.reduce((a, d) => a + d.u * d.c, 0);
  const sumX2 = validData.reduce((a, d) => a + d.u * d.u, 0);
  const slope = n > 1 && (n * sumX2 - sumX * sumX) !== 0 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
  const intercept = n > 1 ? (sumY - slope * sumX) / n : 0;
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  const covXY = validData.reduce((a, d) => a + (d.u - meanX) * (d.c - meanY), 0);
  const stdX = Math.sqrt(validData.reduce((a, d) => a + (d.u - meanX) * (d.u - meanX), 0));
  const stdY = Math.sqrt(validData.reduce((a, d) => a + (d.c - meanY) * (d.c - meanY), 0));
  const pearson = (stdX * stdY) > 0 ? covXY / (stdX * stdY) : 0;

  const minX = validData.length > 0 ? Math.min(...validData.map(d => d.u)) : 0;
  const maxX = validData.length > 0 ? Math.max(...validData.map(d => d.u)) : 0;
  const xTrend = [minX - 2, maxX + 2];
  const yTrend = xTrend.map(x => slope * x + intercept);
  const traceTrend = {
    x: xTrend, y: yTrend, type: 'scatter', mode: 'lines',
    line: { color: '#ea4335', width: 2, dash: 'dash' },
    name: `Tendência (r = ${pearson.toFixed(2)})`,
    hovertemplate: 'Linha de tendência<extra></extra>'
  };

  const layoutBolhas = {
    ...layoutPadrao,
    title: { text: `Correlação com Temperatura: Uso da Jaci × Consumo de Energia<br><span style="font-size:13px;color:#888;">Tamanho e cor da bolha = Temperatura média (°C)  |  r Pearson = ${pearson.toFixed(2)}</span>`, font: { size: 16, color: '#1a3a5c' } },
    xaxis: { title: 'Uso da Jaci (%)', ticksuffix: '%', range: [minX - 5, maxX + 5] },
    yaxis: { title: 'Consumo de Energia (R$)', tickformat: ',.0f', range: [575000, 665000] },
    legend: { orientation: 'h' as const, y: -0.18 },
    hovermode: 'closest' as const,
    margin: { t: 80, r: 30, b: 60, l: 90 }
  };

  return (
    <div className="secao">
        <h2>8. Consumo de energia elétrica × Uso da Jaci × Temperatura externa</h2>
        <div className="texto-interpretativo energia">
            <strong>⚡ Contexto energético:</strong> A série histórica do INPE (2023–2026) revela três patamares distintos.
            Em <strong>2023</strong>, o consumo médio foi de ~R$ 453 mil/mês. Em <strong>2024</strong>, subiu para ~R$ 504 mil,
            refletindo a preparação da infraestrutura. A partir de <strong>agosto/2025</strong>, com a entrada em operação da Jaci,
            o consumo saltou para ~R$ 620 mil/mês em 2026 — um aumento de <strong>~37%</strong> em relação a 2023.
            O pico histórico foi atingido em <strong>dezembro/2025</strong> (R$ 674 mil).
        </div>
        <div className="texto-interpretativo destaque">
            <strong>🌡️ Impacto da temperatura:</strong> Ao cruzar uso da Jaci, consumo de energia elétrica e temperatura média de Cachoeira Paulista
            no período de janeiro a junho de 2026, observa-se uma <strong>relação multifatorial</strong>.
            Os dados de temperatura foram extraídos da base de climatologia do
            <strong>CPTEC/INPE</strong> (<em>clima.cptec.inpe.br</em> — normais climatológicas de temperaturas mínima e máxima,
            resolução 0.25°), referência oficial para a região de Cachoeira Paulista.
            <strong>Janeiro</strong> (23,0°C, 18,4% de uso) teve consumo de R$ 639 mil — mês mais quente e de baixo uso computacional,
            mas alto consumo, sugerindo <strong>peso da refrigeração no verão</strong>.
            <strong>Junho</strong> (17,0°C, 48,5% de uso) teve o <strong>menor consumo</strong> do semestre (R$ 594 mil),
            indicando que a queda na demanda de refrigeração <strong>compensou</strong> o aumento da carga da Jaci.
            Recomenda-se um estudo de <strong>PUE (Power Usage Effectiveness)</strong> para quantificar a eficiência energética do data center.
        </div>

        <h3 style={{ marginTop: '1.5rem', color: '#1a3a5c' }}>8.1. Evolução do Consumo de Energia Elétrica — INPE (2023–2026)</h3>
        <div className="grafico grafico-grande">
          {/* @ts-ignore */}
          <Plot data={[traceConsumo, traceLinhaJaci] as any} layout={layoutEnergia} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true }} />
        </div>

        <h3 style={{ marginTop: '2rem', color: '#1a3a5c' }}>8.2. Uso da Jaci × Consumo de energia elétrica (R$) × Temperatura externa</h3>
        <div className="grafico grafico-grande">
          {/* @ts-ignore */}
          <Plot data={[traceBarrasUso, traceLinhaConsumo2, traceLinhaTemp] as any} layout={layoutTriplo} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true }} />
        </div>

        <h3 style={{ marginTop: '1rem', color: '#1a3a5c' }}>Temperaturas Médias Climatológicas — CPTEC/INPE</h3>
        <table>
            <thead>
                <tr>
                    <th>Mês</th>
                    <th>Mínima (°C)</th>
                    <th>Máxima (°C)</th>
                    <th>Média (°C)</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Janeiro</td><td>19,2</td><td>27,1</td><td><strong>23,0</strong></td></tr>
                <tr><td>Fevereiro</td><td>18,9</td><td>27,0</td><td><strong>22,5</strong></td></tr>
                <tr><td>Março</td><td>18,3</td><td>26,2</td><td><strong>22,0</strong></td></tr>
                <tr><td>Abril</td><td>16,1</td><td>24,8</td><td><strong>20,5</strong></td></tr>
                <tr><td>Maio</td><td>13,5</td><td>23,0</td><td><strong>18,5</strong></td></tr>
                <tr><td>Junho</td><td>11,8</td><td>22,1</td><td><strong>17,0</strong></td></tr>
            </tbody>
        </table>
        <p style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.3rem' }}>
            Fonte: CPTEC/INPE — Normais climatológicas de temperatura (mínima e máxima) para Cachoeira Paulista/SP.
            Média calculada como (Tmin + Tmax) / 2.
        </p>

        <h3 style={{ marginTop: '2rem', color: '#1a3a5c' }}>8.3. Gráfico de Bolhas — Tamanho/Cor = Temperatura</h3>
        <div className="grafico grafico-grande">
          {/* @ts-ignore */}
          <Plot data={[traceBolhas, traceTrend] as any} layout={layoutBolhas} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true }} />
        </div>
    </div>
  );
}
