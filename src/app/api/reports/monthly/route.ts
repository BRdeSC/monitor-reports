import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { getDaysInMonth } from 'date-fns';

const TOTAL_CORES = 26624;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedMonth = searchParams.get('month');
  const requestedYear = searchParams.get('year');

  const dbPath = process.env.PBS_DB_PATH || './data/jaci_test.db';
  let db;

  try {
    db = new Database(dbPath, { readonly: true });

    // 1. Descobrir dinamicamente todos os meses disponíveis no banco
    const availableMonthsRows = db.prepare(`
      SELECT DISTINCT substr(timestamp, 1, 7) as yearMonth
      FROM pbs_jobs
      WHERE timestamp IS NOT NULL 
        AND length(timestamp) >= 7
        AND source_format = 'accounting'
      ORDER BY yearMonth DESC
    `).all() as { yearMonth: string }[];

    const availableMonths = availableMonthsRows.map(r => r.yearMonth);

    // Se o cliente não passou mês/ano, pega o mês mais recente do banco
    let year = requestedYear;
    let month = requestedMonth;

    if (!year || !month) {
      if (availableMonths.length > 0) {
        const [latestYear, latestMonth] = availableMonths[0].split('-');
        year = latestYear;
        month = latestMonth;
      } else {
        year = '2026';
        month = '08';
      }
    }

    const paddedMonth = month.padStart(2, '0');
    const monthPattern = `${year}-${paddedMonth}%`;
    const daysInMonth = getDaysInMonth(new Date(parseInt(year), parseInt(month) - 1));
    const totalCapacityHours = TOTAL_CORES * daysInMonth * 24;

    // 2. KPIs do Mês
    const kpiRow = db.prepare(`
      SELECT 
        COUNT(DISTINCT user_name) as activeUsers,
        COUNT(DISTINCT group_name) as activeGroups,
        ROUND(SUM(cpu_hours), 2) as totalCpuHours,
        COUNT(*) as totalJobs,
        SUM(CASE WHEN exit_status = 0 OR exit_status_type = 'success' THEN 1 ELSE 0 END) as successJobs
      FROM pbs_jobs 
      WHERE timestamp LIKE ?
        AND source_format = 'accounting'
        AND exit_status IS NOT NULL
    `).get(monthPattern) as { 
      activeUsers: number, 
      activeGroups: number,
      totalCpuHours: number | null, 
      totalJobs: number, 
      successJobs: number 
    };

    

    const totalCpuHours = kpiRow?.totalCpuHours || 0;
    const totalJobs = kpiRow?.totalJobs || 0;
    const successJobs = kpiRow?.successJobs || 0;
    const avgUsage = totalCapacityHours > 0 ? (totalCpuHours / totalCapacityHours) * 100 : 0;
    const taxaSucesso = totalJobs > 0 ? (successJobs / totalJobs) * 100 : 0;

    const kpis = {
      nodes: 104,
      cores: TOTAL_CORES,
      storage: '24 PB',
      activeUsers: kpiRow?.activeUsers || 0,
      activeGroups: kpiRow?.activeGroups || 0,
      avgUsage,
      totalCpuHours,
      totalJobs,
      taxaSucesso,
    };

    // 3. Evolução de Uso (Janeiro até o Mês Selecionado no Ano)
    const historicalUsage = [];
    const targetMonthNum = parseInt(month, 10);
    
    for (let m = 1; m <= targetMonthNum; m++) {
      const currentPadded = String(m).padStart(2, '0');
      const histPattern = `${year}-${currentPadded}%`;
      const histDays = getDaysInMonth(new Date(parseInt(year), m - 1));
      const histCapacity = TOTAL_CORES * histDays * 24;

      const row = db.prepare(`
        SELECT SUM(cpu_hours) as cpu
        FROM pbs_jobs
        WHERE timestamp LIKE ?
          AND source_format = 'accounting'
          AND exit_status IS NOT NULL
      `).get(histPattern) as { cpu: number | null };

      const cpu = row?.cpu || 0;
      const usagePct = histCapacity > 0 ? (cpu / histCapacity) * 100 : 0;
      
      historicalUsage.push({
        month: currentPadded,
        usagePct,
        cpuHours: cpu
      });
    }

    // 4. Uso Diário no Mês Selecionado (dias 1 a N)
    const dailyRows = db.prepare(`
      SELECT 
        CAST(substr(timestamp, 9, 2) AS INTEGER) as day,
        SUM(cpu_hours) as dailyCpu
      FROM pbs_jobs 
      WHERE timestamp LIKE ?
        AND source_format = 'accounting'
        AND exit_status IS NOT NULL
      GROUP BY day
    `).all(monthPattern) as { day: number, dailyCpu: number }[];

    const dailyCapacity = TOTAL_CORES * 24;
    const dailyUsage = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const found = dailyRows.find(x => x.day === d);
      dailyUsage.push({
        day: d,
        usagePct: found ? (found.dailyCpu / dailyCapacity) * 100 : 0,
        cpuHours: found ? found.dailyCpu : 0
      });
    }

    // 5. Consumo por Fila
    const queueRows = db.prepare(`
      SELECT 
        COALESCE(queue, 'outros') as queue, 
        ROUND(SUM(cpu_hours), 2) as total_cpu_hours 
      FROM pbs_jobs 
      WHERE timestamp LIKE ?
        AND source_format = 'accounting'
        AND exit_status IS NOT NULL
      GROUP BY queue 
      ORDER BY total_cpu_hours DESC
    `).all(monthPattern) as { queue: string, total_cpu_hours: number }[];

    // 6. Top 10 Usuários por Horas CPU
    const topUserRows = db.prepare(`
      SELECT 
        COALESCE(user_name, 'desconhecido') as user_name, 
        ROUND(SUM(cpu_hours), 2) as total_cpu_hours 
      FROM pbs_jobs 
      WHERE timestamp LIKE ?
        AND source_format = 'accounting'
        AND exit_status IS NOT NULL
      GROUP BY user_name 
      ORDER BY total_cpu_hours DESC 
      LIMIT 10
    `).all(monthPattern) as { user_name: string, total_cpu_hours: number }[];

    // 7. Sankey Real (Top Usuários por Volume de Jobs -> Filas)
    const topSankeyUsers = db.prepare(`
      SELECT user_name, COUNT(*) as jobsCount
      FROM pbs_jobs
      WHERE timestamp LIKE ? 
        AND source_format = 'accounting'
        AND exit_status IS NOT NULL
        AND user_name IS NOT NULL
      GROUP BY user_name
      ORDER BY jobsCount DESC
      LIMIT 10
    `).all(monthPattern) as { user_name: string, jobsCount: number }[];

    let sankeyFlows: { user_name: string; queue: string; value: number }[] = [];
    if (topSankeyUsers.length > 0) {
      const userNames = topSankeyUsers.map(u => u.user_name);
      const placeholders = userNames.map(() => '?').join(',');

      sankeyFlows = db.prepare(`
        SELECT 
          user_name, 
          COALESCE(queue, 'outros') as queue, 
          COUNT(*) as value
        FROM pbs_jobs
        WHERE timestamp LIKE ? 
          AND source_format = 'accounting'
          AND exit_status IS NOT NULL
          AND user_name IN (${placeholders})
        GROUP BY user_name, queue
        HAVING value > 0
        ORDER BY value DESC
      `).all(monthPattern, ...userNames) as { user_name: string, queue: string, value: number }[];
    }

    // 8. Taxa de Sucesso e Erros no Mês
    const errorsMonthRow = db.prepare(`
      SELECT 
        COALESCE(exit_status_type, 'unknown') as exit_status_type, 
        COUNT(*) as count
      FROM pbs_jobs
      WHERE timestamp LIKE ?
        AND source_format = 'accounting'
        AND exit_status IS NOT NULL
      GROUP BY exit_status_type
      ORDER BY count DESC
    `).all(monthPattern) as { exit_status_type: string, count: number }[];

    // 9. Histórico de Sucesso Mês a Mês
    const successRateMonthly = [];
    for (let m = 1; m <= targetMonthNum; m++) {
      const currentPadded = String(m).padStart(2, '0');
      const histPattern = `${year}-${currentPadded}%`;
      
      const row = db.prepare(`
        SELECT 
          COUNT(*) as totalJobs,
          SUM(CASE WHEN exit_status = 0 OR exit_status_type = 'success' THEN 1 ELSE 0 END) as successJobs
        FROM pbs_jobs
        WHERE timestamp LIKE ?
          AND source_format = 'accounting'
          AND exit_status IS NOT NULL
      `).get(histPattern) as { totalJobs: number, successJobs: number };
      
      successRateMonthly.push({
        month: currentPadded,
        successRate: row.totalJobs > 0 ? (row.successJobs / row.totalJobs) * 100 : 0,
        totalJobs: row.totalJobs,
        successJobs: row.successJobs
      });
    }

    // 10. Erros por Mês Agrupados
    const errorsMonthly = [];
    for (let m = 1; m <= targetMonthNum; m++) {
      const currentPadded = String(m).padStart(2, '0');
      const histPattern = `${year}-${currentPadded}%`;
      
      const rows = db.prepare(`
        SELECT exit_status_type, COUNT(*) as count
        FROM pbs_jobs
        WHERE timestamp LIKE ? 
          AND source_format = 'accounting'
          AND exit_status IS NOT NULL
          AND exit_status != 0 
          AND exit_status_type != 'success'
        GROUP BY exit_status_type
      `).all(histPattern) as { exit_status_type: string, count: number }[];
      
      errorsMonthly.push({
        month: currentPadded,
        errors: rows
      });
    }

    return NextResponse.json({
      selectedMonth: paddedMonth,
      selectedYear: year,
      availableMonths,
      kpis,
      historicalUsage,
      dailyUsage,
      queueUsage: queueRows,
      topUsers: topUserRows,
      sankeyFlows,
      errorsMonth: errorsMonthRow,
      successRateMonthly,
      errorsMonthly
    });

  } catch (error: any) {
    console.error('Erro na API SQLite do Relatório Mensal:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no banco de dados' }, { status: 500 });
  } finally {
    if (db) db.close();
  }
}