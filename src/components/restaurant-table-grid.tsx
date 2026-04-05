'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Loader2, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TableCard = {
  id: string;
  tableName: string;
  status: 'available' | 'occupied' | 'billed' | 'reserved';
  capacity?: number;
  sessionId?: string;
  activeInvoiceDraftId?: string;
  lastInvoiceId?: string;
};

interface RestaurantTableGridProps {
  initialTables: TableCard[];
  canManageTables: boolean;
}

const statusTone: Record<TableCard['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  available: 'outline',
  occupied: 'secondary',
  billed: 'default',
  reserved: 'destructive',
};

export function RestaurantTableGrid({ initialTables, canManageTables }: RestaurantTableGridProps) {
  const [tables, setTables] = useState(initialTables);
  const [newTableName, setNewTableName] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [loading, setLoading] = useState(false);

  const addTable = async () => {
    if (!newTableName.trim()) {
      toast.error('Table name is required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: newTableName,
          capacity: Number(capacity),
          status: 'available',
          isActive: true,
        }),
      });

      const payload = (await response.json()) as { error?: string; table?: TableCard };
      if (!response.ok || !payload.table) {
        throw new Error(payload.error ?? 'Unable to create table');
      }

      const createdTable = payload.table;
      setTables((current) =>
        [...current, createdTable].sort((left, right) => left.tableName.localeCompare(right.tableName)),
      );
      setNewTableName('');
      setCapacity('4');
      toast.success('Table created successfully.');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to create table');
    } finally {
      setLoading(false);
    }
  };

  const toggleReserved = async (table: TableCard) => {
    const nextStatus = table.status === 'reserved' ? 'available' : 'reserved';
    try {
      const response = await fetch(`/api/tables/${table.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: table.tableName,
          capacity: table.capacity ?? 4,
          status: nextStatus,
          isActive: true,
        }),
      });

      const payload = (await response.json()) as { error?: string; table?: TableCard };
      if (!response.ok || !payload.table) {
        throw new Error(payload.error ?? 'Unable to update table status');
      }

      const updatedTable = payload.table;
      setTables((current) => current.map((item) => (item.id === table.id ? updatedTable : item)));
      toast.success(`Table marked ${nextStatus}.`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to update table');
    }
  };

  return (
    <div className="space-y-4">
     <Card>
  <CardHeader>
    <CardTitle>Table summary</CardTitle>
  </CardHeader>

  <CardContent>
    <div className="grid gap-6 lg:grid-cols-2">
      
      {/* Left Section - Live Statuses */}
      <div className="rounded-[28px] border border-border bg-white/68 p-5">
        <div className="mb-4">
          <p className="font-semibold text-foreground">
            Live statuses across the restaurant floor
          </p>
          <p className="text-sm text-muted-foreground">
            Real-time overview of all active table states.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(['available', 'occupied', 'billed', 'reserved'] as TableCard['status'][]).map((status) => (
            <div
              key={status}
              className="rounded-[24px] border border-border bg-white px-4 py-4"
            >
              <p className="text-sm capitalize text-muted-foreground">
                {status}
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {tables.filter((table) => table.status === status).length}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Section - Add New Table */}
      {canManageTables ? (
        <div className="rounded-[28px] border border-border bg-white/68 p-5">
          <div className="mb-4">
            <p className="font-semibold text-foreground">
              Add a new table
            </p>
            <p className="text-sm text-muted-foreground">
              Create restaurant seating directly from the UI.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tableName">Table name</Label>
              <Input
                id="tableName"
                value={newTableName}
                onChange={(event) => setNewTableName(event.target.value)}
                placeholder="Table 9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={20}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
              />
            </div>

            <Button
              type="button"
              onClick={() => void addTable()}
              disabled={loading}
              className="w-full justify-between"
            >
              {loading ? (
                <>
                  Saving table
                  <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  Create table
                  <Plus className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  </CardContent>
</Card>

      <Card>
        <CardHeader>
          <CardTitle>Restaurant floor</CardTitle>
          <CardDescription>Select a table to continue its live bill or start a new order session.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => (
            <Card key={table.id} className="rounded-[26px] border-border bg-white/72 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{table.tableName}</p>
                    <p className="text-sm text-muted-foreground">
                      Session {table.sessionId ? table.sessionId.slice(-6) : 'new'}
                    </p>
                  </div>
                  <Badge variant={statusTone[table.status]}>{table.status}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Capacity {table.capacity ?? 4}
                </div>
                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/dashboard/pos/${table.id}`}>Open table</Link>
                  </Button>
                  {canManageTables ? (
                    <Button type="button" variant="outline" onClick={() => void toggleReserved(table)}>
                      {table.status === 'reserved' ? 'Release' : 'Reserve'}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
