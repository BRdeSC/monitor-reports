import { startOfMonth, endOfMonth, formatISO } from 'date-fns';

export function getMonthInterval(year: number, month: number) {
  // Mês no JS começa em 0 (Janeiro = 0), por isso month - 1
  const date = new Date(year, month - 1, 1);
  
  return {
    start: formatISO(startOfMonth(date)), // Ex: 2026-03-01T00:00:00Z
    end: formatISO(endOfMonth(date)),     // Ex: 2026-03-31T23:59:59Z
  };
}