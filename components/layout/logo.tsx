import { cn } from '@/lib/utils'

interface LogoProps {
  /** 'lockup' = monogram + wordmark, 'mark' = monogram square only */
  variant?: 'lockup' | 'mark'
  className?: string
  /** Pixel height — width auto-adjusts to keep aspect ratio. Default 32. */
  height?: number
}

/**
 * Member Market logo.
 *
 * To swap to a designer-supplied raster/SVG file later: drop the file at
 * /public/images/member-market-logo.svg (or .png) and replace this whole
 * component with `<Image src="/images/member-market-logo.svg" ... />`.
 *
 * Until then, this inline SVG matches the brand mark — dark forest green
 * monogram with cream "MM", "member" wordmark in foreground, ".market" in
 * the secondary amber. Uses CSS variables so it inverts cleanly between
 * light and dark themes.
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

  // Full lockup: square + wordmark
  // Width = height * ~6 keeps the aspect roughly matching the reference image.
  const width = Math.round(height * 5.7)

  return (
    <svg
      viewBox="0 0 228 40"
      height={height}
      width={width}
      className={cn('flex-shrink-0', className)}
      aria-label="Member Market"
      role="img"
    >
      {/* Green monogram square */}
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

      {/* Wordmark — "member" foreground + ".market" amber */}
      <text
        x="52"
        y="28"
        fontFamily="var(--font-sans, system-ui)"
        fontSize="22"
        fontWeight="700"
        letterSpacing="-0.5"
      >
        <tspan fill="var(--foreground)">member</tspan>
        <tspan fill="var(--secondary)">.market</tspan>
      </text>
    </svg>
  )
}
