import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkOrgPermission } from '../src/features/auth/permissions';

// Mock Supabase Server Client
const mockSingle = vi.fn();
const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('../src/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve({
    from: mockFrom,
  })),
}));

describe('checkOrgPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deny access if userId or orgId is empty', async () => {
    const result1 = await checkOrgPermission('', 'org-123');
    expect(result1.hasPermission).toBe(false);

    const result2 = await checkOrgPermission('user-123', '');
    expect(result2.hasPermission).toBe(false);
  });

  it('should allow access and return the role if the user is a member', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { role: 'member' },
      error: null,
    });

    const result = await checkOrgPermission('user-123', 'org-123');
    
    expect(mockFrom).toHaveBeenCalledWith('organization_members');
    expect(mockSelect).toHaveBeenCalledWith('role');
    expect(mockEq1).toHaveBeenCalledWith('organization_id', 'org-123');
    expect(mockEq2).toHaveBeenCalledWith('user_id', 'user-123');
    expect(result.hasPermission).toBe(true);
    expect(result.role).toBe('member');
  });

  it('should deny access if the database returns an error or no member is found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('User not found in organization'),
    });

    const result = await checkOrgPermission('user-123', 'org-123');
    expect(result.hasPermission).toBe(false);
  });

  it('should enforce role hierarchies correctly (requiredRole)', async () => {
    // 1. User has 'member' role, asks for 'admin' -> deny
    mockSingle.mockResolvedValueOnce({
      data: { role: 'member' },
      error: null,
    });
    let result = await checkOrgPermission('user-123', 'org-123', 'admin');
    expect(result.hasPermission).toBe(false);
    expect(result.role).toBe('member');

    // 2. User has 'admin' role, asks for 'admin' -> allow
    mockSingle.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null,
    });
    result = await checkOrgPermission('user-123', 'org-123', 'admin');
    expect(result.hasPermission).toBe(true);
    expect(result.role).toBe('admin');

    // 3. User has 'owner' role, asks for 'admin' -> allow
    mockSingle.mockResolvedValueOnce({
      data: { role: 'owner' },
      error: null,
    });
    result = await checkOrgPermission('user-123', 'org-123', 'admin');
    expect(result.hasPermission).toBe(true);
    expect(result.role).toBe('owner');

    // 4. User has 'admin' role, asks for 'owner' -> deny
    mockSingle.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null,
    });
    result = await checkOrgPermission('user-123', 'org-123', 'owner');
    expect(result.hasPermission).toBe(false);
  });
});
