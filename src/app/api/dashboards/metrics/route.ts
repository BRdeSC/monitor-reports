import { NextRequest, NextResponse } from 'next/server';
import { queryPrometheus, queryPrometheusRange } from '@/lib/prometheus';
import { subDays, formatISO } from 'date-fns';

// Helper to determine environment based on nodename and instance
function getHostEnvironment(nodename: string, instance: string): 'coids' | 'sesup' | 'dev' {
  const name = nodename.toLowerCase();
  const inst = instance.toLowerCase();
  
  // Data Center COIDS: contains ".coids.inpe.br" or IPs in the COIDS block (e.g., 150.163.212.*)
  const isCoids = name.includes('.coids.inpe.br') || 
                  inst.includes('.coids.inpe.br') || 
                  /\b150\.163\.21[2-4]\./.test(inst);
  if (isCoids) return 'coids';

  // Data Center SESUP: contains ".cptec.inpe.br" or specific keywords
  const sesupKeywords = ['areias', 'equinocio', 'oliveira', 'beberibe', 'trude', 'ouro', 'quilombo'];
  const isSesup = name.includes('.cptec.inpe.br') || 
                  inst.includes('.cptec.inpe.br') || 
                  sesupKeywords.some(kw => name.includes(kw)) ||
                  sesupKeywords.some(kw => inst.includes(kw));
  if (isSesup) return 'sesup';

  return 'dev';
}

