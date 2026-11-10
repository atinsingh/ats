import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jobocate Recruiter',
  description: 'Recruiter console: ATS workflows in PostgreSQL; search hot path via OpenSearch',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
