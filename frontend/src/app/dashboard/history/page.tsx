'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { History } from 'lucide-react';

export default function GameHistoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/profile?tab=history');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center animate-pulse">
        <History className="w-6 h-6 text-primary" />
      </div>
      <p className="text-bappa-muted font-medium">Opening Game History in Profile…</p>
    </div>
  );
}
