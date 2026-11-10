import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const sans = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Jobocate — AI job search',
  description:
    'Find matching jobs, tailor applications with human review, and land interviews faster.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.className} min-h-dvh`}>{children}</body>
    </html>
  );
}
