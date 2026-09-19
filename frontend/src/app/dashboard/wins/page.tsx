'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy } from 'lucide-react';

export default function MyWinsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/profile?tab=wins');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <div className="w-12 h-12 bg-gold-light rounded-2xl flex items-center justify-center animate-pulse">
        <Trophy className="w-6 h-6 text-gold-dark" />
      </div>
      <p className="text-bappa-muted font-medium">Opening My Wins in Profile…</p>
    </div>
  );
}
