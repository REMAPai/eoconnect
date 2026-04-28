/**
 * Server-only feature flags.
 *
 * Toggle in Vercel → Settings → Environment Variables.
 * Default is OFF — set ADS_ENABLED=true to expose ad UI.
 */
export const ADS_ENABLED = process.env.ADS_ENABLED === 'true'
