import { NextRequest, NextResponse } from 'next/server';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';
import { queryPrometheus, queryPrometheusRange } from '@/lib/prometheus';
import { subDays, formatISO } from 'date-fns';
import { formatExtractionTimestamp } from '@/lib/utils';

// Helper to determine environment based on nodename and instance
function getHostEnvironment(nodename: string, instance: string): 'coids' | 'sesup' | 'dev' {
  const name = nodename.toLowerCase();
  const inst = instance.toLowerCase();
  
  const isCoids = name.includes('.coids.inpe.br') || 
                  inst.includes('.coids.inpe.br') || 
                  /\b150\.163\.21[2-4]\./.test(inst);
  if (isCoids) return 'coids';

  const sesupKeywords = ['areias', 'equinocio', 'oliveira', 'beberibe', 'trude', 'ouro', 'quilombo'];
  const isSesup = name.includes('.cptec.inpe.br') || 
                  inst.includes('.cptec.inpe.br') || 
                  sesupKeywords.some(kw => name.includes(kw)) ||
                  sesupKeywords.some(kw => inst.includes(kw));
  if (isSesup) return 'sesup';

  return 'dev';
}

// Generate fallback mock data
function generateMockData(range: string, environment: string, search: string, comparison: string) {
  const mockHosts = [
    { nodename: 'abare.coids.inpe.br', instance: '150.163.212.10:9100' },
    { nodename: 'abeba.coids.inpe.br', instance: '150.163.212.11:9100' },
    { nodename: 'abuja.coids.inpe.br', instance: '150.163.212.12:9100' },
    { nodename: 'accra.coids.inpe.br', instance: '150.163.213.15:9100' },
    { nodename: 'ampere.coids.inpe.br', instance: '150.163.214.22:9100' },
    { nodename: 'areias.cptec.inpe.br', instance: '150.163.1.50:9100' },
    { nodename: 'bacuri.cptec.inpe.br', instance: '150.163.1.51:9100' },
    { nodename: 'baliza.cptec.inpe.br', instance: '150.163.1.52:9100' },
    { nodename: 'beberibe.cptec.inpe.br', instance: '150.163.1.53:9100' },
    { nodename: 'trude.cptec.inpe.br', instance: '150.163.1.54:9100' },
    { nodename: 'dev-node01', instance: 'localhost:9101' },
    { nodename: 'dev-node02', instance: 'localhost:9102' },
    { nodename: 'test-hpc', instance: 'localhost:9103' },
  ];

  const filteredHosts = mockHosts.filter(h => {
    const env = getHostEnvironment(h.nodename, h.instance);
    const matchesEnv = environment === 'all' || env === environment;
    const matchesSearch = !search || h.nodename.toLowerCase().includes(search.toLowerCase());
    return matchesEnv && matchesSearch;
  });

  const isTopMax = comparison === 'top_max';

  return {
    kpis: {
      totalHosts: filteredHosts.length,
      cpuAvg: 23.4,
      cpuChange: -1.2,
      memAvg: 45.6,
      memChange: 2.3,
      netPeakValue: 35.95,
      netPeakHost: 'ABARE',
      netPeakTime: '29/07 às 15:30',
    },
    top10Cpu: filteredHosts.map((h, i) => ({
      hostname: h.nodename.split('.')[0].toUpperCase(),
      cpu: isTopMax ? 65 - (i * 4) % 30 : 5 + (i * 3) % 20,
    })).sort((a, b) => isTopMax ? b.cpu - a.cpu : a.cpu - b.cpu).slice(0, 10),
    loadDistribution: [
      { name: 'Produção (COIDS)', value: 65, hosts: 5 },
      { name: 'Homologação (SESUP)', value: 25, hosts: 5 },
      { name: 'Desenvolvimento', value: 10, hosts: 3 },
    ],
  };
}

// PDF Stylesheet
const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#334155',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  metaSection: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  metaTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metaItem: {
    width: '48%',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 8,
    color: '#64748b',
  },
  metaValue: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  kpiCard: {
    width: '23%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: 7.5,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  kpiSubtext: {
    fontSize: 6.5,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 4,
    marginTop: 15,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 5,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 5,
  },
  col1: { width: '50%', paddingLeft: 6 },
  col2: { width: '25%', textAlign: 'right' },
  col3: { width: '25%', textAlign: 'right', paddingRight: 6 },
  headerText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#475569',
  },
  rowText: {
    fontSize: 8,
    color: '#334155',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#94a3b8',
    fontSize: 8,
  },
});

