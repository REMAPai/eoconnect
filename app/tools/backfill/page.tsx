import { runBackfill } from './actions'
import { BackfillForm } from './backfill-form'

export const dynamic = 'force-dynamic'

// Public-but-gated maintenance tool. Anyone can hit this URL but the action
// requires the SUPABASE_SERVICE_ROLE_KEY. Useful when the admin panel role
// gate is broken — just paste the key from your Vercel env vars.

export default function BackfillPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 560, margin: '60px auto', padding: 24, lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Embedding backfill</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
        Computes search embeddings for any business that&apos;s missing one.
        Vector search needs these populated for &ldquo;AI consultancy in
        Australia&rdquo;-style queries to work.
      </p>

      <BackfillForm runBackfill={runBackfill} />

      <details style={{ marginTop: 24, fontSize: 13, color: '#666' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>How to find the service key</summary>
        <ol style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Open Vercel Dashboard → your project (eomembermarket)</li>
          <li>Settings → Environment Variables</li>
          <li>Find <code>SUPABASE_SERVICE_ROLE_KEY</code></li>
          <li>Click the eye icon to reveal, copy the value</li>
          <li>Paste it above and click Run</li>
        </ol>
        <p style={{ marginTop: 8 }}>This key has full database access — don&apos;t share it. The page accepts it only over HTTPS and never logs it.</p>
      </details>
    </div>
  )
}
