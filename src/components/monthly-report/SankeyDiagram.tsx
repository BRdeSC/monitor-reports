"use client";
import React from 'react';
import Plot from './PlotlyWrapper';

interface SankeyDiagramProps {
  data: { user_name: string; queue: string; value: number }[];
  loading: boolean;
}

export function SankeyDiagram({ data, loading }: SankeyDiagramProps) {
  if (loading || !data) {
    return (
      <>
        <div className="grafico grafico-muito-grande skeleton"></div>
        <div className="skeleton" style={{ height: '200px', marginTop: '2rem' }}></div>
      </>
    );
  }

  // Extrair nós únicos (usuários + filas)
  const usuariosSet = new Set(data.map(d => d.user_name));
  const filasSet = new Set(data.map(d => d.queue));
  const labels = [...Array.from(usuariosSet), ...Array.from(filasSet)];

  // Mapear nome do nó para índice
  const labelToIndex = new Map();
  labels.forEach((label, i) => labelToIndex.set(label, i));

  const source = data.map(d => labelToIndex.get(d.user_name));
  const target = data.map(d => labelToIndex.get(d.queue));
  const value = data.map(d => d.value);

  const coresUsuario = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0',
        '#00897b', '#00acc1', '#5c6bc0', '#8e24aa', '#fb8c00'];
  const coresFila = ['#e91e63', '#1a73e8', '#26a69a', '#9c27b0', '#fbbc04', '#00897b', '#00acc1', '#5c6bc0'];
  
  const coresSankey = [
    ...Array.from(usuariosSet).map((_, i) => coresUsuario[i % coresUsuario.length]),
    ...Array.from(filasSet).map((_, i) => coresFila[i % coresFila.length])
  ];

  const traceSankey = {
    type: 'sankey',
    orientation: 'h',
    node: {
        pad: 20,
        thickness: 24,
        line: { color: 'white', width: 0.5 },
        label: labels,
        color: coresSankey
    },
    link: {
        source: source,
        target: target,
        value: value,
        color: 'rgba(26, 115, 232, 0.25)'
    }
  };

  const layoutPadrao = {
    font: { family: 'Inter, sans-serif', color: '#5f6368' },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 60, r: 30, b: 40, l: 30 },
    title: { text: 'Fluxo de Processamento: Top 10 Usuários → Filas', font: { size: 16, color: '#1a3a5c' } },
  };

  // Gerar dados para a tabela
  const userMap = new Map<string, { total: number, queues: { name: string, count: number }[] }>();
  data.forEach(row => {
    if (!userMap.has(row.user_name)) {
      userMap.set(row.user_name, { total: 0, queues: [] });
    }
    const u = userMap.get(row.user_name)!;
    u.total += row.value;
    u.queues.push({ name: row.queue, count: row.value });
  });

  const tableData = Array.from(userMap.entries()).map(([name, info]) => {
    info.queues.sort((a, b) => b.count - a.count);
    const principal = info.queues.length > 0 ? info.queues[0].name : '-';
    return {
      nome: name,
      total: info.total,
      principal,
      filas: info.queues.map(q => q.name)
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <>
      <div id="grafico-sankey" className="grafico grafico-muito-grande">
        {/* @ts-ignore */}
        <Plot
          data={[traceSankey] as any}
          layout={layoutPadrao}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ responsive: true }}
        />
      </div>

      <h3 style={{ marginTop: '1.5rem', color: '#1a3a5c' }}> Tabela — Top usuários por jobs executados</h3>
      <table>
          <thead>
              <tr>
                  <th>Usuário</th>
                  <th>Total de Jobs</th>
                  <th>Principal Fila</th>
                  <th>Filas Utilizadas</th>
              </tr>
          </thead>
          <tbody>
            {tableData.map(u => (
              <tr key={u.nome}>
                <td><strong>{u.nome}</strong></td>
                <td>{u.total.toLocaleString('pt-BR')}</td>
                <td><span className="badge" style={{ background: '#1a73e8' }}>{u.principal}</span></td>
                <td style={{ fontSize: '0.85rem' }}>{u.filas.join(', ')}</td>
              </tr>
            ))}
          </tbody>
      </table>
    </>
  );
}
