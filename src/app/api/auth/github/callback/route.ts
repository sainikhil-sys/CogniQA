import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';
import { checkOrgPermission } from '@/features/auth/permissions';

/**
 * GitHub OAuth callback handler.
 * Exchanges the authorization code for an access token, encrypts it,
 * and stores it in the git_connections table.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  // Handle OAuth errors
  if (errorParam) {
    const errorDesc = searchParams.get('error_description') ?? 'Unknown error';
    return NextResponse.redirect(
      `${siteUrl}/dashboard/repositories/connect?error=${encodeURIComponent(errorDesc)}`
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      `${siteUrl}/dashboard/repositories/connect?error=${encodeURIComponent('Missing authorization code or state')}`
    );
  }

  // Decode state to get orgId and userId
  let orgId: string;
  let stateUserId: string;
  try {
    const stateData = JSON.parse(
      Buffer.from(stateParam, 'base64url').toString('utf-8')
    );
    orgId = stateData.orgId;
    stateUserId = stateData.userId;
  } catch {
    return NextResponse.redirect(
      `${siteUrl}/dashboard/repositories/connect?error=${encodeURIComponent('Invalid state parameter')}`
    );
  }

  // Verify the user is still authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== stateUserId) {
    return NextResponse.redirect(
      `${siteUrl}/login?error=${encodeURIComponent('Session expired. Please log in again.')}`
    );
  }

  // Verify the user has admin/owner permission on the org
  const { hasPermission } = await checkOrgPermission(user.id, orgId, 'admin');
  if (!hasPermission) {
    return NextResponse.redirect(
      `${siteUrl}/dashboard/repositories/connect?error=${encodeURIComponent('Only organization owners and admins can connect GitHub.')}`
    );
  }

  // Exchange code for access token
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${siteUrl}/dashboard/repositories/connect?error=${encodeURIComponent('GitHub OAuth not configured.')}`
    );
  }

  let accessToken: string;
  try {
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      const msg =
        tokenData.error_description ?? tokenData.error ?? 'Token exchange failed';
      return NextResponse.redirect(
        `${siteUrl}/dashboard/repositories/connect?error=${encodeURIComponent(msg)}`
      );
    }

    accessToken = tokenData.access_token;
  } catch {
    return NextResponse.redirect(
      `${siteUrl}/dashboard/repositories/connect?error=${encodeURIComponent('Failed to exchange authorization code.')}`
    );
  }

  // Encrypt and store the token
  const encryptedToken = encrypt(accessToken);

  // Upsert: if a connection already exists, update it
  const { error: upsertError } = await supabase
    .from('git_connections')
    .upsert(
      {
        organization_id: orgId,
        encrypted_oauth_token: encryptedToken,
      },
      { onConflict: 'organization_id' }
    );

  if (upsertError) {
    return NextResponse.redirect(
      `${siteUrl}/dashboard/repositories/connect?error=${encodeURIComponent('Failed to store GitHub connection.')}`
    );
  }

  // Success — redirect to repositories page
  return NextResponse.redirect(
    `${siteUrl}/dashboard/repositories?connected=true`
  );
}
