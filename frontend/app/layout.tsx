import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '../components/query-provider';

export const metadata: Metadata = { title: 'Acme Data Room', description: 'Acme Data Room MVP' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
