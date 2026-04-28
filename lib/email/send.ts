import 'server-only'
import { Resend } from 'resend'

let _resend: Resend | null = null

function getClient(): Resend | null {
  if (_resend) return _resend
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  _resend = new Resend(key)
  return _resend
}

const FROM = process.env.EMAIL_FROM ?? 'TABFT <noreply@tabft.com>'

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
  const client = getClient()
  if (!client) {
    console.warn(`[email] skipped — no RESEND_API_KEY configured (would send "${opts.subject}" to ${opts.to})`)
    return { ok: false, error: 'Resend not configured' }
  }
  try {
    await client.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html })
    return { ok: true }
  } catch (err) {
    console.error('[email] send failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' }
  }
}

// ── Templates ─────────────────────────────────────────────────

const wrap = (title: string, body: string) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
    <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;margin-bottom:24px;">
      TAB<span style="color:#5546ff;">FT</span>
    </div>
    ${body}
    <p style="font-size:12px;color:#999;margin-top:32px;border-top:1px solid #eee;padding-top:16px;">
      You received this because you're a member of TABFT — There's A Business For That.
    </p>
  </div>
</body></html>`

export function welcomeEmail(name: string, siteUrl: string) {
  return wrap('Welcome to TABFT', `
    <h1 style="font-size:20px;margin:0 0 12px;">Welcome to TABFT, ${name}!</h1>
    <p style="font-size:15px;line-height:1.5;color:#444;">
      You now have access to the EO members' marketplace. Browse trusted businesses run by fellow members,
      send inquiries, and post your own services to reach the network.
    </p>
    <p style="margin-top:24px;">
      <a href="${siteUrl}/marketplace" style="background:#5546ff;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Browse the marketplace
      </a>
    </p>
  `)
}

export function newMessageEmail(senderName: string, businessName: string | null, preview: string, siteUrl: string, conversationId: string) {
  const subject = businessName ? `New inquiry about ${businessName}` : `New message from ${senderName}`
  return {
    subject,
    html: wrap(subject, `
      <h1 style="font-size:18px;margin:0 0 12px;">${senderName} sent you a message</h1>
      ${businessName ? `<p style="color:#666;font-size:13px;margin:0 0 12px;">re: ${businessName}</p>` : ''}
      <blockquote style="border-left:3px solid #5546ff;padding:8px 16px;margin:16px 0;background:#fafafa;font-size:14px;color:#333;">
        ${escapeHtml(preview)}
      </blockquote>
      <p style="margin-top:20px;">
        <a href="${siteUrl}/dashboard/messages?conversation=${conversationId}" style="background:#5546ff;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          Reply
        </a>
      </p>
    `)
  }
}

export function newReviewEmail(reviewerName: string, businessName: string, rating: number, body: string | null, siteUrl: string, businessId: string) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating)
  return {
    subject: `${reviewerName} left you a ${rating}-star review`,
    html: wrap('New review', `
      <h1 style="font-size:18px;margin:0 0 8px;">${reviewerName} reviewed ${businessName}</h1>
      <p style="font-size:18px;color:#5546ff;margin:0 0 16px;letter-spacing:2px;">${stars}</p>
      ${body ? `<blockquote style="border-left:3px solid #ddd;padding:8px 16px;margin:16px 0;background:#fafafa;font-size:14px;color:#333;">${escapeHtml(body)}</blockquote>` : ''}
      <p style="margin-top:20px;">
        <a href="${siteUrl}/marketplace/${businessId}" style="background:#5546ff;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          View & reply
        </a>
      </p>
    `)
  }
}

export function adApprovedEmail(businessName: string, siteUrl: string, campaignId: string) {
  return {
    subject: `Your TABFT campaign is live`,
    html: wrap('Campaign live', `
      <h1 style="font-size:18px;margin:0 0 12px;">Your campaign for ${businessName} is now live</h1>
      <p style="font-size:14px;color:#444;line-height:1.5;">
        Members searching for relevant services will start seeing your sponsored listing.
        Check back to see how it's performing.
      </p>
      <p style="margin-top:20px;">
        <a href="${siteUrl}/dashboard/ads/${campaignId}" style="background:#5546ff;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          View campaign
        </a>
      </p>
    `)
  }
}

export function adRejectedEmail(businessName: string, reason: string, siteUrl: string, campaignId: string) {
  return {
    subject: `Your TABFT campaign needs changes`,
    html: wrap('Campaign rejected', `
      <h1 style="font-size:18px;margin:0 0 12px;">Your campaign for ${businessName} wasn't approved</h1>
      <p style="font-size:14px;color:#444;line-height:1.5;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p style="font-size:14px;color:#444;line-height:1.5;">
        You can edit and resubmit your campaign — your budget is still on file.
      </p>
      <p style="margin-top:20px;">
        <a href="${siteUrl}/dashboard/ads/${campaignId}" style="background:#5546ff;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          Edit campaign
        </a>
      </p>
    `)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
