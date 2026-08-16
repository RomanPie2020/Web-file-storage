import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Acme Data Room', description: 'Acme Data Room MVP' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
