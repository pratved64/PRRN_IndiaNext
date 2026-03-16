'use client';
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/app/lib/api';

export default function Home() {
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    fetchAPI('/health')
      .then(data => setStatus(data.message))
      .catch(() => setStatus('Backend disconnected.'));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-24">
      <h1 className="text-2xl font-bold">System Status: {status}</h1>
    </main>
  );
}