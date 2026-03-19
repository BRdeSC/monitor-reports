// src/app/page.tsx
'use client'
import { useState } from 'react';
import MonthPicker from '@/components/MonthPicker';

export default function HomePage() {
  const [data, setData] = useState<any>(null);

  const fetchMonthlyReport = async (month: string) => {
    // Aqui chamaremos nossa API passando o mês
    const response = await fetch(`/api/metrics?query=up&month=${month}`);
    const result = await response.json();
    setData(result);
  };

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Relatórios Mensais Prometheus</h1>
      
      <MonthPicker onChange={fetchMonthlyReport} />

      <div className="bg-white p-6 rounded-lg shadow">
        {data ? (
          <pre className="text-xs bg-gray-100 p-4 rounded text-gray-800">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">Selecione um mês para visualizar os dados.</p>
        )}
      </div>
    </main>
  );
}