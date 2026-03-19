// src/components/MonthPicker.tsx
'use client'

export default function MonthPicker({ onChange }: { onChange: (date: string) => void }) {
  const months = [
    { label: 'Janeiro', value: '01' },
    { label: 'Fevereiro', value: '02' },
    { label: 'Março', value: '03' },
    // ... adicione os outros meses
  ];

  return (
    <div className="flex gap-4 p-4 bg-white shadow rounded-lg mb-6 text-gray-800">
      <select 
        onChange={(e) => onChange(e.target.value)}
        className="border p-2 rounded md:w-48"
      >
        <option value="">Selecione o Mês</option>
        {months.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      
      <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
        Gerar Relatório
      </button>
    </div>
  );
}