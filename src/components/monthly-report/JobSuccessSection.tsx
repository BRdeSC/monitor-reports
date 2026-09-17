"use client";
import React from 'react';
import Plot from './PlotlyWrapper';

interface JobSuccessSectionProps {
  errorsMonth: { exit_status_type: string; count: number }[];
  successRateMonthly: { month: string; successRate: number; totalJobs: number; successJobs: number }[];
  errorsMonthly: { month: string; errors: { exit_status_type: string; count: number }[] }[];
  loading: boolean;
}

const CATEGORY_MAP: Record<string, { nome: string; cor: string; codigos: string }> = {
  'success': { nome: '✅ Sucesso', cor: '#34a853', codigos: 'exit 0' },
  'generic_error': { nome: '⚠️ Erro genérico', cor: '#ea4335', codigos: 'generic_error' },
  'walltime_exceeded': { nome: '⏱️ Walltime excedido', cor: '#fbbc04', codigos: 'walltime_exceeded' },
  'other_-29': { nome: '📡 Finalizado por sinal (-29)', cor: '#ff6d00', codigos: 'other_-29' },
  'execution_error': { nome: '💻 Erro de execução', cor: '#9c27b0', codigos: 'other_127, other_255, other_254' },
  'system_kill': { nome: '🛑 Finalizado pelo sistema', cor: '#e91e63', codigos: 'other_143, other_9, other_265' },
  'other_errors': { nome: '📦 Outros erros', cor: '#795548', codigos: 'other_21, 20, 211, 228, 249, 28, 29, 60, 95, 99' },
  'app_error': { nome: '🔧 Erro de aplicação', cor: '#00bcd4', codigos: 'other_139, other_134' },
  'invalid_usage': { nome: '🚫 Uso inválido', cor: '#607d8b', codigos: 'invalid_usage' },
  'oom_killed': { nome: '💾 Memória excedida (OOM)', cor: '#880e4f', codigos: 'oom_killed' },
  'other_-2': { nome: '🔚 Interrompido (-2)', cor: '#455a64', codigos: 'other_-2' }
};

const mapCategory = (rawType: string) => {
  if (!rawType) return 'success';
  if (CATEGORY_MAP[rawType]) return rawType;
  if (['other_127', 'other_255', 'other_254'].includes(rawType)) return 'execution_error';
  if (['other_143', 'other_9', 'other_265'].includes(rawType)) return 'system_kill';
  if (['other_139', 'other_134'].includes(rawType)) return 'app_error';
  if (['other_21', 'other_20', 'other_211', 'other_228', 'other_249', 'other_28', 'other_29', 'other_60', 'other_95', 'other_99'].includes(rawType)) return 'other_errors';
  if (rawType.startsWith('other_')) return 'other_errors';
  return 'other_errors';
};

