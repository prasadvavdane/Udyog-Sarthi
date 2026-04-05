import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  badges?: string[];
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, badges = [], actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <p className="section-eyebrow">{eyebrow}</p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">{description}</p>
        </div>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={badge} variant="outline">
                {badge}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
