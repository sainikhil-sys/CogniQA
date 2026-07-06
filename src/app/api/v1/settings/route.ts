import { NextResponse } from 'next/server';
import { requireUser, requireOrgContext, handleRouteError, jsonError } from '@/lib/api/context';
import { features } from '@/lib/env';

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { orgId } = await requireOrgContext(supabase, user.id);

    const [{ data: profile, error: profileError }, { data: gitConnection }, { data: apiKeys }] = await Promise.all([
      supabase.from('users').select('email, full_name').eq('id', user.id).single(),
      supabase.from('git_connections').select('id, encrypted_oauth_token, created_at').eq('organization_id', orgId).maybeSingle(),
      supabase.from('api_keys').select('id, name, prefix, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
    ]);

    if (profileError || !profile) return jsonError(404, 'User profile not found.');

    return NextResponse.json({
      profile: { email: profile.email, full_name: profile.full_name ?? '' },
      encryption_configured: features.encryption(),
      integrations: gitConnection?.encrypted_oauth_token
        ? [{ id: gitConnection.id, provider: 'github', status: 'active', created_at: gitConnection.created_at }]
        : [],
      api_keys: (apiKeys ?? []).map((k) => ({ id: k.id, name: k.name, prefix: `${k.prefix}...`, created_at: k.created_at })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
