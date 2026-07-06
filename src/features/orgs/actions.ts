"use server";

import { createClient } from '../../lib/supabase/server';
import { checkOrgPermission, UserRole } from '../auth/permissions';
import { Resend } from 'resend';
import { env } from '../../lib/env';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

export interface OrgMemberData {
  id: string;
  role: UserRole;
  user: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

export interface OrgInvitationData {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  expires_at: string;
}

export interface TeamData {
  id: string;
  name: string;
  created_at: string;
}

/**
 * Creates a new organization and registers the creator as the Owner.
 */
export async function createOrganization(name: string, slug: string) {
  const supabase = await createClient();
  
  // 1. Get current authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Authentication required to create an organization.");
  }

  // 2. Check if slug is already taken
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    throw new Error(`The organization slug "${slug}" is already taken.`);
  }

  // 3. Insert organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name, slug })
    .select()
    .single();

  if (orgError || !org) {
    throw new Error(`Failed to create organization: ${orgError?.message}`);
  }

  // 4. Insert creator as owner
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'owner',
    });

  if (memberError) {
    // Rollback organization insert
    await supabase.from('organizations').delete().eq('id', org.id);
    throw new Error(`Failed to register organization owner: ${memberError.message}`);
  }

  // 5. Initialize organization settings
  await supabase.from('settings').insert({
    organization_id: org.id,
    general_settings: {},
  });

  return org;
}

/**
 * Invites a new user to join the organization. Enforces owner/admin access.
 */
export async function inviteMember(orgId: string, email: string, role: UserRole) {
  const supabase = await createClient();

  // 1. Authenticate caller
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  // 2. Verify caller has admin/owner privileges
  const { hasPermission } = await checkOrgPermission(user.id, orgId, 'admin');
  if (!hasPermission) {
    throw new Error("Unauthorized. Only organization owners and admins can invite members.");
  }

  // 3. Generate secure invitation token
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  // 4. Record invitation in the database
  const { error: inviteError } = await supabase
    .from('invitations')
    .insert({
      organization_id: orgId,
      email,
      role,
      invited_by: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

  if (inviteError) {
    throw new Error(`Failed to register invitation: ${inviteError.message}`);
  }

  // 5. Send Email via Resend
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const inviteLink = `${siteUrl}/auth/accept-invite?token=${token}`;

  try {
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'CogniQA Systems <onboarding@resend.dev>',
        to: email,
        subject: 'Invitation to join CogniQA Systems',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #111;">
            <h2>You've been invited!</h2>
            <p>You have been invited to join an organization on the CogniQA Systems platform as a <strong>${role}</strong>.</p>
            <p>Click the link below to accept your invitation and get started:</p>
            <a href="${inviteLink}" style="display: inline-block; background-color: #06b6d4; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Accept Invitation</a>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">This link will expire in 7 days.</p>
          </div>
        `,
      });
    } else {
      console.log(`[Resend Mock] Send invite to ${email}. Link: ${inviteLink}`);
    }
  } catch (emailErr) {
    console.error("Failed to send invitation email:", emailErr);
    // We don't fail the transaction if email fails in dev, but log it
  }

  return { success: true };
}

/**
 * Accepts an invitation using a verification token.
 */
export async function acceptInvitation(token: string) {
  const supabase = await createClient();

  // 1. Authenticate caller
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Authentication required. Please sign up or log in first.");
  }

  // 2. Fetch invitation details
  const { data: invite, error: inviteError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle();

  if (inviteError || !invite) {
    throw new Error("Invitation not found or has already been accepted/revoked.");
  }

  // 3. Verify token expiration
  const now = new Date();
  const expiresAt = new Date(invite.expires_at);
  if (now > expiresAt) {
    // Revoke the invitation
    await supabase.from('invitations').update({ status: 'revoked' }).eq('id', invite.id);
    throw new Error("Invitation has expired.");
  }

  // 4. Add user to the organization members
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      role: invite.role,
    });

  if (memberError) {
    // If user is already a member, we can proceed or throw
    if (memberError.code !== '23505') { // postgres unique constraint error code
      throw new Error(`Failed to join organization: ${memberError.message}`);
    }
  }

  // 5. Update invitation status to accepted
  await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invite.id);

  return { organizationId: invite.organization_id };
}

/**
 * Fetches organization settings panel data (members, teams, invites).
 */
export async function getOrganizationData(orgId: string) {
  const supabase = await createClient();

  // 1. Authenticate caller
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  // 2. Verify organization membership
  const { hasPermission, role } = await checkOrgPermission(user.id, orgId);
  if (!hasPermission) {
    throw new Error("Access denied. You do not belong to this organization.");
  }

  // 3. Retrieve members (joined with public users profile)
  const { data: members } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      user:users (
        id,
        email,
        full_name
      )
    `)
    .eq('organization_id', orgId);

  // 4. Retrieve pending invitations
  const { data: invites } = await supabase
    .from('invitations')
    .select('id, email, role, status, expires_at')
    .eq('organization_id', orgId)
    .eq('status', 'pending');

  // 5. Retrieve teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, created_at')
    .eq('organization_id', orgId);

  return {
    role,
    members: (members || []) as unknown as OrgMemberData[],
    invitations: (invites || []) as unknown as OrgInvitationData[],
    teams: (teams || []) as unknown as TeamData[],
  };
}

/**
 * Creates a new team inside the organization. Enforces owner/admin check.
 */
export async function createTeam(orgId: string, name: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized.");

  const { hasPermission } = await checkOrgPermission(user.id, orgId, 'admin');
  if (!hasPermission) {
    throw new Error("Only organization owners and admins can create teams.");
  }

  const { data: team, error } = await supabase
    .from('teams')
    .insert({ organization_id: orgId, name })
    .select()
    .single();

  if (error || !team) {
    throw new Error(`Failed to create team: ${error?.message}`);
  }

  return team;
}

/**
 * Fetches all organizations the current authenticated user belongs to.
 */
export async function getUserOrganizations() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      organizations (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id);

  if (!memberships) return [];

  // Parse and cast nested relation correctly
  return memberships.map((m: any) => m.organizations).filter(Boolean);
}

