'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, KeyRound, ShieldCheck } from 'lucide-react';
import { demoAccounts } from '@/lib/demo-tenants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fillDemoAccount = (account: (typeof demoAccounts)[number]) => {
    setTenantId(account.tenantCode);
    setEmail(account.email);
    setPassword(account.password);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        tenantId,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Invalid credentials for this tenant.');
        return;
      }

      toast.success('Signed in successfully.');
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong while signing in.');
    } finally {
      setLoading(false);
    }
  };

  const featuredAccounts = demoAccounts.filter((account) => account.role === 'business-admin');

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="glass-panel flex flex-col justify-between rounded-[36px] border border-white/70 p-8 md:p-10">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge>Production demo workspace</Badge>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                  A cleaner, more guided SaaS workspace for billing teams.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                  The refreshed interface focuses on speed at the counter, stronger visual hierarchy, and tenant-specific
                  context so staff always know which business they are operating in.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Tenant-safe login',
                  description: 'Use tenant codes like demo-pharmacy instead of raw Mongo IDs for local testing.',
                  icon: Building2,
                },
                {
                  title: 'Guided POS flow',
                  description: 'Keyboard shortcuts, customer lookup, and clearer totals improve cashier speed.',
                  icon: KeyRound,
                },
                {
                  title: 'RBAC ready',
                  description: 'Admin and cashier demo accounts are seeded for every local tenant.',
                  icon: ShieldCheck,
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[28px] border border-white/70 bg-white/62 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {featuredAccounts.map((account) => (
                <button
                  key={account.tenantCode}
                  type="button"
                  onClick={() => fillDemoAccount(account)}
                  className="rounded-[28px] border border-white/70 bg-white/62 p-5 text-left shadow-sm hover:border-primary/20 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{account.businessName}</p>
                      <p className="text-sm text-muted-foreground">{account.tenantCode}</p>
                    </div>
                    <Badge>{account.industryTemplate}</Badge>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{account.email}</p>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-sm leading-7 text-muted-foreground">
            Tip: after running the seed script, click any tenant card here to prefill a working admin login locally.
          </p>
        </div>

        <Card className="rounded-[36px] border-white/70">
          <CardHeader className="space-y-4">
            <div className="inline-flex w-fit rounded-full border border-border bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Sign in
            </div>
            <div>
              <CardTitle>Access your tenant workspace</CardTitle>
              <CardDescription>
                Use a tenant code like <span className="font-semibold text-foreground">demo-pharmacy</span> or a raw tenant ID
                if you need to test directly against a specific tenant.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="tenantId">Tenant code or tenant ID</Label>
                <Input id="tenantId" value={tenantId} onChange={(event) => setTenantId(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              <Button type="submit" className="w-full justify-between" disabled={loading}>
                {loading ? 'Signing in...' : 'Continue to dashboard'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-8 space-y-3 rounded-[28px] border border-border bg-white/62 p-5">
              <p className="text-sm font-semibold text-foreground">Quick local credentials</p>
              <div className="space-y-3 text-sm text-muted-foreground">
                {demoAccounts.slice(0, 4).map((account) => (
                  <div key={`${account.tenantCode}-${account.role}`} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{account.tenantCode}</p>
                      <p>{account.email}</p>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{account.password}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
