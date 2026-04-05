'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/format';

interface SalesOverviewChartProps {
  data: Array<{ label: string; sales: number; profit: number }>;
}

export function SalesOverviewChart({ data }: SalesOverviewChartProps) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 6, bottom: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#127369" stopOpacity={0.32} />
              <stop offset="95%" stopColor="#127369" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59f42" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#f59f42" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,49,62,0.08)" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#5b7280', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5b7280', fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
          <Tooltip
            contentStyle={{
              borderRadius: 18,
              border: '1px solid rgba(23,49,62,0.08)',
              background: 'rgba(255,255,255,0.95)',
              boxShadow: '0 16px 40px rgba(23,49,62,0.12)',
            }}
            formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name === 'sales' ? 'Sales' : 'Profit']}
          />
          <Area type="monotone" dataKey="sales" stroke="#127369" strokeWidth={3} fill="url(#salesFill)" />
          <Area type="monotone" dataKey="profit" stroke="#f59f42" strokeWidth={2.2} fill="url(#profitFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
