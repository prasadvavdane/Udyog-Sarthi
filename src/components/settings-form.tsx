'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { settingsSchema, type SettingsInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SettingsFormProps {
  initialSettings: SettingsInput;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [form, setForm] = useState<SettingsInput>(initialSettings);
  const [loading, setLoading] = useState(false);

  const setField = <K extends keyof SettingsInput>(field: K, value: SettingsInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveSettings = async () => {
    const parsed = settingsSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please correct the settings form.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to save settings');
      }

      toast.success('Vendor settings saved.');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor header and footer settings</CardTitle>
        <CardDescription>This information is reused automatically in invoices, printable bills, and exported reports.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="businessName">Vendor name</Label>
            <Input id="businessName" value={form.businessName} onChange={(event) => setField('businessName', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="GSTIN">GSTIN</Label>
            <Input id="GSTIN" value={form.GSTIN} onChange={(event) => setField('GSTIN', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoicePrefix">Invoice prefix</Label>
            <Input id="invoicePrefix" value={form.invoicePrefix} onChange={(event) => setField('invoicePrefix', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultGST">Default GST</Label>
            <Input id="defaultGST" type="number" min={0} max={28} value={form.defaultGST} onChange={(event) => setField('defaultGST', Number(event.target.value) || 0)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" value={form.address} onChange={(event) => setField('address', event.target.value)} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input id="logo" value={form.logo || ''} onChange={(event) => setField('logo', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerMessage">Footer message</Label>
            <Input id="footerMessage" value={form.footerMessage || ''} onChange={(event) => setField('footerMessage', event.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="thankYouNote">Thank you note</Label>
          <Textarea id="thankYouNote" value={form.thankYouNote || ''} onChange={(event) => setField('thankYouNote', event.target.value)} />
        </div>

        <Button type="button" onClick={() => void saveSettings()} disabled={loading} className="w-fit">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save settings
        </Button>
      </CardContent>
    </Card>
  );
}
