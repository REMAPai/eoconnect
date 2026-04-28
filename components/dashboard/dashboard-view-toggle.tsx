'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface DashboardViewToggleProps {
  providerContent: React.ReactNode
  customerContent: React.ReactNode
}

/**
 * Lightweight provider/customer toggle — text-based segmented control,
 * no full sidebar split. Designed to disappear when not needed.
 */
export function DashboardViewToggle({ providerContent, customerContent }: DashboardViewToggleProps) {
  const [view, setView] = useState<'provider' | 'customer'>('provider')

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-border mb-6">
        <ToggleButton active={view === 'provider'} onClick={() => setView('provider')}>
          As a provider
        </ToggleButton>
        <ToggleButton active={view === 'customer'} onClick={() => setView('customer')}>
          As a customer
        </ToggleButton>
      </div>
      <div>
        {view === 'provider' ? providerContent : customerContent}
      </div>
    </div>
  )
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-2 text-sm font-medium relative transition-colors',
        active
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
      {active && (
        <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary" />
      )}
    </button>
  )
}
