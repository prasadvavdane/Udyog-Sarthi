import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KbdProps {
  children: ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-8 items-center justify-center rounded-xl border border-border bg-white/75 px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground shadow-sm',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
