'use client'

interface MetricData {
  metric: { [key: string]: string };
  values?: [number, string][]; // Para range queries (histórico)
  value?: [number, string];    // Para instant queries (atual)
}

export default function MetricsTable({ data }: { data: any }) {
  const results = data?.data?.result || [];

  if (results.length === 0) {
    return <div className="p-8 text-center text-gray-500 bg-white rounded-lg border">Nenhum dado encontrado.</div>;
  }

  // FUNÇÃO DE FORMATAÇÃO INTELIGENTE
  const formatSmartValue = (rawValue: string, metricName: string) => {
    const value = parseFloat(rawValue);
    if (isNaN(value)) return rawValue;

    // 1. Se for Bytes
    if (metricName.toLowerCase().includes('bytes')) {
      if (value === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(value) / Math.log(k));
      return `${parseFloat((value / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    // 2. Se for Segundos
    if (metricName.toLowerCase().includes('seconds')) {
      if (value < 1) return `${(value * 1000).toFixed(2)} ms`;
      return `${value.toFixed(2)} s`;
    }

    // 3. Se for Percentual (geralmente entre 0 e 1 no Prometheus)
    if (metricName.toLowerCase().includes('pct') || metricName.toLowerCase().includes('percentage')) {
      return `${(value * 100).toFixed(2)}%`;
    }

    // 4. Se for apenas um contador ou valor genérico
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  };

  if (results.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
        <p className="text-gray-400 font-medium">Nenhum dado retornado para esta consulta.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Recurso Identificado</th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Métrica / Labels</th>
            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Valor Formatado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {results.map((item: any, index: number) => {
            const metricName = item.metric.__name__ || 'query_result';
            
            // Tenta achar o "Nome Amigável" (Jaci, Egeon, etc)
            const identifier = Object.entries(item.metric).find(
              ([key]) => !['__name__', 'instance', 'job', 'endpoint', 'service'].includes(key)
            );

            const rawValue = item.values 
              ? item.values[item.values.length - 1][1] 
              : item.value?.[1] || '0';

            return (
              <tr key={index} className="hover:bg-blue-50/40 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-black text-gray-800">
                    {identifier ? String(identifier[1]).toUpperCase() : item.metric.instance}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                    {item.metric.instance}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-mono text-blue-600 mb-1">{metricName}</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(item.metric)
                      .filter(([key]) => !['__name__', 'instance', 'job'].includes(key))
                      .map(([key, val]) => (
                        <span key={key} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">
                          {key}: {val}
                        </span>
                      ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-base font-bold text-gray-900 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                    {formatSmartValue(rawValue, metricName)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}