import { AuthPanel } from './auth-panel';

export default async function Home() {
  const apiUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
  let health: { status: string; service: string } | null = null;
  try {
    const response = await fetch(`${apiUrl}/health`, { cache: 'no-store' });
    if (response.ok) {
      health = await response.json();
    }
  } catch {
    health = null;
  }

  return (
    <main>
      <h1>Acme Data Room</h1>
      <p>Frontend is running.</p>
      <p>Backend health: {health?.status === 'ok' ? 'healthy' : 'unavailable'}</p>
      <AuthPanel />
    </main>
  );
}
