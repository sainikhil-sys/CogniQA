import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { requireUser, requireOrgContext, handleRouteError, jsonError, writeAudit } from '@/lib/api/context';
import { features } from '@/lib/env';

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  plan: z.enum(['Pro', 'Enterprise']),
  amount: z.number().int().positive(),
});

/**
 * Verifies the REAL Razorpay payment signature (HMAC-SHA256). Development
 * orders are not auto-approved — an invalid signature always fails.
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();

    if (!features.razorpay()) {
      return jsonError(503, 'Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable checkout.');
    }

    const body = verifySchema.safeParse(await req.json());
    if (!body.success) return jsonError(400, body.error.issues.map((i) => i.message).join('; '));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, amount } = body.data;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const valid =
      expected.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
    if (!valid) return jsonError(400, 'Payment verification failed. Invalid transaction signature.');

    const { orgId } = await requireOrgContext(supabase, user.id);
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error: subError } = await supabase.from('subscriptions').upsert(
      {
        organization_id: orgId,
        provider: 'razorpay',
        provider_subscription_id: razorpay_order_id,
        provider_customer_id: user.id,
        plan_id: plan,
        status: 'active',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
      },
      { onConflict: 'organization_id' }
    );
    if (subError) return jsonError(500, `Subscription update failed: ${subError.message}`);

    const { error: invError } = await supabase.from('invoices').insert({
      organization_id: orgId,
      provider: 'razorpay',
      provider_invoice_id: razorpay_payment_id,
      amount_due: amount,
      amount_paid: amount,
      status: 'paid',
    });
    if (invError) return jsonError(500, `Invoice record failed: ${invError.message}`);

    await writeAudit(supabase, {
      orgId,
      userId: user.id,
      action: 'plan_upgraded',
      entityType: 'subscription',
      metadata: { plan, payment_id: razorpay_payment_id },
    });

    return NextResponse.json({ status: 'success', plan, message: 'Payment verified and subscription activated.' });
  } catch (err) {
    return handleRouteError(err);
  }
}
