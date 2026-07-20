import { NextRequest, NextResponse } from 'next/server';
import { queryPrometheus } from '@/lib/prometheus';
import { subDays, formatISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let range = searchParams.get('range') || '30d';
    if (!['1d', '7d', '30d', '60d', '90d'].includes(range)) {
      range = '30d';
    }

    // Determine number of days for static window calculation
    let days = 30;
    if (range === '1d') {
      days = 1;
    } else if (range === '7d') {
      days = 7;
    } else if (range === '60d') {
      days = 60;
    } else if (range === '90d') {
      days = 90;
    }

    // Static date calculation: end of window is 00:00:00 of today, start is N days ago at 00:00:00
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const startDate = subDays(endDate, days);
    startDate.setHours(0, 0, 0, 0);

    const endTime = formatISO(endDate);

    // Fetch total scrapes in the period for Jaci and Egeon to compute the real average over the period.
    // Standard scrape interval is 15s (4 scrapes per minute), yielding approx days * 24 * 60 * 4 scrapes.
    const [jaciScrapesRes, egeonScrapesRes] = await Promise.all([
      queryPrometheus(`count_over_time(up{job="federate-jaci"}[${range}])`, endTime).catch(() => null),
      queryPrometheus(`count_over_time(up{job="slurm_job_users"}[${range}])`, endTime).catch(() => null)
    ]);

    let jaciScrapes = days * 24 * 60 * 4;
    if (jaciScrapesRes?.data?.result?.[0]?.value?.[1]) {
      const parsed = parseInt(jaciScrapesRes.data.result[0].value[1], 10);
      if (!isNaN(parsed) && parsed > 0) jaciScrapes = parsed;
    }

    let egeonScrapes = days * 24 * 60 * 4;
    if (egeonScrapesRes?.data?.result?.[0]?.value?.[1]) {
      const parsed = parseInt(egeonScrapesRes.data.result[0].value[1], 10);
      if (!isNaN(parsed) && parsed > 0) egeonScrapes = parsed;
    }

    // Fetch metric sums over the period
    // Jaci: sum_over_time returns sum of NCPUs over all scrapes. Dividing by total scrapes gives real average.
    // Egeon: sum_over_time of slurm_job_info{state="R"} returns active scrape count per job.
    const [jaciRes, egeonRes] = await Promise.all([
      queryPrometheus(`sum by (user) (sum_over_time(pbs_job_used_ncpus[${range}]))`, endTime),
      queryPrometheus(`sum by (user, jobid, cpus) (sum_over_time(slurm_job_info{state="R"}[${range}]))`, endTime)
    ]);

    const usersList: { username: string; cluster: 'jaci' | 'egeon'; coresUsed: number }[] = [];

    // Process Jaci (PBS) results
    if (jaciRes?.data?.result) {
      for (const item of jaciRes.data.result) {
        const username = item.metric?.user;
        const totalSumStr = item.value?.[1];
        const totalSum = parseFloat(totalSumStr || '0');
        if (username && !isNaN(totalSum) && totalSum > 0) {
          const avgCores = parseFloat((totalSum / jaciScrapes).toFixed(2));
          if (avgCores > 0) {
            usersList.push({
              username,
              cluster: 'jaci',
              coresUsed: avgCores,
            });
          }
        }
      }
    }

    // Process Egeon (Slurm) results
    const egeonUserCores: Record<string, number> = {};
    if (egeonRes?.data?.result) {
      for (const item of egeonRes.data.result) {
        const username = item.metric?.user;
        const cpusStr = item.metric?.cpus;
        const activeScrapesStr = item.value?.[1];
        
        const cpus = parseInt(cpusStr || '0', 10);
        const activeScrapes = parseFloat(activeScrapesStr || '0');
        
        if (username && !isNaN(cpus) && !isNaN(activeScrapes)) {
          const jobCpuScrapes = cpus * activeScrapes;
          egeonUserCores[username] = (egeonUserCores[username] || 0) + jobCpuScrapes;
        }
      }
    }

    for (const [username, totalCpuScrapes] of Object.entries(egeonUserCores)) {
      const avgCores = parseFloat((totalCpuScrapes / egeonScrapes).toFixed(2));
      if (avgCores > 0) {
        usersList.push({
          username,
          cluster: 'egeon',
          coresUsed: avgCores,
        });
      }
    }

    // Sort by coresUsed descending
    usersList.sort((a, b) => b.coresUsed - a.coresUsed);

    return NextResponse.json(usersList);
  } catch (error) {
    console.error('Error fetching users metrics:', error);
    return NextResponse.json(
      { error: 'Falha ao consultar Prometheus para usuários' },
      { status: 500 }
    );
  }
}
