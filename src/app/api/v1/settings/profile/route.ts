import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, requireOrgContext, handleRouteError, jsonError, writeAudit } from '@/lib/api/context';

const profileSchema = z.object({ full_name: z.string().min(1).max(120) });

export async function PUT(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = profileSchema.safeParse(await req.json());
    if (!body.success) return jsonError(400, body.error.issues.map((i) => i.message).join('; '));

    const { error } = await supabase.from('users').update({ full_name: body.data.full_name }).eq('id', user.id);
    if (error) return jsonError(500, error.message);

    const { orgId } = await requireOrgContext(supabase, user.id);
    await writeAudit(supabase, { orgId, userId: user.id, action: 'profile_updated', entityType: 'user', entityId: user.id });

    return NextResponse.json({ message: 'Profile updated successfully', full_name: body.data.full_name });
  } catch (err) {
    return handleRouteError(err);
  }
}
