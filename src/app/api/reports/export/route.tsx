import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';
import { 
  getSortDescription, 
  formatExtractionTimestamp, 
  filterReportData, 
  sortReportData, 
  HostReport,
  formatDateDDMMYYYY
} from '@/lib/utils';
import { getConsolidatedMetrics } from '@/lib/prometheus';

// PDF Styles
const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 15,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
  },
  meta: {
    textAlign: 'right',
  },
  metaText: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  metaValue: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  auditBlock: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
  },
  auditTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  auditLabel: {
    fontSize: 7.5,
    color: '#64748b',
  },
  auditValue: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 6,
    fontSize: 7.5,
  },
  colHost: {
    width: '32%',
    paddingLeft: 6,
  },
  colInstance: {
    width: '28%',
  },
  colCpu: {
    width: '12%',
    textAlign: 'right',
  },
  colMem: {
    width: '12%',
    textAlign: 'right',
  },
  colNet: {
    width: '16%',
    textAlign: 'right',
    paddingRight: 6,
  },
  headerText: {
    fontWeight: 'bold',
    color: '#475569',
  },
  rowText: {
    color: '#334155',
  },
  boldText: {
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#94a3b8',
    fontSize: 8,
  }
});

const MyPDFDocument = ({ 
  items, 
  range, 
  environment, 
  searchQuery, 
  scope,
  sortField,
  sortDirection,
  timestamp,
  startDate,
  endDate
}: { 
  items: HostReport[], 
  range: string, 
  environment: string, 
  searchQuery: string, 
  scope: string,
  sortField?: 'nodename' | 'cpu' | 'mem' | 'network' | 'hostname',
  sortDirection?: 'asc' | 'desc',
  timestamp?: string,
  startDate?: string,
  endDate?: string
}) => {
  const envLabel = environment === 'all' 
    ? 'TODOS' 
    : environment === 'coids' 
      ? 'DATA CENTER COIDS' 
      : 'DATA CENTER SESUP';

  const reportSubtitle = scope === 'top10' 
    ? 'Relatório de Utilização Média de Hosts - TOP 10 Parcial' 
    : 'Relatório de Utilização Média de Hosts - Geral Completo';

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <View>
            <Text style={pdfStyles.title}>MONITOR REPORTS</Text>
            <Text style={pdfStyles.subtitle}>{reportSubtitle}</Text>
          </View>
          {/* <View style={pdfStyles.meta}>
            <Text style={pdfStyles.metaText}>Período: <Text style={pdfStyles.metaValue}>{range === '1d' ? 'Último 1 dia (24h)' : range === '7d' ? 'Última 1 semana (7d)' : `Últimos ${range.replace('d', '')} dias`}</Text></Text>
            <Text style={pdfStyles.metaText}>Ambiente: <Text style={pdfStyles.metaValue}>{envLabel}</Text></Text>
            {searchQuery && <Text style={pdfStyles.metaText}>Busca: <Text style={pdfStyles.metaValue}>"{searchQuery}"</Text></Text>}
            <Text style={pdfStyles.metaText}>Total de Hosts: <Text style={pdfStyles.metaValue}>{items.length}</Text></Text>
          </View> */}
        </View>

        {/* Bloco Estruturado de Metadados / Auditoria */}
        {sortField && sortDirection && (
          <View style={pdfStyles.auditBlock}>
            <Text style={pdfStyles.auditTitle}>Informações das métricas para Extração dos dados</Text>
            <View style={pdfStyles.auditRow}>
              <Text style={pdfStyles.auditLabel}>
                Ambiente: <Text style={pdfStyles.auditValue}>{envLabel}</Text>
              </Text>
              <Text style={pdfStyles.metaText}>
                Total de Hosts: <Text style={pdfStyles.metaValue}>{items.length}</Text>
              </Text>
              <Text style={pdfStyles.auditLabel}>
                Critério de Ordenação: <Text style={pdfStyles.auditValue}>{getSortDescription(sortField, sortDirection)}</Text>
              </Text>
              
            </View>
            <View style={pdfStyles.auditRow}>
              <Text style={pdfStyles.auditLabel}>
                Período de Coleta: <Text style={pdfStyles.auditValue}>
                  {startDate && endDate ? `de ${startDate} às 00:00 até ${endDate} às 00:00` : (range === '1d' ? 'Último 1 dia (24h)' : range === '7d' ? 'Última 1 semana (7d)' : `Últimos ${range.replace('d', '')} dias`)}
                </Text>
              </Text>
              {timestamp && (
                <Text style={pdfStyles.auditLabel}>
                  Extraído em: <Text style={pdfStyles.auditValue}>{timestamp}</Text>
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Table */}
        <View style={pdfStyles.table}>
          {/* Table Header */}
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.colHost, pdfStyles.headerText]}>Hostname</Text>
            <Text style={[pdfStyles.colInstance, pdfStyles.headerText]}>Instância</Text>
            <Text style={[pdfStyles.colCpu, pdfStyles.headerText]}>CPU Média</Text>
            <Text style={[pdfStyles.colMem, pdfStyles.headerText]}>Memória Média</Text>
            <Text style={[pdfStyles.colNet, pdfStyles.headerText]}>Rede</Text>
          </View>

          {/* Table Rows */}
          {items.map((item, index) => (
            <View key={index} style={pdfStyles.tableRow} wrap={false}>
              <Text style={[pdfStyles.colHost, pdfStyles.rowText, pdfStyles.boldText]}>{item.nodename.toUpperCase()}</Text>
              <Text style={[pdfStyles.colInstance, pdfStyles.rowText]}>{item.instance}</Text>
              <Text style={[pdfStyles.colCpu, pdfStyles.rowText, item.cpu > 80 ? { color: '#e11d48', fontWeight: 'bold' } : {}]}>{item.cpu.toFixed(1)}%</Text>
              <Text style={[pdfStyles.colMem, pdfStyles.rowText, item.mem > 85 ? { color: '#e11d48', fontWeight: 'bold' } : {}]}>{item.mem.toFixed(1)}%</Text>
              <Text style={[pdfStyles.colNet, pdfStyles.rowText]}>{item.network.toFixed(2)} MB/s</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text>Monitor Reports - Datacenter Monitoring System</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';
    const range = searchParams.get('range') || '30d';
    const environment = searchParams.get('environment') || 'all';
    const searchQuery = searchParams.get('searchQuery') || '';
    const scope = searchParams.get('scope') || 'all';
    const sortField = (searchParams.get('sortField') as any) || 'nodename';
    const sortDirection = (searchParams.get('sortDirection') as any) || 'asc';
    const timestampParam = searchParams.get('timestamp') || '';

    if (format !== 'pdf') {
      return NextResponse.json({ success: false, error: 'Apenas formato PDF é suportado via GET' }, { status: 400 });
    }

    // 1. Busca dados consolidados do Prometheus
    const { data: rawData, timestamp: extractedAt, startDate, endDate } = await getConsolidatedMetrics(range);

    // 2. Aplica filtragem (ambiente e hostname)
    const filtered = filterReportData(rawData, environment, searchQuery);

    // 3. Aplica ordenação
    const sorted = sortReportData(filtered, sortField, sortDirection);

    // 4. Aplica escopo (all ou top10)
    const items = scope === 'top10' ? sorted.slice(0, 10) : sorted;

    const formattedTimestamp = (timestampParam && timestampParam.includes(' às '))
      ? timestampParam
      : formatExtractionTimestamp(timestampParam || extractedAt);

    const startDateParam = searchParams.get('startDate') || formatDateDDMMYYYY(startDate);
    const endDateParam = searchParams.get('endDate') || formatDateDDMMYYYY(endDate);

    // 5. Gera o stream do PDF
    const stream = await pdf(
      <MyPDFDocument 
        items={items} 
        range={range} 
        environment={environment} 
        searchQuery={searchQuery} 
        scope={scope}
        sortField={sortField}
        sortDirection={sortDirection}
        timestamp={formattedTimestamp}
        startDate={startDateParam}
        endDate={endDateParam}
      />
    ).toBuffer();

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="relatorio_utilizacao.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Erro na exportação do relatório via GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      items, 
      format, 
      range = '30d', 
      environment = 'all', 
      searchQuery = '', 
      scope = 'all',
      sortField = 'nodename',
      sortDirection = 'asc',
      timestamp,
      startDate,
      endDate
    } = body;

    if (!items || !format) {
      return NextResponse.json({ success: false, error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const envLabel = environment === 'all' 
      ? 'TODOS' 
      : environment === 'coids' 
        ? 'DATA CENTER COIDS' 
        : 'DATA CENTER SESUP';

    const sortDesc = getSortDescription(sortField, sortDirection);
    const formattedTimestamp = (timestamp && typeof timestamp === 'string' && timestamp.includes(' às '))
      ? timestamp
      : formatExtractionTimestamp(timestamp || new Date());

    let useStartDate = startDate;
    let useEndDate = endDate;

    if (!useStartDate || !useEndDate) {
      const { startDate: calcStart, endDate: calcEnd } = await getConsolidatedMetrics(range);
      useStartDate = useStartDate || formatDateDDMMYYYY(calcStart);
      useEndDate = useEndDate || formatDateDDMMYYYY(calcEnd);
    }

    if (format === 'pdf') {
      const stream = await pdf(
        <MyPDFDocument 
          items={items} 
          range={range} 
          environment={environment} 
          searchQuery={searchQuery} 
          scope={scope}
          sortField={sortField}
          sortDirection={sortDirection}
          timestamp={formattedTimestamp}
          startDate={useStartDate}
          endDate={useEndDate}
        />
      ).toBuffer();
      return new NextResponse(stream as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="relatorio_utilizacao.pdf"`,
        },
      });
    }

    if (format === 'xlsx') {
      const envLabelShort = environment === 'all' 
        ? 'TODOS' 
        : environment === 'coids' 
          ? 'COIDS' 
          : 'SESUP';

      const title = `RELATÓRIO DE UTILIZAÇÃO MÉDIA DE HOSTS - ${envLabelShort}`;
      const criterion = `Critério de Ordenação: ${sortDesc}`;
      const extraction = `Extraído em: ${formattedTimestamp}`;

      const headers = ['Hostname', 'Instância (Prometheus)', 'CPU Média (%)', 'Memória Média (%)', 'Tráfego Rede Médio (MB/s)'];
      const rows = items.map((item: any) => [
        item.nodename.toUpperCase(),
        item.instance,
        Number(item.cpu.toFixed(2)),
        Number(item.mem.toFixed(2)),
        Number(item.network.toFixed(2))
      ]);

      const wsData = [
        [title],
        [criterion],
        [extraction],
        [], // Linha 4 em branco
        headers, // Linha 5
        ...rows // Linhas 6+
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Estilos de metadados
      const metaStyle = {
        font: { italic: true, sz: 10, color: { rgb: "7F8C8D" } }
      };
      if (ws['A1']) ws['A1'].s = metaStyle;
      if (ws['A2']) ws['A2'].s = metaStyle;
      if (ws['A3']) ws['A3'].s = metaStyle;

      // Estilos do header da tabela
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "334155" } } // Slate background
      };
      ['A5', 'B5', 'C5', 'D5', 'E5'].forEach(cell => {
        if (ws[cell]) ws[cell].s = headerStyle;
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Métricas');

      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="relatorio_utilizacao.xlsx"`,
        },
      });
    }

    if (format === 'csv') {
      const metadataLines = [
        `# RELATÓRIO DE UTILIZAÇÃO MÉDIA DE HOSTS - ${envLabel}`,
        `# CRITÉRIO: ${sortDesc}`,
        `# DATA EXTRAÇÃO: ${formattedTimestamp}`,
        '' // Linha em branco
      ];

      const headers = ['Hostname', 'Instancia (Prometheus)', 'Média CPU (%)', 'Média Memória (%)', 'Tráfego Rede Médio (MB/s)'];
      const rows = items.map((item: any) => [
        item.nodename.toUpperCase(),
        item.instance,
        item.cpu.toFixed(2),
        item.mem.toFixed(2),
        item.network.toFixed(2)
      ]);

      const csvContent = [
        ...metadataLines,
        headers.join(','),
        ...rows.map((row: string[]) => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const csvBuffer = Buffer.from(csvContent, 'utf-8');
      return new NextResponse(csvBuffer, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="relatorio_utilizacao.csv"`,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Formato não suportado' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na exportação do relatório:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
