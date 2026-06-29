// src/components/Navigation.tsx
'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Activity, 
  LayoutDashboard, 
  BarChart3, 
  Server, 
  Users, 
  FileSpreadsheet,
  Terminal,
  ChevronRight
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  // Reordenado conforme solicitação do usuário:
  // 1º Status do Ambiente, 2º Relatório de Utilização, 3º Métricas Gerais, e os outros abaixo.
  const navItems = [
    { name: 'Status do Ambiente', href: '/performance', icon: LayoutDashboard },
    { name: 'Relatório de Utilização', href: '/reports', icon: FileSpreadsheet },
    { name: 'Métricas Gerais', href: '/', icon: Activity },
    { name: 'Dashboards', href: '/dashboards', icon: BarChart3 },
    { name: 'Servidores', href: '/servidores', icon: Server },
    { name: 'Uso Usuários', href: '/usuarios', icon: Users },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 min-h-screen flex flex-col justify-between border-r border-slate-800 shadow-xl select-none">
      {/* Header section with Logo */}
      <div className="p-6">
        <Link href="/performance" className="flex items-center gap-3 group">
          <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-inner">
            <Terminal size={22} className="group-hover:rotate-6 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wider uppercase leading-none">Monitor Reports</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live Monitor</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon 
                  size={18} 
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                  }`} 
                />
                <span>{item.name}</span>
              </div>
              <ChevronRight 
                size={14} 
                className={`transition-transform duration-200 ${
                  isActive ? 'text-white translate-x-0' : 'text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
                }`}
              />
              {isActive && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer section with server info */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/30">
        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-1">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Prometheus Status</div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <span className="text-xs font-semibold text-slate-300">Conectado</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
