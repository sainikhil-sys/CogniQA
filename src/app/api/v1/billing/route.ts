import { NextResponse } from 'next/server';
import { requireUser, requireOrgContext, handleRouteError } from '@/lib/api/context';
import { features } from '@/lib/env';

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { orgId } = await requireOrgContext(supabase, user.id);

    const [{ data: subscription }, { data: invoices }] = await Promise.all([
      supabase.from('subscriptions').select('plan_id, status, provider, current_period_end').eq('organization_id', orgId).maybeSingle(),
      supabase.from('invoices').select('id, provider_invoice_id, amount_paid, amount_due, status, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
    ]);

    return NextResponse.json({
      payments_configured: features.razorpay(),
      plan: subscription?.plan_id ?? 'Starter',
      subscription_status: subscription?.status ?? 'free',
      current_period_end: subscription?.current_period_end ?? null,
      invoices: (invoices ?? []).map((inv) => ({
        id: inv.id,
        plan: subscription?.plan_id ?? '—',
        amount: inv.amount_paid / 100,
        payment_id: inv.provider_invoice_id,
        status: inv.status,
        created_at: inv.created_at,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
