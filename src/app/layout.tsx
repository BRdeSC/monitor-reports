// src/app/layout.tsx
import './globals.css';
import Navigation from '@/components/Navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex">
        <Navigation />
        <main className="flex-1 min-h-screen p-6 md:p-8 overflow-y-auto">
          <div className="w-full mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}