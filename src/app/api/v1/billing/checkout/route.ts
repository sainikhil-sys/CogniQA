import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, handleRouteError, jsonError, rateLimit } from '@/lib/api/context';
import { features } from '@/lib/env';

const checkoutSchema = z.object({
  plan: z.enum(['Pro', 'Enterprise']),
  amount: z.number().int().positive().max(10_000_000), // paise
});

/**
 * Creates a REAL Razorpay order. When Razorpay credentials are missing the
 * endpoint returns 503 so the UI shows a configuration state — there is no
 * fallback order generator.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser();
    rateLimit(`billing:checkout:${user.id}`, 10);

    if (!features.razorpay()) {
      return jsonError(503, 'Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable checkout.');
    }

    const body = checkoutSchema.safeParse(await req.json());
    if (!body.success) return jsonError(400, body.error.issues.map((i) => i.message).join('; '));

    const keyId = process.env.RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: body.data.amount,
        currency: 'INR',
        receipt: `rcpt_${crypto.randomUUID().slice(0, 12)}`,
        notes: { plan: body.data.plan, user_id: user.id },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return jsonError(502, `Razorpay order creation failed (${res.status}): ${detail.slice(0, 200)}`);
    }

    const order = (await res.json()) as { id: string; amount: number };
    return NextResponse.json({ order_id: order.id, amount: order.amount, key_id: keyId });
  } catch (err) {
    return handleRouteError(err);
  }
}
