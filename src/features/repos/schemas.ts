import { z } from 'zod';

export const importRepositorySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  projectId: z.string().uuid('Invalid project ID').optional(),
  projectName: z.string().min(1, 'Project name is required').optional(),
  repoFullName: z.string().min(1, 'Repository full name is required'),
  repoName: z.string().min(1, 'Repository name is required'),
  repoUrl: z.string().url('Invalid repository URL'),
  defaultBranch: z.string().default('main'),
});

export const disconnectGitHubSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
});

export const listReposSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(30),
});

export const repoDetailSchema = z.object({
  repoId: z.string().uuid('Invalid repository ID'),
});

export const repoGitHubDataSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  organizationId: z.string().uuid('Invalid organization ID'),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(30),
});

export type ImportRepositoryInput = z.infer<typeof importRepositorySchema>;
export type DisconnectGitHubInput = z.infer<typeof disconnectGitHubSchema>;
export type ListReposInput = z.infer<typeof listReposSchema>;
export type RepoDetailInput = z.infer<typeof repoDetailSchema>;
export type RepoGitHubDataInput = z.infer<typeof repoGitHubDataSchema>;
