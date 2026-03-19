// src/app/layout.tsx
import './globals.css';
import Navigation from '@/components/Navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900">
        <div className="max-w-6xl mx-auto p-8">
          <Navigation />
          {children}
        </div>
      </body>
    </html>
  );
}