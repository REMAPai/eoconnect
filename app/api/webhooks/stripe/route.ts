import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe/client'
import type Stripe from 'stripe'

// Service-role client — webhooks have no user session.
function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const sig = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature', details: String(err) }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const campaignId = session.metadata?.campaign_id
    const kind = session.metadata?.kind
    const topUpAmount = Number(session.metadata?.amount ?? 0)
    if (!campaignId) return NextResponse.json({ ok: true })

    const db = adminDb()

    if (kind === 'topup' && topUpAmount > 0) {
      // Add to existing budget
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbAny = db as any
      const { data: current } = await dbAny.from('ad_campaigns').select('budget_total').eq('id', campaignId).single()
      const newTotal = Number(current?.budget_total ?? 0) + topUpAmount
      await dbAny.from('ad_campaigns').update({ budget_total: newTotal }).eq('id', campaignId)
    } else {
      // Initial purchase — move campaign to pending_review for admin approval
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbAny = db as any
      await dbAny
        .from('ad_campaigns')
        .update({ status: 'pending_review', stripe_payment_intent_id: session.payment_intent as string })
        .eq('id', campaignId)
    }
  }

  return NextResponse.json({ ok: true })
}
