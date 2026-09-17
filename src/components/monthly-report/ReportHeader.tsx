"use client";
import React from 'react';

interface ReportHeaderProps {
  month: string;
  year: string;
  availableMonths?: string[]; // Ex: ['2026-08', '2026-07', '2026-06']
  onMonthChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onPrint: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function ReportHeader({ month, year, availableMonths = [], onMonthChange, onPrint }: ReportHeaderProps) {
  const currentMonthName = MONTH_NAMES[parseInt(month, 10) - 1] || month;

  return (
    <>
      <header>
        <h1>Relatório Mensal — Supercomputador Jaci</h1>
        <p>Referência: {currentMonthName} de {year} | INPE — Cachoeira Paulista</p>
        
        <button className="btn-pdf-topo" onClick={onPrint} title="Exportar relatório em PDF">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar PDF
        </button>
        
        <div className="header-controls">
          <select value={`${year}-${month}`} onChange={onMonthChange}>
            {availableMonths.length > 0 ? (
              availableMonths.map((ym) => {
                const [y, m] = ym.split('-');
                const mName = MONTH_NAMES[parseInt(m, 10) - 1];
                return (
                  <option key={ym} value={ym}>
                    {mName} / {y}
                  </option>
                );
              })
            ) : (
              <option value={`${year}-${month}`}>{currentMonthName} / {year}</option>
            )}
          </select>
        </div>
      </header>

      <nav className="nav-links">
        <a href="#kpi">Visão Geral</a>
        <a href="#secao1">Evolução Mensal</a>
        <a href="#secao2">Uso Diário</a>
        <a href="#secao3">Uso por Fila</a>
        <a href="#secao4">Top Usuários</a>
        <a href="#secao5">Fluxo de Dados</a>
        <a href="#secao6">Taxa de Sucesso</a>
      </nav>
    </>
  );
}