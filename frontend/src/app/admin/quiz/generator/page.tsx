'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RedirectToQuizManager() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/quiz');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm font-bold text-bappa-muted">Redirecting to Quiz Manager…</p>
    </div>
  );
}
