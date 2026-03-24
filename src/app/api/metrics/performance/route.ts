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
    // METRICAS JACI 
    const queries = {
      jaci_cpu: '(sum(pbs_node_resources_assigned_ncpus{node=~"cn_.*"})/(sum(pbs_node_pcpus{node=~"cn_.*"}) / 2)) * 100',
      jaci_mem: '100 - (avg(node_memory_MemAvailable_bytes{queue!~"aux.*"} / node_memory_MemTotal_bytes{queue!~"aux.*"}) * 100)',

      jaci_nodes_total: 'count(count by(node) (pbs_node_state{node!~"aux.*"}))',
      jaci_nodes_free: `count((pbs_node_resources_assigned_ncpus{node!~"aux.*"} == 0)unless on(node)(pbs_node_state{node_state=~"offline|down"}))`,
      jaci_nodes_busy: 'count(pbs_node_resources_assigned_ncpus{node!~"aux.*"} > 0)',
      jaci_nodes_down: 'count(count by(node) (pbs_node_state{node_state=~"offline|down", node!~"aux.*"}))',

      jaci_running: 'count(max by (job_id) (pbs_job_used_ncpus{queue!~"aux.*"}))',
      jaci_queued: 'pbs_server_state_count{state="queued"}',
      jaci_held: 'pbs_server_state_count{state="held"}',

      jaci_cores_total: 'sum(pbs_node_pcpus{node=~"cn_.*"}) / 2',
      jaci_cores_used: 'sum(pbs_node_resources_assigned_ncpus{node=~"cn_.*"})',
      jaci_cores_down: 'count(count by(node) (pbs_node_state{node_state=~"offline|down", node=~"cn_.*"})) * 256',
      jaci_cores_free: '(sum(pbs_node_pcpus{node=~"cn_.*"}) / 2) - sum(pbs_node_resources_assigned_ncpus{node=~"cn_.*"}) - (count(count by(node) (pbs_node_state{node_state=~"offline|down", node=~"cn_.*"})) * 256)',
      
      // METRICAS  EGEON
      egeon_cpu: 'sum(max by (node) (slurm_node_cpu_alloc{node!~"proc01|proc02"}))/sum(max by (node) (slurm_node_cpu_total{node!~"proc01|proc02"}))* 100',
      egeon_mem: 'sum(slurm_node_mem_alloc) / sum(slurm_node_mem_total) * 100',

      egeon_nodes_total: 'count(count by(node) (slurm_node_cpu_total{node!~"proc01|proc02"}))',
      egeon_nodes_free:'count(max by (node) (slurm_node_cpu_alloc{node!~"proc01|proc02"}) == 0)',
      egeon_nodes_busy: 'count(max by (node) (slurm_node_cpu_alloc{node!~"proc01|proc02"}) > 0)',
      egeon_nodes_down: 'count(count by(node) (slurm_node_state{state=~"down|drain|drained"}))',
      
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