'use server';

import { createClient } from '@/lib/supabase/server';
import { checkOrgPermission } from '@/features/auth/permissions';
import { encrypt, decrypt } from '@/lib/encryption';
import { GitHubAdapter } from '@/lib/git/github';
import {
  importRepositorySchema,
  disconnectGitHubSchema,
  listReposSchema,
  repoGitHubDataSchema,
} from './schemas';
import type {
  ImportRepositoryInput,
  DisconnectGitHubInput,
  ListReposInput,
  RepoGitHubDataInput,
} from './schemas';

// ---------- Helpers ----------

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Authentication required.');
  }
  return { supabase, user };
}

async function getGitHubAdapter(orgId: string): Promise<GitHubAdapter> {
  const supabase = await createClient();
  const { data: connection, error } = await supabase
    .from('git_connections')
    .select('encrypted_oauth_token')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error || !connection?.encrypted_oauth_token) {
    throw new Error(
      'GitHub is not connected. Go to Settings → Repositories to connect your GitHub account.'
    );
  }

  const token = decrypt(connection.encrypted_oauth_token);
  return new GitHubAdapter(token);
}

// ---------- Connection Management ----------

/**
 * Get the GitHub connection status for an organization.
 */
export async function getGitHubConnectionStatus(orgId: string) {
  const { supabase, user } = await requireAuth();

  const { hasPermission } = await checkOrgPermission(user.id, orgId);
  if (!hasPermission) {
    throw new Error('Access denied.');
  }

  const { data: connection } = await supabase
    .from('git_connections')
    .select('id, github_app_installation_id, created_at')
    .eq('organization_id', orgId)
    .maybeSingle();

  return {
    isConnected: !!connection?.id,
    connectionId: connection?.id ?? null,
    connectedAt: connection?.created_at ?? null,
  };
}

/**
 * Disconnect GitHub from an organization. Revokes the token and deletes the connection.
 */
export async function disconnectGitHub(input: DisconnectGitHubInput) {
  const validated = disconnectGitHubSchema.parse(input);
  const { supabase, user } = await requireAuth();

  const { hasPermission } = await checkOrgPermission(
    user.id,
    validated.organizationId,
    'admin'
  );
  if (!hasPermission) {
    throw new Error('Only owners and admins can disconnect GitHub.');
  }

  // Attempt to revoke the token before deletion
  try {
    const adapter = await getGitHubAdapter(validated.organizationId);
    await adapter.revokeAccess();
  } catch {
    // Best-effort revocation
  }

  // Delete the connection record
  const { error } = await supabase
    .from('git_connections')
    .delete()
    .eq('organization_id', validated.organizationId);

  if (error) {
    throw new Error(`Failed to disconnect GitHub: ${error.message}`);
  }

  return { success: true };
}

// ---------- Repository Operations ----------

/**
 * List GitHub repositories from the connected account (live API data).
 */
export async function listGitHubRepos(input: ListReposInput) {
  const validated = listReposSchema.parse(input);
  const { user } = await requireAuth();

  const { hasPermission } = await checkOrgPermission(
    user.id,
    validated.organizationId
  );
  if (!hasPermission) {
    throw new Error('Access denied.');
  }

  const adapter = await getGitHubAdapter(validated.organizationId);
  return adapter.listRepos({
    page: validated.page,
    perPage: validated.perPage,
  });
}

/**
 * Import a GitHub repository into a project within the organization.
 */
export async function importRepository(input: ImportRepositoryInput) {
  const validated = importRepositorySchema.parse(input);
  const { supabase, user } = await requireAuth();

  const { hasPermission } = await checkOrgPermission(
    user.id,
    validated.organizationId,
    'admin'
  );
  if (!hasPermission) {
    throw new Error('Only owners and admins can import repositories.');
  }

  // Ensure GitHub is connected
  await getGitHubAdapter(validated.organizationId);

  let projectId = validated.projectId;

  // Create a project if none provided
  if (!projectId) {
    const projectName =
      validated.projectName ?? validated.repoName;
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        organization_id: validated.organizationId,
        name: projectName,
        description: `Project for ${validated.repoFullName}`,
      })
      .select()
      .single();

    if (projectError || !project) {
      throw new Error(
        `Failed to create project: ${projectError?.message}`
      );
    }
    projectId = project.id;
  }

  // Check if repo is already imported
  const { data: existing } = await supabase
    .from('repositories')
    .select('id')
    .eq('project_id', projectId)
    .eq('repo_url', validated.repoUrl)
    .maybeSingle();

  if (existing) {
    throw new Error('This repository is already imported in this project.');
  }

  // Insert the repository
  const { data: repo, error: repoError } = await supabase
    .from('repositories')
    .insert({
      project_id: projectId,
      repo_name: validated.repoName,
      repo_url: validated.repoUrl,
      default_branch: validated.defaultBranch,
    })
    .select()
    .single();

  if (repoError || !repo) {
    throw new Error(
      `Failed to import repository: ${repoError?.message}`
    );
  }

  return { repositoryId: repo.id, projectId };
}

