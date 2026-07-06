import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createOrganization, 
  inviteMember, 
  acceptInvitation, 
  createTeam 
} from '../src/features/orgs/actions';
import { checkOrgPermission } from '../src/features/auth/permissions';
import { createClient } from '../src/lib/supabase/server';

// Define and export mocks via vi.hoisted to prevent hoisting issues
const { mockSupabaseClient, mockQueryBuilder } = vi.hoisted(() => {
  const getUserFn = vi.fn();
  const singleFn = vi.fn();
  const maybeSingleFn = vi.fn();
  
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: singleFn,
    maybeSingle: maybeSingleFn,
    then: vi.fn().mockImplementation((onfulfilled) => {
      return Promise.resolve({ data: null, error: null }).then(onfulfilled);
    }),
  };

  const client = {
    auth: {
      getUser: getUserFn,
    },
    from: vi.fn().mockReturnValue(queryBuilder),
  };

  return { mockSupabaseClient: client, mockQueryBuilder: queryBuilder };
});

// Use a plain function for createClient so it cannot be cleared by vi.clearAllMocks()
vi.mock('../src/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(mockSupabaseClient),
}));

// Mock permissions helper
vi.mock('../src/features/auth/permissions', () => ({
  checkOrgPermission: vi.fn(),
}));

describe('Debug check', () => {
  it('prints client', async () => {
    const client = await createClient();
    console.log('--- DEBUG CLIENT ---');
    console.log('client keys:', Object.keys(client || {}));
    console.log('client.auth:', client?.auth);
    console.log('--------------------');
  });
});

describe('Organization Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('should throw if not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Unauthorized') });
      await expect(createOrganization('Test Org', 'test-org')).rejects.toThrow('Authentication required');
    });

    it('should throw if slug is already taken', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: 'org-existing' }, error: null });

      await expect(createOrganization('Test Org', 'test-org')).rejects.toThrow('slug "test-org" is already taken');
    });

    it('should insert org, member owner role, and return org details', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
      
      // maybeSingle (slug check) -> free (null)
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // single (org insert) -> created org
      mockQueryBuilder.single.mockResolvedValueOnce({ data: { id: 'org-456', name: 'Test Org', slug: 'test-org' }, error: null });
      
      const org = await createOrganization('Test Org', 'test-org');

      expect(org.id).toBe('org-456');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organizations');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('settings');
    });
  });

  describe('inviteMember', () => {
    it('should throw if caller has insufficient permissions', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
      vi.mocked(checkOrgPermission).mockResolvedValueOnce({ hasPermission: false });

      await expect(inviteMember('org-456', 'invitee@gmail.com', 'member')).rejects.toThrow('Unauthorized');
    });

    it('should insert invitation if caller is admin/owner', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
      vi.mocked(checkOrgPermission).mockResolvedValueOnce({ hasPermission: true, role: 'admin' });

      const result = await inviteMember('org-456', 'invitee@gmail.com', 'member');

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('invitations');
    });
  });

  describe('acceptInvitation', () => {
    it('should throw if invitation does not exist', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(acceptInvitation('invalid-token')).rejects.toThrow('Invitation not found');
    });

    it('should throw if invitation has expired', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({ 
        data: { id: 'invite-1', organization_id: 'org-456', role: 'member', expires_at: expiredDate.toISOString() },
        error: null 
      });

      await expect(acceptInvitation('expired-token')).rejects.toThrow('Invitation has expired');
    });

    it('should add member to org and update status to accepted', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({ 
        data: { id: 'invite-1', organization_id: 'org-456', role: 'member', expires_at: futureDate.toISOString() },
        error: null 
      });

      const result = await acceptInvitation('valid-token');

      expect(result.organizationId).toBe('org-456');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('invitations');
    });
  });

  describe('createTeam', () => {
    it('should enforce org admin rights and insert team', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
      vi.mocked(checkOrgPermission).mockResolvedValueOnce({ hasPermission: true, role: 'owner' });
      mockQueryBuilder.single.mockResolvedValueOnce({ data: { id: 'team-789', name: 'Frontend Team' }, error: null });

      const team = await createTeam('org-456', 'Frontend Team');

      expect(team.id).toBe('team-789');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('teams');
    });
  });
});
