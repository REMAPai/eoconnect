import { cn } from '@/lib/utils'

interface LogoProps {
  /** 'lockup' = full Member Market logo, 'mark' = MM monogram square only */
  variant?: 'lockup' | 'mark'
  className?: string
  /** Pixel height — width auto-adjusts to keep aspect ratio. Default 32. */
  height?: number
}

/**
 * Member Market logo.
 *
 * Lockup variant uses the designer-supplied SVG file
 * (/public/images/member-market-logo.svg). Mark variant is an
 * inline SVG matching the brand box for tight spaces (favicon /
 * mobile navbar) where the wordmark would be unreadable.
 */
export function Logo({ variant = 'lockup', className, height = 32 }: LogoProps) {
  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 40 40"
        height={height}
        width={height}
        className={cn('flex-shrink-0', className)}
        aria-label="Member Market"
        role="img"
      >
        <rect x="0" y="0" width="40" height="40" rx="8" fill="var(--primary)" />
        <text
          x="20"
          y="27"
          textAnchor="middle"
          fontFamily="var(--font-sans, system-ui)"
          fontSize="16"
          fontWeight="800"
          fill="var(--primary-foreground)"
          letterSpacing="-0.5"
        >
          MM
        </text>
      </svg>
    )
  }

  // Designer file. Source aspect is roughly 3:1 (wide). The natural
  // viewBox is 900×900 but visible content is only the bottom band, so
  // we let the file scale by height with `width: auto` to preserve it.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/images/member-market-logo.svg"
      alt="Member Market"
      height={height}
      style={{ height, width: 'auto' }}
      className={cn('flex-shrink-0 select-none', className)}
      draggable={false}
    />
  )
}
