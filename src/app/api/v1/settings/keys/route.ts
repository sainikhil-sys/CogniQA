import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { requireUser, requireOrgContext, handleRouteError, jsonError, writeAudit } from '@/lib/api/context';

const keySchema = z.object({ name: z.string().min(1).max(80) });

/** Generates a real API key: SHA-256 hash stored, plaintext shown exactly once. */
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = keySchema.safeParse(await req.json());
    if (!body.success) return jsonError(400, body.error.issues.map((i) => i.message).join('; '));

    const rawKey = `cq_${crypto.randomBytes(24).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(0, 9);

    const { orgId } = await requireOrgContext(supabase, user.id);
    const { error } = await supabase.from('api_keys').insert({
      organization_id: orgId,
      name: body.data.name,
      prefix,
      hashed_key: hashedKey,
    });
    if (error) return jsonError(500, error.message);

    await writeAudit(supabase, { orgId, userId: user.id, action: 'api_key_created', entityType: 'api_key', metadata: { name: body.data.name, prefix } });

    return NextResponse.json({
      name: body.data.name,
      api_key: rawKey,
      message: 'Copy this API key now. It will not be shown again.',
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
