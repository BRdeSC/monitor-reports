"use client";
import React, { useState, useEffect } from 'react';
import './styles.css';

import { ReportHeader } from '@/components/monthly-report/ReportHeader';
import { KpiCards } from '@/components/monthly-report/KpiCards';
import { MonthlyUsageChart } from '@/components/monthly-report/MonthlyUsageChart';
import { DailyUsageChart } from '@/components/monthly-report/DailyUsageChart';
import { QueueUsageTable } from '@/components/monthly-report/QueueUsageTable';
import { TopUsersChart } from '@/components/monthly-report/TopUsersChart';
import { SankeyDiagram } from '@/components/monthly-report/SankeyDiagram';
import { JobSuccessSection } from '@/components/monthly-report/JobSuccessSection';
import { StorageUsageSection } from '@/components/monthly-report/StorageUsageSection';
import { EnergyClimateSection } from '@/components/monthly-report/EnergyClimateSection';

export default function RelatorioMensalPage() {
  const [selectedMonth, setSelectedMonth] = useState('07');
  const [selectedYear, setSelectedYear] = useState('2026');
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/metrics/api/reports/monthly?month=${selectedMonth}&year=${selectedYear}`);
        if (!response.ok) {
          throw new Error('Falha ao buscar dados do relatório');
        }
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedMonth, selectedYear]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [year, month] = e.target.value.split('-');
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleVoltarTopo = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthName = monthNames[parseInt(selectedMonth) - 1];

  return (
    <div className="relatorio-mensal">
      <ReportHeader 
        month={selectedMonth} 
        year={selectedYear} 
        availableMonths={data?.availableMonths}
        onMonthChange={handleMonthChange} 
        onPrint={handlePrint} 
      />

      <div className="container">
        {error && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
            Erro: {error}
          </div>
        )}

        {/* Introdução */}
        <div className="intro">
          <p>
            A implementação do supercomputador Jaci, combinada com avanços em armazenamento de dados e infraestrutura, 
            elevou significativamente a capacidade nacional de previsão de tempo e clima, o monitoramento e o processamento 
            de grandes volumes de dados meteorológicos e ambientais. A Coordenação de Infraestrutura de Dados e Supercomputação 
            (COIDS/CGIP) do INPE em Cachoeira Paulista - SP é responsável pela governança do Centro de Dados Científicos do Instituto. 
            Este relatório apresenta a utilização da Jaci no mês de {monthName.toLowerCase()} de {selectedYear}.
          </p>
        </div>

        {/* KPIs */}
        <KpiCards data={data?.kpis} loading={loading} monthName={monthName} />

        {/* Seção 1: Histórico de Uso */}
        <div className="secao" id="secao1">
          <h2>1. Evolução da Utilização da Jaci — Jan/{monthName} {selectedYear}</h2>
          <div className="texto-interpretativo">
            A trajetória de utilização da Jaci ao longo do primeiro semestre de 2026 revela uma
            <strong> curva de adoção acelerada</strong>. Partindo de patamares modestos em janeiro (18,44%), quando a infraestrutura ainda estava em fase inicial de operação,
            observa-se crescimento consistente mês a mês. O pico ocorreu em junho (48,45%), indicando a entrada de outras rodadas.
            A ligeira retração em julho (40,50%) pode refletir o recesso acadêmico de meio de ano.
            A <strong>disponibilidade média disponível de 65,42%</strong> sinaliza folga para absorver demandas crescentes.
          </div>
          <MonthlyUsageChart data={data?.historicalUsage} loading={loading} />
        </div>

        {/* Seção 2: Uso Diário */}
        <div className="secao" id="secao2">
          <h2>2. Uso diário da Jaci em {monthName} de {selectedYear}</h2>
          <div className="texto-interpretativo">
            O comportamento diário da Jaci apresenta <strong>forte variabilidade</strong>, oscilando entre 15,03% (dia 19) e 72,91% (dia 1). 
            Os três primeiros dias registraram os maiores picos, sugerindo processamento de jobs em fila. A partir do dia 4, observa-se redução acentuada 
            para a faixa de 20% a 40%, compatível com o recesso acadêmico. Picos secundários aparecem nos dias 16, 22 e 30. A média mensal 
            de <strong>40,5%</strong> confirma folga operacional mesmo no mês de maior uso do semestre.
          </div>
          <DailyUsageChart 
            data={data?.dailyUsage} 
            loading={loading} 
            monthName={monthName} 
            year={selectedYear} 
            avgUsage={data?.kpis?.avgUsage}
          />
        </div>

        {/* Seção 3: Horas CPU por Fila */}
        <div className="secao" id="secao3">
          <h2>3. Consumo de Núcleo/Hora por Fila</h2>
          <div className="texto-interpretativo">
            Os recursos computacionais são compartilhados através do sistema de filas <strong>Portable Batch System (PBS)</strong> com as
            seguintes filas configuradas na Jaci:
          </div>
          <QueueUsageTable data={data?.queueUsage} loading={loading} monthName={monthName} year={selectedYear} />
        </div>

        {/* Seção 4: Top Usuários */}
        <div className="secao" id="secao4">
          <h2>4. Top 10 Usuários por Núcleo/Hora</h2>
          <div className="texto-interpretativo">
            O ranking revela <strong>alta concentração de uso</strong>. O usuário <strong>ioper</strong> (conta operacional da DIPTC/CGCT) 
            lidera com 1,89 milhão de horas, correspondendo à fila <em>oper</em>. Os maiores consumidores científicos individuais são os usuários 
            <strong> joao.messias</strong> (1,24 Mh) e monan (968 mil horas), associados ao desenvolvimento do MONAN. Os cinco maiores usuários respondem por 
            <strong> ~71%</strong> do total processado, perfil típico de ambientes HPC.
          </div>
          <TopUsersChart data={data?.topUsers} loading={loading} monthName={monthName} year={selectedYear} />
        </div>

        {/* Seção 5: Sankey */}
        <div className="secao" id="secao5">
          <h2>5. Fluxo de Processamento: Usuários → Filas</h2>
          <div className="texto-interpretativo">
            O diagrama de Sankey foi com os <strong>dados reais de jobs executados</strong> em {monthName.toLowerCase()} de {selectedYear},
            considerando os principais fluxos científicos. O usuário <strong>diego.pereira</strong> é o que mais submeteu,
            com <strong>21.442 jobs</strong>, concentrados nas filas <em>longtime</em> (11.670) e <em>pesqextra</em> (9.772) —
            perfil típico de modelagem climática de longo prazo com alta demanda computacional.
            O usuário <strong>ioper</strong> aparece com 2.334 jobs exclusivamente na fila <em>oper</em>,
            refletindo as rotinas operacionais do INPE.
            O usuário <strong>jorge.gomes</strong> (2.052 jobs) e <strong>diego.chagas</strong> (1.363 jobs) distribuem suas submissões
            entre <em>pesqmidi</em> e <em>pesqhigh</em>, enquanto os usuários <strong>joao.messias</strong>, <strong>carlos.souza</strong>,
            <strong>monan</strong> e <strong>saulo.freitas</strong> utilizam exclusivamente a fila <em>pesqextra</em>.
            A fila <strong>pesqextra</strong> é a mais demandada em volume de jobs (13.334), seguida por <em>longtime</em> (11.670)
            e <em>pesqmidi</em> (2.205), confirmando o perfil de trabalhos de grande escala na Jaci.
          </div>
          <SankeyDiagram data={data?.sankeyFlows} loading={loading} />
        </div>

        {/* Seção 6: Erros */}
        <JobSuccessSection 
          errorsMonth={data?.errorsMonth} 
          successRateMonthly={data?.successRateMonthly} 
          errorsMonthly={data?.errorsMonthly}
          loading={loading}
        />

        {/* Seção 7: Disco */}
        <StorageUsageSection storageUsage={data?.storageUsage} loading={loading} />

        {/* Seção 8: Energia e Clima */}
        <EnergyClimateSection 
          energyClimate={data?.energyClimate} 
          historicalUsage={data?.historicalUsage} 
          loading={loading} 
        />

        <footer>
          <button className="btn-voltar-topo" onClick={handleVoltarTopo} title="Voltar ao início da página">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Voltar ao início
          </button>
          <p style={{ marginTop: '1.5rem' }}>
              Fonte: COIDS/CGIP/INPE — Relatório Mensal da Jaci | {monthName}/{selectedYear}<br/>
              Gráficos gerados com Plotly.js
          </p>
        </footer>
      </div>
    </div>
  );
}
