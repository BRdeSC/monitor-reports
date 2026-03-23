import { NextResponse } from 'next/server';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL;

// Funções auxiliares de busca (Igual ao código que você postou)
async function queryValue(query: string) {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json();
  return json?.data?.result?.[0]?.value?.[1] || "0";
}

async function queryVector(query: string) {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json();
  return json?.data?.result || [];
}

export async function GET() {
  try {
    // 1. Mapeamento das Queries Reais do Jaci e Egeon
    const queries = {
      jaci_cpu: '(sum(pbs_node_resources_assigned_ncpus{node=~"cn_.*"})/(sum(pbs_node_pcpus{node=~"cn_.*"}) / 2)) * 100',
      jaci_nodes_total: 'count(count by(node) (pbs_node_state{node!~"aux.*"}))',
      jaci_running: 'count(max by (job_id) (pbs_job_used_ncpus{queue!~"aux.*"}))',
      jaci_queued: 'pbs_server_state_count{state="queued"}',
      
      egeon_cpu: 'sum(max by (node) (slurm_node_cpu_alloc{node!~"proc01|proc02"}))/sum(max by (node) (slurm_node_cpu_total{node!~"proc01|proc02"}))* 100',
      egeon_nodes_total: 'count(count by(node) (slurm_node_cpu_total{node!~"proc01|proc02"}))',
      egeon_running: 'sum(slurm_queue_running)',
      egeon_queued: 'sum(slurm_queue_pending)',
    };

    // 2. Executa todas as queries simples
    const results = await Promise.all(
      Object.entries(queries).map(async ([key, q]) => [key, await queryValue(q)])
    );
    const statusData = Object.fromEntries(results);

    // 3. Busca as Filas (Queues)
    const jaciQueuesRaw = await queryVector('sort_desc(count by (queue) (pbs_job_used_ncpus{queue!~"aux.*"}))');
    const egeonQueuesRaw = await queryVector('sort_desc(count by (partition) (count by (jobid, partition) (slurm_job_info{state=~"R|PD"})))');

    // 4. Monta a resposta final
    return NextResponse.json({
      success: true,
      data: {
        ...statusData,
        jaci_queues: jaciQueuesRaw.map((item: any) => ({ name: item.metric.queue, value: item.value[1] })),
        egeon_queues: egeonQueuesRaw.map((item: any) => ({ name: item.metric.partition, value: item.value[1] }))
      }
    });

  } catch (error) {
    console.error("Erro na API de Performance:", error);
    return NextResponse.json({ success: false, error: 'Falha no Prometheus' }, { status: 500 });
  }
}