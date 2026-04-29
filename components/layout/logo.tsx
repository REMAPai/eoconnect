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
        style={{ height, width: height, minHeight: height, minWidth: height }}
        className={cn('flex-shrink-0', className)}
        aria-label="Member Market"
        role="img"
      >
        <rect x="0" y="0" width="40" height="40" rx="8" fill="#1a3a2a" />
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="20"
          fontWeight="700"
          fill="#c17d2a"
          fontStyle="italic"
        >
          mi
        </text>
      </svg>
    )
  }

  // Use the designer-supplied SVG (viewBox cropped to actual content).
  // Aspect ratio after crop is ~833:201 ≈ 4.14:1.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/images/member-market-logo.svg"
      alt="member.market"
      style={{ height, width: 'auto', display: 'block' }}
      className={cn('flex-shrink-0 select-none', className)}
      draggable={false}
    />
  )
}