/**
 * List imported repositories for an organization from the database.
 */
export async function getImportedRepositories(orgId: string) {
  const { supabase, user } = await requireAuth();

  const { hasPermission } = await checkOrgPermission(user.id, orgId);
  if (!hasPermission) {
    throw new Error('Access denied.');
  }

  // Join through projects to get repos for this org
  const { data: projects } = await supabase
    .from('projects')
    .select(
      `
      id,
      name,
      repositories (
        id,
        repo_name,
        repo_url,
        default_branch,
        created_at,
        updated_at
      )
    `
    )
    .eq('organization_id', orgId);

  if (!projects) return [];

  // Flatten repos with project info
  return projects.flatMap((project) =>
    ((project.repositories as Array<{
      id: string;
      repo_name: string;
      repo_url: string;
      default_branch: string;
      created_at: string;
      updated_at: string;
    }>) ?? []).map((repo) => ({
      ...repo,
      projectId: project.id,
      projectName: project.name,
    }))
  );
}

/**
 * Get live GitHub data (branches, commits, PRs, issues) for a repo.
 */
export async function getRepoGitHubData(
  input: RepoGitHubDataInput,
  dataType: 'branches' | 'commits' | 'prs' | 'issues'
) {
  const validated = repoGitHubDataSchema.parse(input);
  const { user } = await requireAuth();

  const { hasPermission } = await checkOrgPermission(
    user.id,
    validated.organizationId
  );
  if (!hasPermission) {
    throw new Error('Access denied.');
  }

  const adapter = await getGitHubAdapter(validated.organizationId);
  const pagination = { page: validated.page, perPage: validated.perPage };

  switch (dataType) {
    case 'branches':
      return adapter.listBranches(validated.owner, validated.repo, pagination);
    case 'commits':
      return adapter.listCommits(
        validated.owner,
        validated.repo,
        undefined,
        pagination
      );
    case 'prs':
      return adapter.listPRs(
        validated.owner,
        validated.repo,
        'all',
        pagination
      );
    case 'issues':
      return adapter.listIssues(
        validated.owner,
        validated.repo,
        'all',
        pagination
      );
  }
}

/**
 * Get live repo info from GitHub.
 */
export async function getRepoInfo(
  orgId: string,
  owner: string,
  repo: string
) {
  const { user } = await requireAuth();

  const { hasPermission } = await checkOrgPermission(user.id, orgId);
  if (!hasPermission) {
    throw new Error('Access denied.');
  }

  const adapter = await getGitHubAdapter(orgId);
  return adapter.getRepo(owner, repo);
}

/**
 * Remove an imported repository from the database.
 */
export async function removeRepository(repoId: string, orgId: string) {
  const { supabase, user } = await requireAuth();

  const { hasPermission } = await checkOrgPermission(user.id, orgId, 'admin');
  if (!hasPermission) {
    throw new Error('Only owners and admins can remove repositories.');
  }

  // Verify the repo belongs to this org through the project
  const { data: repo } = await supabase
    .from('repositories')
    .select(
      `
      id,
      project:projects!inner (
        organization_id
      )
    `
    )
    .eq('id', repoId)
    .single();

  if (!repo) {
    throw new Error('Repository not found.');
  }

  const project = repo.project as unknown as { organization_id: string };
  if (project.organization_id !== orgId) {
    throw new Error('Repository does not belong to this organization.');
  }

  const { error } = await supabase
    .from('repositories')
    .delete()
    .eq('id', repoId);

  if (error) {
    throw new Error(`Failed to remove repository: ${error.message}`);
  }

  return { success: true };
}
