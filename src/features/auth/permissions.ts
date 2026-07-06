import { createClient } from '../../lib/supabase/server';

export type UserRole = 'owner' | 'admin' | 'member';

/**
 * Validates whether a user belongs to an organization and meets the required role hierarchy.
 */
export async function checkOrgPermission(
  userId: string,
  orgId: string,
  requiredRole?: UserRole
): Promise<{ hasPermission: boolean; role?: UserRole }> {
  // Always enforce presence of userId and orgId
  if (!userId || !orgId) {
    return { hasPermission: false };
  }

  const supabase = await createClient();
  
  try {
    const { data: member, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (error || !member) {
      return { hasPermission: false };
    }

    const role = member.role as UserRole;

    if (requiredRole) {
      // Owner required: must be owner
      if (requiredRole === 'owner' && role !== 'owner') {
        return { hasPermission: false, role };
      }
      // Admin required: must be owner or admin
      if (requiredRole === 'admin' && role !== 'owner' && role !== 'admin') {
        return { hasPermission: false, role };
      }
      // Member required: owner, admin, or member will satisfy
    }

    return { hasPermission: true, role };
  } catch (err) {
    console.error('Error verifying organization permissions:', err);
    return { hasPermission: false };
  }
}
