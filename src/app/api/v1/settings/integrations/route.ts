import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, requireOrgContext, handleRouteError, jsonError, writeAudit } from '@/lib/api/context';
import { encryptSecret, EncryptionNotConfiguredError } from '@/lib/crypto';

const integrationSchema = z.object({
  provider: z.string().min(1),
  token: z.string().min(8),
});

/**
 * Stores the GitHub token AES-256-GCM encrypted in git_connections.
 * Other providers are not implemented yet and return an explicit
 * "coming soon" error instead of pretending to connect.
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = integrationSchema.safeParse(await req.json());
    if (!body.success) return jsonError(400, body.error.issues.map((i) => i.message).join('; '));

    if (body.data.provider !== 'github') {
      return jsonError(400, `The ${body.data.provider} integration is coming soon. Only GitHub is currently supported.`);
    }

    let encrypted: string;
    try {
      encrypted = encryptSecret(body.data.token);
    } catch (err) {
      if (err instanceof EncryptionNotConfiguredError) return jsonError(503, err.message);
      throw err;
    }

    const { orgId } = await requireOrgContext(supabase, user.id);
    const { error } = await supabase
      .from('git_connections')
      .upsert({ organization_id: orgId, encrypted_oauth_token: encrypted }, { onConflict: 'organization_id' });
    if (error) return jsonError(500, error.message);

    await writeAudit(supabase, { orgId, userId: user.id, action: 'integration_connected', entityType: 'git_connection', metadata: { provider: 'github' } });
    return NextResponse.json({ message: 'Successfully connected to github' });
  } catch (err) {
    return handleRouteError(err);
  }
}