// Generate fallback mock data for testing or when Prometheus fails
function generateMockData(range: string, environment: string, search: string) {
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

  // Filter mock hosts
  const filteredHosts = mockHosts.filter(h => {
    const env = getHostEnvironment(h.nodename, h.instance);
    const matchesEnv = environment === 'all' || env === environment;
    const matchesSearch = !search || h.nodename.toLowerCase().includes(search.toLowerCase());
    return matchesEnv && matchesSearch;
  });

  const now = new Date();
  let pointsCount = 60;
  let timeStepMinutes = 1;

  if (range === '1h') {
    pointsCount = 60;
    timeStepMinutes = 1;
  } else if (range === '24h') {
    pointsCount = 96;
    timeStepMinutes = 15;
  } else if (range === '7d') {
    pointsCount = 84;
    timeStepMinutes = 120;
  } else if (range === '30d') {
    pointsCount = 90;
    timeStepMinutes = 480;
  } else {
    pointsCount = 90;
    timeStepMinutes = 480;
  }

  const startTimestamp = Math.floor(now.getTime() / 1000) - (pointsCount * timeStepMinutes * 60);

  const hosts = filteredHosts.map((h, index) => {
    const shortName = h.nodename.split('.')[0];
    const hostEnv = getHostEnvironment(h.nodename, h.instance);
    
    // Seed random factors per host to make charts realistic and unique
    const isCoids = h.nodename.includes('coids');
    const isCptec = h.nodename.includes('cptec');
    const baseCpu = isCoids ? 50 + (index * 5) % 30 : isCptec ? 15 + (index * 3) % 20 : 5 + (index * 2) % 10;
    const baseMem = isCoids ? 65 + (index * 4) % 20 : isCptec ? 30 + (index * 2) % 25 : 10 + (index * 5) % 15;
    const baseNet = isCoids ? 15 + (index * 7) % 20 : isCptec ? 5 + (index * 2) % 8 : 0.5 + (index * 0.5) % 2;

    const cpuSeries: { timestamp: number; value: number }[] = [];
    const memSeries: { timestamp: number; value: number }[] = [];
    const netSeries: { timestamp: number; value: number }[] = [];

    let cpuSum = 0;
    let memSum = 0;
    let netSum = 0;
    let netPeakValue = 0;
    let netPeakTime = '';

    for (let p = 0; p < pointsCount; p++) {
      const timestamp = startTimestamp + (p * timeStepMinutes * 60);
      const date = new Date(timestamp * 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${pad(date.getDate())}/${pad(date.getMonth() + 1)} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;

      const waveFactor = Math.sin((p / pointsCount) * Math.PI * 4 + index) * 10;
      const noise = (Math.random() - 0.5) * 5;
      
      const cpu = Math.max(0.5, Math.min(99.5, baseCpu + waveFactor + noise));
      const mem = Math.max(1, Math.min(99.5, baseMem + waveFactor * 0.5 + noise));
      
      const rx = Math.max(0.01, baseNet + (Math.sin((p / pointsCount) * Math.PI * 6 + index) * baseNet * 0.4) + (Math.random() - 0.5) * (baseNet * 0.1));
      const tx = Math.max(0.01, baseNet * 0.8 + (Math.sin((p / pointsCount) * Math.PI * 6 + index + 1) * baseNet * 0.3) + (Math.random() - 0.5) * (baseNet * 0.1));
      const net = rx + tx;

      cpuSeries.push({ timestamp, value: cpu });
      memSeries.push({ timestamp, value: mem });
      netSeries.push({ timestamp, value: net });

      cpuSum += cpu;
      memSum += mem;
      netSum += net;

      if (net > netPeakValue) {
        netPeakValue = net;
        netPeakTime = timeStr;
      }
    }

    return {
      instance: h.instance,
      nodename: h.nodename,
      hostname: shortName,
      environment: hostEnv,
      cpuMean: cpuSum / pointsCount,
      memMean: memSum / pointsCount,
      netMean: netSum / pointsCount,
      netPeakValue,
      netPeakTime,
      cpuSeries,
      memSeries,
      netSeries,
    };
  });

  return {
    success: true,
    isMock: true,
    range,
    environment,
    timestamp: now.toISOString(),
    hosts,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '7d';
  const environment = searchParams.get('environment') || 'all';
  const search = searchParams.get('search') || '';

  const PROMETHEUS_URL = process.env.PROMETHEUS_URL;

  // If Prometheus is not configured, return mock data immediately
  if (!PROMETHEUS_URL || (PROMETHEUS_URL.includes('localhost:5002') && process.env.NODE_ENV === 'test')) {
    return NextResponse.json(generateMockData(range, environment, search));
  }

  try {
    let days = 7;
    let step = '1h';

    if (range === '1h') {
      days = 0.0416; // 1 hour
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

    // Queries
    const cpuQuery = '100 * (1 - avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])))';
    const memQuery = '100 * (1 - (node_memory_MemFree_bytes + node_memory_Cached_bytes + node_memory_Buffers_bytes + node_memory_SReclaimable_bytes) / node_memory_MemTotal_bytes)';
    const rxQuery = 'sum by(instance)(rate(node_network_receive_bytes_total{device!~"lo|docker.*|veth.*|br.*|virbr.*|tun.*"}[5m])) / 1024 / 1024';
    const txQuery = 'sum by(instance)(rate(node_network_transmit_bytes_total{device!~"lo|docker.*|veth.*|br.*|virbr.*|tun.*"}[5m])) / 1024 / 1024';
    const hostnameQuery = 'node_uname_info';

    // Execute range queries and static hostname mappings in parallel
    const [cpuRes, memRes, rxRes, txRes, hostnameRes] = await Promise.all([
      queryPrometheusRange(cpuQuery, start, end, step).catch(() => null),
      queryPrometheusRange(memQuery, start, end, step).catch(() => null),
      queryPrometheusRange(rxQuery, start, end, step).catch(() => null),
      queryPrometheusRange(txQuery, start, end, step).catch(() => null),
      queryPrometheus(hostnameQuery).catch(() => null),
    ]);

    // Check if we failed to get any response. Fallback to mock data if so.
    if (!cpuRes && !memRes && !rxRes && !txRes) {
      console.warn("Prometheus queries returned no data or failed. Falling back to simulated metrics.");
      return NextResponse.json(generateMockData(range, environment, search));
    }

    // Process Hostname Maps
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

    // Collect all instances across all results
    const allInstances = new Set<string>();
    const collectInstances = (res: any) => {
      if (!res?.data?.result) return;
      for (const item of res.data.result) {
        const instance = item.metric.instance;
        if (instance) {
          allInstances.add(instance);
        }
      }
    };

    collectInstances(cpuRes);
    collectInstances(memRes);
    collectInstances(rxRes);
    collectInstances(txRes);

    // Filter instances by environment and search query
    const filteredInstances = Array.from(allInstances).filter(instance => {
      const nodename = hostnameMap[instance] || instance;
      const hostEnv = getHostEnvironment(nodename, instance);
      const matchesEnv = environment === 'all' || hostEnv === environment;
      const matchesSearch = !search || nodename.toLowerCase().includes(search.toLowerCase());
      return matchesEnv && matchesSearch;
    });

    const cpuSeriesMap: Record<string, { timestamp: number; value: number }[]> = {};
    const memSeriesMap: Record<string, { timestamp: number; value: number }[]> = {};
    const rxSeriesMap: Record<string, Record<number, number>> = {};
    const txSeriesMap: Record<string, Record<number, number>> = {};

    const processSeries = (res: any, targetMap: Record<string, { timestamp: number; value: number }[]>) => {
      if (!res?.data?.result) return;
      for (const item of res.data.result) {
        const instance = item.metric.instance;
        if (!instance) continue;
        targetMap[instance] = (item.values || []).map((val: any) => {
          const timestamp = Number(val[0]);
          const value = parseFloat(val[1] || '0');
          return { timestamp, value: isNaN(value) ? 0 : value };
        });
      }
    };

    const processNetwork = (res: any, targetMap: Record<string, Record<number, number>>) => {
      if (!res?.data?.result) return;
      for (const item of res.data.result) {
        const instance = item.metric.instance;
        if (!instance) continue;
        if (!targetMap[instance]) targetMap[instance] = {};
        for (const val of item.values || []) {
          const timestamp = Number(val[0]);
          const value = parseFloat(val[1] || '0');
          targetMap[instance][timestamp] = isNaN(value) ? 0 : value;
        }
      }
    };

    processSeries(cpuRes, cpuSeriesMap);
    processSeries(memRes, memSeriesMap);
    processNetwork(rxRes, rxSeriesMap);
    processNetwork(txRes, txSeriesMap);

    const hosts = filteredInstances.map(instance => {
      const nodename = hostnameMap[instance] || instance;
      const hostname = nodename.split('.')[0];
      const hostEnv = getHostEnvironment(nodename, instance);

      const cpuSeries = cpuSeriesMap[instance] || [];
      const memSeries = memSeriesMap[instance] || [];

      // Combine rx and tx to create netSeries
      const rxInstanceMap = rxSeriesMap[instance] || {};
      const txInstanceMap = txSeriesMap[instance] || {};
      const netTimestamps = new Set([
        ...Object.keys(rxInstanceMap).map(Number),
        ...Object.keys(txInstanceMap).map(Number)
      ]);

      const netSeries = Array.from(netTimestamps)
        .sort((a, b) => a - b)
        .map(timestamp => {
          const rx = rxInstanceMap[timestamp] || 0;
          const tx = txInstanceMap[timestamp] || 0;
          return { timestamp, value: rx + tx };
        });

      // Calculate averages
      const calculateMean = (series: { value: number }[]) => {
        if (series.length === 0) return 0;
        const sum = series.reduce((acc, pt) => acc + pt.value, 0);
        return sum / series.length;
      };

      const cpuMean = calculateMean(cpuSeries);
      const memMean = calculateMean(memSeries);
      const netMean = calculateMean(netSeries);

      // Calculate Peak Net Traffic
      let netPeakValue = 0;
      let netPeakTime = '';
      netSeries.forEach(pt => {
        if (pt.value > netPeakValue) {
          netPeakValue = pt.value;
          const date = new Date(pt.timestamp * 1000);
          const pad = (n: number) => n.toString().padStart(2, '0');
          netPeakTime = `${pad(date.getDate())}/${pad(date.getMonth() + 1)} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }
      });

      return {
        instance,
        nodename,
        hostname,
        environment: hostEnv,
        cpuMean,
        memMean,
        netMean,
        netPeakValue,
        netPeakTime,
        cpuSeries,
        memSeries,
        netSeries,
      };
    });

    return NextResponse.json({
      success: true,
      range,
      environment,
      timestamp: new Date().toISOString(),
      hosts,
    });

  } catch (error: any) {
    console.error('Erro na API do Dashboard:', error);
    return NextResponse.json(generateMockData(range, environment, search));
  }
}
