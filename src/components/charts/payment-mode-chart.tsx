'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/format';

interface PaymentModeChartProps {
  data: Array<{ name: string; value: number }>;
}

const colors = ['#127369', '#f59f42', '#326b85', '#d85e48'];

export function PaymentModeChart({ data }: PaymentModeChartProps) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4} stroke="transparent">
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 18,
              border: '1px solid rgba(23,49,62,0.08)',
              background: 'rgba(255,255,255,0.95)',
              boxShadow: '0 16px 40px rgba(23,49,62,0.12)',
            }}
            formatter={(value) => formatCurrency(Number(value ?? 0))}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
