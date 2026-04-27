import { cn } from '@/lib/utils'

interface StatsCardProps {
  label: string
  value: number | string
  delta?: number
  icon?: React.ReactNode
}

export function StatsCard({ label, value, delta, icon }: StatsCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
        {delta !== undefined && (
          <span
            className={cn(
              'ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full',
              delta >= 0
                ? 'bg-green-500/15 text-green-500'
                : 'bg-red-500/15 text-red-500'
            )}
          >
            {delta >= 0 ? `+${delta.toFixed(0)}%` : `${delta.toFixed(0)}%`}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold mt-0.5 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}