export function JobSuccessSection({ errorsMonth, successRateMonthly, errorsMonthly, loading }: JobSuccessSectionProps) {
  if (loading || !errorsMonth) {
    return <div className="grafico grafico-grande skeleton"></div>;
  }

  // 6.1 Donut de Sucesso e Tabela
  const errorCounts = new Map<string, number>();
  let totalJobs = 0;
  let successJobs = 0;

  errorsMonth.forEach(row => {
    totalJobs += row.count;
    if (!row.exit_status_type || row.exit_status_type === '0' || row.exit_status_type === 'success') {
      successJobs += row.count;
      errorCounts.set('success', (errorCounts.get('success') || 0) + row.count);
    } else {
      const cat = mapCategory(row.exit_status_type);
      errorCounts.set(cat, (errorCounts.get(cat) || 0) + row.count);
    }
  });

  const erroValor = totalJobs - successJobs;
  const traceSucessoDonut = {
    values: [successJobs, erroValor],
    labels: ['Sucesso', 'Erro/Falha'],
    type: 'pie', hole: 0.6,
    marker: { colors: ['#34a853', '#ea4335'], line: { color: 'white', width: 3 } },
    textinfo: 'label+percent', textposition: 'outside', textfont: { size: 14 },
    hovertemplate: '<b>%{label}</b><br>Jobs: %{value:,}<br>%{percent}<extra></extra>'
  };

  const layoutPadrao = {
    font: { family: 'Inter, sans-serif', color: '#5f6368' },
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 50, r: 30, b: 60, l: 60 }
  };

  const layoutDonut = {
    ...layoutPadrao,
    title: { text: `Taxa de Sucesso dos Jobs (${totalJobs.toLocaleString('pt-BR')} jobs)`, font: { size: 18, color: '#1a3a5c' } },
    annotations: [{
      text: `${(totalJobs > 0 ? (successJobs/totalJobs*100) : 0).toFixed(1)}%<br><span style="font-size:14px;color:#666">de sucesso</span>`,
      x: 0.5, y: 0.5, font: { size: 22, color: '#34a853', family: 'Inter' }, showarrow: false
    }],
    showlegend: true, legend: { orientation: 'h' as const, y: -0.12 }
  };

  const tableData = Array.from(errorCounts.entries()).map(([catKey, count]) => {
    return { key: catKey, count, config: CATEGORY_MAP[catKey] };
  }).sort((a, b) => b.count - a.count);

  // 6.2 Evolução da Taxa de Sucesso
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const labelsMes = successRateMonthly.map(s => meses[parseInt(s.month, 10) - 1]);
  
  const traceTaxaSucesso = {
    x: labelsMes, y: successRateMonthly.map(s => s.successRate),
    type: 'scatter', mode: 'lines+markers',
    line: { color: '#34a853', width: 3 },
    marker: { size: 10, color: '#34a853', line: { color: 'white', width: 2 } },
    fill: 'tozeroy', fillcolor: 'rgba(52, 168, 83, 0.12)',
    text: successRateMonthly.map(s => s.successRate.toFixed(1) + '%'), textposition: 'top center',
    textfont: { size: 11, color: '#1a3a5c', family: 'Inter' },
    hovertemplate: '%{x}: <b>%{y:.1f}%</b><extra></extra>'
  };
  const traceMeta = {
    x: labelsMes, y: Array(labelsMes.length).fill(95),
    type: 'scatter', mode: 'lines', name: 'Meta: 95%',
    line: { color: '#fbbc04', width: 2, dash: 'dot' },
    hovertemplate: 'Meta: %{y:.0f}%<extra></extra>'
  };
  const layoutEvolucao = {
    ...layoutPadrao,
    title: { text: 'Evolução da Taxa de Sucesso dos Jobs', font: { size: 18, color: '#1a3a5c' } },
    yaxis: { title: 'Taxa de Sucesso (%)', range: [70, 100], ticksuffix: '%' },
    xaxis: { title: '' },
    legend: { orientation: 'h' as const, y: -0.18 },
    hovermode: 'x unified' as const
  };

  // 6.3 Erros por Mês Stacked Bar
  const catsMes = Object.keys(CATEGORY_MAP).filter(k => k !== 'success');
  const errMesData: Record<string, number[]> = {};
  catsMes.forEach(c => errMesData[c] = Array(labelsMes.length).fill(0));

  errorsMonthly.forEach((monthData, idx) => {
    monthData.errors.forEach(err => {
      if (err.exit_status_type && err.exit_status_type !== '0') {
        const cat = mapCategory(err.exit_status_type);
        if (cat !== 'success') {
          errMesData[cat][idx] += err.count;
        }
      }
    });
  });

  const tracesErroMes = catsMes.map(cat => ({
    x: labelsMes, y: errMesData[cat], name: CATEGORY_MAP[cat].nome.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '').trim(),
    type: 'bar', marker: { color: CATEGORY_MAP[cat].cor },
    hovertemplate: '<b>%{data.name}</b><br>%{x}: %{y} jobs<extra></extra>'
  }));

  const layoutErrosMensal = {
    ...layoutPadrao, barmode: 'stack' as const,
    title: { text: 'Distribuição Mensal de Erros por Categoria', font: { size: 18, color: '#1a3a5c' } },
    yaxis: { title: 'Quantidade de Jobs com Erro' },
    xaxis: { title: '' },
    legend: { orientation: 'h' as const, y: -0.3, font: { size: 10 } },
    hovermode: 'x unified' as const
  };

  return (
    <div className="secao">
        <h2>6. Análise da taxa de sucesso de execução dos jobs</h2>
        <div className="texto-interpretativo erro">
            Em julho de 2026, a Jaci processou <strong>{totalJobs.toLocaleString('pt-BR')} jobs</strong>, alcançando uma
            <strong> taxa de sucesso de {(totalJobs > 0 ? (successJobs/totalJobs*100) : 0).toFixed(1)}%</strong> — o segundo melhor índice do ano, atrás apenas de março (96,7%).
            O principal fator de insucesso foram os <strong>erros genéricos de aplicação</strong> (1,7%), seguidos por
            <strong> estouro de walltime</strong> (1,6%). Chama atenção a categoria de <strong>finalização por sinal do sistema</strong>
            (SIGTERM/SIGKILL), que somou 139 ocorrências — estas geralmente indicam jobs excedendo limites de recurso ou intervenções administrativas ou do usuário.
        </div>

        <h3 style={{ marginTop: '1.5rem', color: '#1a3a5c' }}>6.1. Taxa de sucesso de execução dos jobs</h3>
        <div className="grafico grafico-grande">
          {/* @ts-ignore */}
          <Plot data={[traceSucessoDonut] as any} layout={layoutDonut} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true }} />
        </div>

        <h3 style={{ marginTop: '1rem', color: '#1a3a5c' }}>Tabela de Categorias de Erro</h3>
        <table>
            <thead>
                <tr>
                    <th>Categoria</th>
                    <th>Jobs</th>
                    <th>% do Total</th>
                    <th>Códigos PBS Originais</th>
                </tr>
            </thead>
            <tbody>
              {tableData.map(cat => {
                const pct = totalJobs > 0 ? (cat.count / totalJobs * 100).toFixed(1) : '0.0';
                const isSucesso = cat.key === 'success';
                return (
                  <tr key={cat.key}>
                    <td><strong>{cat.config.nome}</strong></td>
                    <td>{cat.count.toLocaleString('pt-BR')}</td>
                    <td style={{ color: isSucesso ? '#34a853' : '#ea4335', fontWeight: 600 }}>{pct}%</td>
                    <td style={{ fontSize: '0.82rem', color: '#888' }}>{cat.config.codigos}</td>
                  </tr>
                );
              })}
            </tbody>
        </table>

        <h3 style={{ marginTop: '2rem', color: '#1a3a5c' }}>6.2. Evolução da Taxa de Sucesso</h3>
        <div className="grafico grafico-grande">
          {/* @ts-ignore */}
          <Plot data={[traceTaxaSucesso, traceMeta] as any} layout={layoutEvolucao} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true }} />
        </div>

        <h3 style={{ marginTop: '2rem', color: '#1a3a5c' }}>6.3. Categorias de Erro por Mês</h3>
        <div className="grafico grafico-grande">
          {/* @ts-ignore */}
          <Plot data={tracesErroMes as any} layout={layoutErrosMensal} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true }} />
        </div>
    </div>
  );
}
