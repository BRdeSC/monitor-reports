import { startOfMonth, endOfMonth, formatISO } from 'date-fns';

export function getMonthInterval(year: number, month: number) {
  // Mês no JS começa em 0 (Janeiro = 0), por isso month - 1
  const date = new Date(year, month - 1, 1);
  
  return {
    start: formatISO(startOfMonth(date)), // Ex: 2026-03-01T00:00:00Z
    end: formatISO(endOfMonth(date)),     // Ex: 2026-03-31T23:59:59Z
  };
}

export interface HostReport {
  instance: string;
  nodename: string;
  cpu: number;
  mem: number;
  network: number;
}

export function getSortDescription(
  sortField: 'cpu' | 'mem' | 'memory' | 'network' | 'nodename' | 'hostname',
  sortDirection: 'asc' | 'desc'
): string {
  const isDesc = sortDirection === 'desc';
  const field = sortField.toLowerCase();

  if (field === 'cpu') {
    return isDesc ? 'MAIORES médias de consumo de CPU' : 'MENORES médias de consumo de CPU';
  }
  if (field === 'mem' || field === 'memory') {
    return isDesc ? 'MAIORES médias de consumo de MEMÓRIA' : 'MENORES médias de consumo de MEMÓRIA';
  }
  if (field === 'network') {
    return isDesc ? 'MAIORES volumes de tráfego de rede' : 'MENORES volumes de tráfego de rede';
  }
  if (field === 'nodename' || field === 'hostname') {
    return isDesc ? 'ORDEM ALFABÉTICA (Z-A)' : 'ORDEM ALFABÉTICA (A-Z)';
  }
  return '';
}

export function formatExtractionTimestamp(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${d}/${m}/${y} às ${h}:${min}`;
}

export function filterReportData(data: HostReport[], environment: string, searchQuery: string): HostReport[] {
  return data.filter(item => {
    // Busca por Hostname
    if (searchQuery.trim() !== '') {
      const matchesSearch = item.nodename.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }

    // Filtragem de Ambiente (COIDS vs SESUP)
    if (environment === 'all') return true;
    
    const name = item.nodename.toLowerCase();
    const inst = item.instance.toLowerCase();
    
    // Data Center COIDS: contêm ".COIDS.INPE.BR" ou IPs do bloco do COIDS (ex: 150.163.212.*, 150.163.214.*)
    const isCoids = name.includes('.coids.inpe.br') || 
                    inst.includes('.coids.inpe.br') || 
                    /\b150\.163\.21[2-4]\./.test(inst);

    if (environment === 'coids') return isCoids;

    // Data Center SESUP: contêm ".CPTEC.INPE.BR" ou nomes específicos
    if (environment === 'sesup') {
      const sesupKeywords = ['areias', 'equinocio', 'oliveira', 'beberibe', 'trude', 'ouro', 'quilombo'];
      const isSesup = name.includes('.cptec.inpe.br') || 
                      inst.includes('.cptec.inpe.br') || 
                      sesupKeywords.some(kw => name.includes(kw)) ||
                      sesupKeywords.some(kw => inst.includes(kw));
      return isSesup;
    }
    
    return true;
  });
}

export function sortReportData(
  data: HostReport[],
  sortColumn: 'nodename' | 'cpu' | 'mem' | 'network' | 'hostname',
  sortDirection: 'asc' | 'desc'
): HostReport[] {
  return [...data].sort((a, b) => {
    const col = sortColumn === 'hostname' ? 'nodename' : sortColumn;
    if (col === 'nodename') {
      return sortDirection === 'asc' 
        ? a.nodename.localeCompare(b.nodename)
        : b.nodename.localeCompare(a.nodename);
    }
    
    // Safety check for valid keys
    const key = col === 'mem' ? 'mem' : (col as keyof HostReport);
    const valA = (a[key] as number) || 0;
    const valB = (b[key] as number) || 0;
    if (sortDirection === 'asc') {
      return valA - valB;
    } else {
      return valB - valA;
    }
  });
}

export function formatDateDDMMYYYY(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}