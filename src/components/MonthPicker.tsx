'use client'

export default function MonthPicker({ onChange }: { onChange: (date: string) => void }) {
  const months = [
    { label: 'Janeiro', value: '01' },
    { label: 'Fevereiro', value: '02' },
    { label: 'Março', value: '03' },
    { label: 'Abril', value: '4' },
    // ... adicione os outros meses
  ];

  return (
    <div className="flex gap-4 p-4 bg-white shadow rounded-lg mb-6 items-center">
      <label className="text-sm font-medium text-gray-700">Período:</label>
      <select 
        onChange={(e) => onChange(e.target.value)}
        className="border p-2 rounded md:w-48 text-gray-900"
      >
        <option value="">Selecione o Mês</option>
        {months.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}