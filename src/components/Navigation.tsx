// src/components/Navigation.tsx
'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, LayoutDashboard } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Status Geral', href: '/', icon: Activity },
    { name: 'Performance', href: '/performance', icon: BarChart3 },
    { name: 'Dashboards', href: '/dashboards', icon: LayoutDashboard },
  ];

  return (
    <nav className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-200 mb-8 max-w-fit">
      {navItems.map((item) => {
        const IsActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              IsActive 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <item.icon size={18} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}