'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  /** 'lockup' = full Member Market logo, 'mark' = monogram square only */
  variant?: 'lockup' | 'mark'
  /** Force a color variant. Default 'auto' picks based on the active theme. */
  colorMode?: 'auto' | 'dark' | 'light'
  className?: string
  /** Pixel height. Default 36. */
  height?: number
}

/**
 * Member Market logo.
 *
 * Two designer-supplied SVGs live in /public/images:
 *   member-market-logo.svg        — dark wordmark, white-mark interior. For light backgrounds.
 *   member-market-logo-white.svg  — white wordmark, white-mark interior. For dark backgrounds.
 *
 * `colorMode='auto'` watches `<html class="dark">` and swaps live so the logo
 * stays legible across theme toggles without a refresh.
 */
export function Logo({ variant = 'lockup', colorMode = 'auto', className, height = 36 }: LogoProps) {
  const isDark = useIsDark(colorMode)

  if (variant === 'mark') {
    // Render only the monogram by inheriting the SVG aspect (4-bar mark).
    // Crop to just the left mark by clipping width to height (the mark is square).
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={isDark ? '/images/member-market-logo-white.svg' : '/images/member-market-logo.svg'}
        alt="Member Market"
        style={{ height, width: height, objectFit: 'cover', objectPosition: 'left' }}
        className={cn('flex-shrink-0 select-none', className)}
        draggable={false}
      />
    )
  }

  // Lockup: full SVG (mark + wordmark).
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={isDark ? '/images/member-market-logo-white.svg' : '/images/member-market-logo.svg'}
      alt="Member Market"
      style={{ height, width: 'auto', display: 'block' }}
      className={cn('flex-shrink-0 select-none', className)}
      draggable={false}
    />
  )
}

function useIsDark(mode: 'auto' | 'dark' | 'light'): boolean {
  const [isDark, setIsDark] = useState(() => mode === 'dark')

  useEffect(() => {
    if (mode !== 'auto') {
      setIsDark(mode === 'dark')
      return
    }
    if (typeof window === 'undefined') return
    const root = document.documentElement
    const update = () => setIsDark(root.classList.contains('dark'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [mode])

  return isDark
}
