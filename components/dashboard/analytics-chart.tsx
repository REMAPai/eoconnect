'use client'

import { format, parseISO } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'

interface AnalyticsChartProps {
  data: Array<{ date: string; views: number; contact_clicks: number }>
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'MMM d'),
  }))

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Last 30 Days</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: 12,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [Number(value).toLocaleString(), '']}
          />
          <Line
            type="monotone"
            dataKey="views"
            stroke="#94F06B"
            dot={false}
            strokeWidth={2}
            name="Views"
          />
          <Line
            type="monotone"
            dataKey="contact_clicks"
            stroke="#6B7280"
            dot={false}
            strokeWidth={2}
            name="Contact Clicks"
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(value) => (
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
