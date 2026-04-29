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

  // Inline lockup recreated from designer reference. Use HTML+CSS
  // (not SVG text) so the wordmark renders at full font size without
  // viewBox baseline math eating visual height.
  const green = '#1a3a2a'
  const amber = '#c17d2a'
  const markSize = height
  return (
    <span
      className={cn('inline-flex items-center gap-2 select-none', className)}
      style={{ height, lineHeight: 1 }}
      aria-label="member.market"
      role="img"
    >
      <span
        style={{
          width: markSize,
          height: markSize,
          borderRadius: markSize * 0.2,
          background: green,
          color: amber,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: 700,
          fontStyle: 'italic',
          fontSize: markSize * 0.55,
          flexShrink: 0,
        }}
      >
        mi
      </span>
      <span
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: 700,
          fontSize: height * 0.85,
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: green }}>member</span>
        <span style={{ color: amber }}>.market</span>
      </span>
    </span>
  )
}