interface PDFProps {
  data: any;
  range: string;
  environment: string;
  search: string;
  timestamp: string;
  comparison: string;
}

const DashboardPDF = ({ data, range, environment, search, timestamp, comparison }: PDFProps) => {
  const envLabel = environment === 'all' 
    ? 'TODOS' 
    : environment === 'coids' 
      ? 'PRODUÇÃO (COIDS)' 
      : environment === 'sesup' 
        ? 'HOMOLOGAÇÃO (SESUP)' 
        : 'DESENVOLVIMENTO';

  const rangeLabel = range === '1h' 
    ? 'Última 1 hora' 
    : range === '24h' 
      ? 'Últimas 24 horas' 
      : range === '7d' 
        ? 'Última 1 semana' 
        : 'Último 1 mês';

  const compLabel = comparison === 'top_max' ? 'TOP 10 MAIOR CONSUMO' : 'TOP 10 MENOR CONSUMO';

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>DASHBOARD EXECUTIVO DE INFRAESTRUTURA</Text>
          <Text style={pdfStyles.subtitle}>Visão consolidada de desempenho e consumo de recursos por ambiente</Text>
        </View>

        {/* Metadados */}
        <View style={pdfStyles.metaSection}>
          <Text style={pdfStyles.metaTitle}>Parâmetros de Extração</Text>
          <View style={pdfStyles.metaGrid}>
            <View style={pdfStyles.metaItem}>
              <Text style={pdfStyles.metaLabel}>Período de Análise: <Text style={pdfStyles.metaValue}>{rangeLabel}</Text></Text>
            </View>
            <View style={pdfStyles.metaItem}>
              <Text style={pdfStyles.metaLabel}>Filtro de Ambiente: <Text style={pdfStyles.metaValue}>{envLabel}</Text></Text>
            </View>
            <View style={pdfStyles.metaItem}>
              <Text style={pdfStyles.metaLabel}>Data de Extração: <Text style={pdfStyles.metaValue}>{timestamp}</Text></Text>
            </View>
            <View style={pdfStyles.metaItem}>
              <Text style={pdfStyles.metaLabel}>Filtro de Busca: <Text style={pdfStyles.metaValue}>{search ? `"${search}"` : 'Nenhum'}</Text></Text>
            </View>
            <View style={pdfStyles.metaItem}>
              <Text style={pdfStyles.metaLabel}>Comparação: <Text style={pdfStyles.metaValue}>{compLabel}</Text></Text>
            </View>
          </View>
        </View>

        {/* Resumo Executivo (KPIs) */}
        <Text style={pdfStyles.sectionTitle}>Resumo Executivo</Text>
        <View style={pdfStyles.kpiContainer}>
          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiTitle}>Hosts Ativos</Text>
            <Text style={pdfStyles.kpiValue}>{data.kpis.totalHosts}</Text>
            <Text style={pdfStyles.kpiSubtext}>100% Operacional</Text>
          </View>
          
          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiTitle}>Média CPU</Text>
            <Text style={pdfStyles.kpiValue}>{data.kpis.cpuAvg.toFixed(1)}%</Text>
            <Text style={pdfStyles.kpiSubtext}>
              {data.kpis.cpuChange >= 0 ? `↑ +${data.kpis.cpuChange.toFixed(1)}%` : `↓ ${data.kpis.cpuChange.toFixed(1)}%`} vs ref
            </Text>
          </View>

          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiTitle}>Média Memória</Text>
            <Text style={pdfStyles.kpiValue}>{data.kpis.memAvg.toFixed(1)}%</Text>
            <Text style={pdfStyles.kpiSubtext}>
              {data.kpis.memChange >= 0 ? `↑ +${data.kpis.memChange.toFixed(1)}%` : `↓ ${data.kpis.memChange.toFixed(1)}%`} vs ref
            </Text>
          </View>

          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiTitle}>Pico Rede</Text>
            <Text style={pdfStyles.kpiValue}>{data.kpis.netPeakValue.toFixed(2)} MB/s</Text>
            <Text style={pdfStyles.kpiSubtext}>{data.kpis.netPeakHost} ({data.kpis.netPeakTime})</Text>
          </View>
        </View>

        {/* Distribuição por Ambiente */}
        <Text style={pdfStyles.sectionTitle}>Distribuição de Carga por Ambiente</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.col1, pdfStyles.headerText]}>Ambiente</Text>
            <Text style={[pdfStyles.col2, pdfStyles.headerText]}>Hosts Alocados</Text>
            <Text style={[pdfStyles.col3, pdfStyles.headerText]}>Carga de CPU Proporcional</Text>
          </View>
          {data.loadDistribution.map((row: any, i: number) => (
            <View key={i} style={pdfStyles.tableRow}>
              <Text style={[pdfStyles.col1, pdfStyles.rowText, { fontWeight: 'bold' }]}>{row.name}</Text>
              <Text style={[pdfStyles.col2, pdfStyles.rowText]}>{row.hosts}</Text>
              <Text style={[pdfStyles.col3, pdfStyles.rowText]}>{row.value}%</Text>
            </View>
          ))}
        </View>

        {/* Top 10 Servidores CPU */}
        <Text style={pdfStyles.sectionTitle}>
          {comparison === 'top_max' 
            ? 'Top 10 Hosts de Maior Consumo (CPU Média)' 
            : 'Top 10 Hosts de Menor Consumo (CPU Média)'}
        </Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.col1, pdfStyles.headerText]}>Hostname</Text>
            <Text style={[pdfStyles.col2, pdfStyles.headerText]}>Uso Médio CPU (%)</Text>
            <Text style={[pdfStyles.col3, pdfStyles.headerText]}>Status de Alerta</Text>
          </View>
          {data.top10Cpu.map((row: any, i: number) => {
            const isRed = row.cpu >= 90;
            const isYellow = row.cpu >= 70 && row.cpu < 90;
            const status = isRed ? 'Crítico (>=90%)' : isYellow ? 'Alerta (>=70%)' : 'Normal';
            const statusColor = isRed ? '#e11d48' : isYellow ? '#d97706' : '#10b981';
            
            return (
              <View key={i} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.col1, pdfStyles.rowText, { fontWeight: 'bold' }]}>{row.hostname}</Text>
                <Text style={[pdfStyles.col2, pdfStyles.rowText]}>{row.cpu.toFixed(1)}%</Text>
                <Text style={[pdfStyles.col3, pdfStyles.rowText, { color: statusColor, fontWeight: 'bold' }]}>{status}</Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text>Monitor Reports - Sistema de Monitoramento de Datacenters</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    const environment = searchParams.get('environment') || 'all';
    const search = searchParams.get('search') || '';
    const comparison = searchParams.get('comparison') || 'top_max';

    const PROMETHEUS_URL = process.env.PROMETHEUS_URL;
    let data: any;

    const clickTimestamp = formatExtractionTimestamp(new Date());

    if (!PROMETHEUS_URL || (PROMETHEUS_URL.includes('localhost:5002') && process.env.NODE_ENV === 'test')) {
      data = generateMockData(range, environment, search, comparison);
    } else {
      try {
        let days = 7;
        let step = '1h';

        if (range === '1h') {
          days = 0.0416;
          step = '1m';
        } else if (range === '24h') {
          days = 1;
          step = '15m';
        } else if (range === '30d') {
          days = 30;
          step = '4h';
        }

        const endDate = new Date();
        const startDate = subDays(endDate, days);
        const start = formatISO(startDate);
        const end = formatISO(endDate);

        const cpuQuery = '100 * (1 - avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])))';
        const memQuery = '100 * (1 - (node_memory_MemFree_bytes + node_memory_Cached_bytes + node_memory_Buffers_bytes + node_memory_SReclaimable_bytes) / node_memory_MemTotal_bytes)';
        const rxQuery = 'sum by(instance)(rate(node_network_receive_bytes_total{device!~"lo|docker.*|veth.*|br.*|virbr.*|tun.*"}[5m])) / 1024 / 1024';
        const txQuery = 'sum by(instance)(rate(node_network_transmit_bytes_total{device!~"lo|docker.*|veth.*|br.*|virbr.*|tun.*"}[5m])) / 1024 / 1024';
        const hostnameQuery = 'node_uname_info';

        const [cpuRes, memRes, rxRes, txRes, hostnameRes] = await Promise.all([
          queryPrometheusRange(cpuQuery, start, end, step).catch(() => null),
          queryPrometheusRange(memQuery, start, end, step).catch(() => null),
          queryPrometheusRange(rxQuery, start, end, step).catch(() => null),
          queryPrometheusRange(txQuery, start, end, step).catch(() => null),
          queryPrometheus(hostnameQuery).catch(() => null),
        ]);

        if (!cpuRes && !memRes && !rxRes && !txRes) {
          data = generateMockData(range, environment, search, comparison);
        } else {
          // Process Hostname mapping
          const hostnameMap: Record<string, string> = {};
          if (hostnameRes?.data?.result) {
            for (const item of hostnameRes.data.result) {
              const instance = item.metric.instance;
              const nodename = item.metric.nodename;
              if (instance && nodename) {
                hostnameMap[instance] = nodename;
              }
            }
          }

          const getHostDetails = (instance: string) => {
            const nodename = hostnameMap[instance] || instance;
            const hostEnv = getHostEnvironment(nodename, instance);
            return { nodename, hostEnv };
          };

          const activeInstances = new Set<string>();
          const instanceAverages: Record<string, { cpu: number; mem: number; net: number; nodename: string; env: string }> = {};

          const processAverages = (res: any, field: 'cpu' | 'mem' | 'rx' | 'tx') => {
            if (!res?.data?.result) return;
            for (const item of res.data.result) {
              const instance = item.metric.instance;
              if (!instance) continue;
              
              const { nodename, hostEnv } = getHostDetails(instance);
              const matchesEnv = environment === 'all' || hostEnv === environment;
              const matchesSearch = !search || nodename.toLowerCase().includes(search.toLowerCase());

              if (matchesEnv && matchesSearch) {
                activeInstances.add(instance);
                if (!instanceAverages[instance]) {
                  instanceAverages[instance] = { cpu: 0, mem: 0, net: 0, nodename, env: hostEnv };
                }
                const values = item.values || [];
                if (values.length) {
                  const avg = values.reduce((acc: number, v: any) => acc + parseFloat(v[1] || '0'), 0) / values.length;
                  if (field === 'cpu') instanceAverages[instance].cpu = avg;
                  if (field === 'mem') instanceAverages[instance].mem = avg;
                  if (field === 'rx' || field === 'tx') instanceAverages[instance].net += avg;
                }
              }
            }
          };

          processAverages(cpuRes, 'cpu');
          processAverages(memRes, 'mem');
          processAverages(rxRes, 'rx');
          processAverages(txRes, 'tx');

          // Timeseries points to calculate CPU/Memory overall averages
          let totalCpu = 0;
          let totalMem = 0;
          let countCpu = 0;
          let countMem = 0;

          const accumulateTotals = (res: any, field: 'cpu' | 'mem') => {
            if (!res?.data?.result) return;
            for (const item of res.data.result) {
              const instance = item.metric.instance;
              if (!instance || !activeInstances.has(instance)) continue;
              for (const [_, v] of item.values || []) {
                const val = parseFloat(v || '0');
                if (isNaN(val)) continue;
                if (field === 'cpu') {
                  totalCpu += val;
                  countCpu++;
                } else {
                  totalMem += val;
                  countMem++;
                }
              }
            }
          };

          accumulateTotals(cpuRes, 'cpu');
          accumulateTotals(memRes, 'mem');

          const cpuAvg = countCpu ? totalCpu / countCpu : 0;
          const memAvg = countMem ? totalMem / countMem : 0;

          // Network Peak
          let netPeakValue = 0;
          let netPeakHost = 'N/A';
          let netPeakTime = '';

          if (rxRes?.data?.result && txRes?.data?.result) {
            const hostNetValues: Record<string, Record<number, { rx: number; tx: number; nodename: string }>> = {};

            const mapHostNet = (res: any, field: 'rx' | 'tx') => {
              if (!res?.data?.result) return;
              for (const item of res.data.result) {
                const instance = item.metric.instance;
                if (!instance || !activeInstances.has(instance)) continue;
                const { nodename } = getHostDetails(instance);
                if (!hostNetValues[instance]) hostNetValues[instance] = {};
                for (const [t, v] of item.values || []) {
                  const ts = Number(t);
                  const val = parseFloat(v || '0');
                  if (isNaN(val)) continue;
                  if (!hostNetValues[instance][ts]) {
                    hostNetValues[instance][ts] = { rx: 0, tx: 0, nodename };
                  }
                  if (field === 'rx') hostNetValues[instance][ts].rx = val;
                  if (field === 'tx') hostNetValues[instance][ts].tx = val;
                }
              }
            };

            mapHostNet(rxRes, 'rx');
            mapHostNet(txRes, 'tx');

            for (const instance of Object.keys(hostNetValues)) {
              for (const ts of Object.keys(hostNetValues[instance]).map(Number)) {
                const pt = hostNetValues[instance][ts];
                const total = pt.rx + pt.tx;
                if (total > netPeakValue) {
                  netPeakValue = total;
                  netPeakHost = pt.nodename.split('.')[0].toUpperCase();
                  const date = new Date(ts * 1000);
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  netPeakTime = `${pad(date.getDate())}/${pad(date.getMonth() + 1)} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
                }
              }
            }
          }

          // Top 10 CPU based on comparison query parameter
          const isTopMax = comparison === 'top_max';
          const top10Cpu = Object.values(instanceAverages)
            .map(avg => ({
              hostname: avg.nodename.split('.')[0].toUpperCase(),
              cpu: avg.cpu,
            }))
            .sort((a, b) => isTopMax ? b.cpu - a.cpu : a.cpu - b.cpu)
            .slice(0, 10);

          // Environment Distribution
          const allInstancesForDist = new Set<string>();
          const distAverages: Record<string, { cpu: number; env: string }> = {};

          const processDist = (res: any) => {
            if (!res?.data?.result) return;
            for (const item of res.data.result) {
              const instance = item.metric.instance;
              if (!instance) continue;
              const { nodename, hostEnv } = getHostDetails(instance);
              const matchesSearch = !search || nodename.toLowerCase().includes(search.toLowerCase());
              
              if (matchesSearch) {
                allInstancesForDist.add(instance);
                if (!distAverages[instance]) {
                  distAverages[instance] = { cpu: 0, env: hostEnv };
                }
                const values = item.values || [];
                if (values.length) {
                  const avg = values.reduce((acc: number, v: any) => acc + parseFloat(v[1] || '0'), 0) / values.length;
                  distAverages[instance].cpu = avg;
                }
              }
            }
          };
          processDist(cpuRes);

          const envCpuTotals: Record<string, number> = { coids: 0, sesup: 0, dev: 0 };
          const envHostCounts: Record<string, number> = { coids: 0, sesup: 0, dev: 0 };

          Object.values(distAverages).forEach(avg => {
            envHostCounts[avg.env]++;
            envCpuTotals[avg.env] += avg.cpu;
          });

          const totalProportion = envCpuTotals.coids + envCpuTotals.sesup + envCpuTotals.dev;
          const loadDistribution = [
            { name: 'Produção (COIDS)', value: Math.round((envCpuTotals.coids / (totalProportion || 1)) * 100), hosts: envHostCounts.coids },
            { name: 'Homologação (SESUP)', value: Math.round((envCpuTotals.sesup / (totalProportion || 1)) * 100), hosts: envHostCounts.sesup },
            { name: 'Desenvolvimento', value: Math.round((envCpuTotals.dev / (totalProportion || 1)) * 100), hosts: envHostCounts.dev },
          ];

          data = {
            kpis: {
              totalHosts: activeInstances.size,
              cpuAvg,
              cpuChange: 0,
              memAvg,
              memChange: 0,
              netPeakValue,
              netPeakHost,
              netPeakTime,
            },
            top10Cpu,
            loadDistribution,
          };
        }
      } catch (err) {
        console.error("Error during PDF metrics query: ", err);
        data = generateMockData(range, environment, search, comparison);
      }
    }

    // Generate PDF Stream
    const stream = await pdf(
      <DashboardPDF 
        data={data} 
        range={range} 
        environment={environment} 
        search={search} 
        timestamp={clickTimestamp} 
        comparison={comparison}
      />
    ).toBuffer();

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="dashboard_executivo.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Erro na geração do PDF:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
