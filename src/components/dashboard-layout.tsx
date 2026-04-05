'use client';

import type { ReactNode } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CreditCard,
  FileText,
  Home,
  Layers3,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
  Workflow,
} from 'lucide-react';
import { getIndustryTemplateMeta } from '@/lib/demo-tenants';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, description: 'Sales pulse and quick actions' },
  { name: 'POS', href: '/dashboard/pos', icon: ShoppingCart, description: 'Fast cashier billing workspace' },
  { name: 'Products', href: '/dashboard/products', icon: Package, description: 'Catalog, stock and pricing' },
  { name: 'Invoices', href: '/dashboard/invoices', icon: Receipt, description: 'Invoices and collections' },
  { name: 'Customers', href: '/dashboard/customers', icon: Users, description: 'CRM and loyalty insights' },
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCard, description: 'Modes, settlements and status' },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText, description: 'Exports and compliance packs' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, description: 'Trends, top sellers and profit' },
  { name: 'Templates', href: '/dashboard/templates', icon: Layers3, description: 'Industry-specific workflows' },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Business, GST and tenant setup' },
];

interface DashboardLayoutProps {
  children: ReactNode;
  user: {
    name?: string | null;
    role: string;
  };
  workspace: {
    businessName: string;
    industryTemplate: Parameters<typeof getIndustryTemplateMeta>[0];
    tenantCode: string;
    subscriptionPlan: string;
    branchId: string;
  };
}

export default function DashboardLayout({ children, user, workspace }: DashboardLayoutProps) {
  const pathname = usePathname();
  const templateMeta = getIndustryTemplateMeta(workspace.industryTemplate);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] gap-6 px-4 py-4 lg:px-6">
        <aside className="glass-panel hidden w-[310px] shrink-0 flex-col rounded-[32px] border border-white/70 p-6 lg:flex">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="section-eyebrow">VyaparFlow</p>
                <h1 className="text-xl font-semibold text-foreground">{workspace.businessName}</h1>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/70 bg-white/65 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{templateMeta.label}</Badge>
                <Badge variant="outline">{workspace.subscriptionPlan}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{templateMeta.summary}</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Workflow className="h-3.5 w-3.5" />
                {workspace.tenantCode}
              </div>
            </div>
          </div>

          <nav className="mt-6 flex-1 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-4 rounded-[24px] border px-4 py-3 text-sm transition-all',
                    isActive
                      ? 'border-primary/20 bg-primary text-primary-foreground shadow-lg shadow-primary/15'
                      : 'border-transparent bg-white/45 text-muted-foreground hover:border-primary/10 hover:bg-white/75 hover:text-foreground',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-2xl',
                      isActive ? 'bg-white/15' : 'bg-white/75 text-primary',
                    )}
                  >
                    <item.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{item.name}</p>
                    <p className={cn('truncate text-xs', isActive ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-[26px] border border-white/70 bg-white/65 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{user.role}</p>
              </div>
            </div>
            <Button onClick={handleSignOut} variant="ghost" className="mt-4 w-full justify-start rounded-2xl">
              <LogOut className="mr-3 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="glass-panel sticky top-4 z-30 rounded-[28px] border border-white/70 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="section-eyebrow">Tenant workspace</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{workspace.businessName}</h2>
                    <Badge variant="outline">Branch {workspace.branchId}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/templates">Template modules</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/dashboard/pos">Start billing</Link>
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Button key={item.name} asChild size="sm" variant={isActive ? 'default' : 'outline'} className="shrink-0">
                      <Link href={item.href}>{item.name}</Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="pb-10 pt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
