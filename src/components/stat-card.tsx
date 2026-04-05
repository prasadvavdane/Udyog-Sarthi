import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, note, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground">{note}</p>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          <ArrowUpRight className="h-3.5 w-3.5" />
          Live tenant snapshot
        </div>
      </CardContent>
    </Card>
  );
}
