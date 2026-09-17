"use client";
import React from 'react';
import Plot from './PlotlyWrapper';

interface StorageUsageSectionProps {
  storageUsage: { grupos: string[]; usoTB: number[] };
  loading: boolean;
}

export function StorageUsageSection({ storageUsage, loading }: StorageUsageSectionProps) {
  if (loading || !storageUsage) {
    return <div className="grafico grafico-grande skeleton"></div>;
  }

  const { grupos, usoTB } = storageUsage;
  const totalDisco = usoTB.reduce((a, b) => a + b, 0);

  const coresDisco = [
    '#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0',
    '#00897b', '#00acc1', '#5c6bc0', '#8e24aa', '#fb8c00'
  ];

  const traceDisco = {
    y: [...grupos].reverse(),
    x: [...usoTB].reverse(),
    type: 'bar',
    orientation: 'h',
    marker: {
        color: [...coresDisco].reverse(),
        line: { color: 'white', width: 1 }
    },
    text: [...usoTB].reverse().map(v => v.toFixed(2) + ' TB'),
    textposition: 'outside',
    hovertemplate: '<b>%{y}</b><br>%{x:.2f} TB<extra></extra>'
  };

  const layoutPadrao = {
    font: { family: 'Inter, sans-serif', color: '#5f6368' },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 50, r: 100, b: 60, l: 130 },
    title: { text: 'Top 10 Grupos por Uso de Disco', font: { size: 18, color: '#1a3a5c' } },
    xaxis: { title: 'Uso (TB)', range: [0, 2550] },
    yaxis: { title: '', autorange: 'reversed' as const },
  };

  return (
    <div className="secao">
        <h2>7. Uso do sistema de armazenamento de dados paralelo por grupo de trabalho</h2>
        <div className="texto-interpretativo disco">
            <strong>💾 Distribuição do armazenamento de dados paralelo:</strong> O grupo <strong>ioper</strong> lidera o consumo de disco
            com impressionantes <strong>2.283 TB</strong>, representando <strong>54,8%</strong> de todo o armazenamento
            consumido pelo top 10. Em segundo lugar, <strong>sysadmin</strong> ocupa 714,71 TB (17,2%), seguido por
            <strong>monan_adm</strong> com 552,82 TB (13,3%) — este último reflete o grande volume de dados gerados pelo
            modelo de previsão numérica de tempo e clima MONAN. Os grupos ligados ao MONAN (<em>monan_adm</em>, <em>monan_goc</em>,
            <em>monan_atm</em> e <em>monan_das</em>) somam juntos <strong>652,60 TB</strong> (15,7%), evidenciando
            a relevância deste modelo no consumo de recursos da Jaci. O grupo de trabalho <strong>big</strong> (368,03 TB) e o grupo de trabalho <strong>gtc</strong> (56,73 TB) completam os cinco maiores consumidores de área de armazenamento de dados paralelo. A concentração nos três primeiros grupos (85,2%) sugere que os dados operacionais e de modelagem climática dominam o uso
            do sistema de arquivos paralelo Lustre.
        </div>

        <h3 style={{ color: '#1a3a5c' }}>7.1. Top 10 grupos de trabalho do sistema de armazenamento de dados paralelo</h3>
        <div className="grafico grafico-grande">
          {/* @ts-ignore */}
          <Plot data={[traceDisco] as any} layout={layoutPadrao} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true }} />
        </div>

        <h3 style={{ marginTop: '1rem', color: '#1a3a5c' }}>Tabela de Consumo de Disco por Grupo</h3>
        <table>
            <thead>
                <tr>
                    <th>Posição</th>
                    <th>Grupo</th>
                    <th>Uso (TB)</th>
                    <th>% do Top 10</th>
                </tr>
            </thead>
            <tbody>
              {grupos.map((g, i) => {
                const pct = (usoTB[i] / totalDisco * 100).toFixed(1);
                const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
                return (
                  <tr key={g}>
                    <td>{medalha}</td>
                    <td><strong>{g}</strong></td>
                    <td>{usoTB[i].toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
        </table>
    </div>
  );
}
