// src/app/performance/page.tsx
export default function PerformancePage() {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold text-gray-900">Olá, Performance! </h1>
      <p className="text-gray-500 mt-2">
        Esta tela será destinada aos relatórios de uso de GPU, CPU e métricas de agregação.
      </p>
      
      {/* Espaço reservado para os futuros cards de porcentagem */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-50">
        <div className="h-32 bg-gray-100 rounded-xl border-2 border-dashed flex items-center justify-center">
          Média de GPU %
        </div>
        <div className="h-32 bg-gray-100 rounded-xl border-2 border-dashed flex items-center justify-center">
          Uso de Memória
        </div>
        <div className="h-32 bg-gray-100 rounded-xl border-2 border-dashed flex items-center justify-center">
          IOPS Médio
        </div>
      </div>
    </div>
  );
}