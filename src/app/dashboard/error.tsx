'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="glass-panel rounded-[32px] border border-white/70 p-8">
      <p className="section-eyebrow">Something broke</p>
      <h2 className="mt-3 text-2xl font-semibold text-foreground">We couldn&apos;t load this tenant view.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        This usually means the database connection is missing, seed data is not loaded, or the requested tenant does not
        have the expected setup yet.
      </p>
      <Button onClick={reset} className="mt-6">
        Retry loading
      </Button>
    </div>
  );
}
