/**
 * GitProvider interface — abstraction over Git hosting platforms.
 * Phase 3 implements the GitHub adapter. GitLab and Bitbucket are Coming Soon.
 */

// ---------- Data Types ----------

export interface GitRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  language: string | null;
  starCount: number;
  forkCount: number;
  isPrivate: boolean;
  updatedAt: string;
}

export interface GitBranch {
  name: string;
  sha: string;
  isProtected: boolean;
}

export interface GitCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
    avatarUrl?: string;
  };
  url: string;
}

export interface GitPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  author: {
    login: string;
    avatarUrl: string;
  };
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  headBranch: string;
  baseBranch: string;
  url: string;
}

export interface GitIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  author: {
    login: string;
    avatarUrl: string;
  };
  labels: Array<{ name: string; color: string }>;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface GitTreeEntry {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface GitFileContent {
  path: string;
  content: string;
  sha: string;
  size: number;
  encoding: string;
}

export interface GitReviewComment {
  path: string;
  line: number;
  body: string;
}

// ---------- Pagination ----------

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount?: number;
  hasNextPage: boolean;
}

// ---------- Provider Interface ----------

export interface GitProvider {
  /** List repositories accessible by the authenticated user */
  listRepos(params?: PaginationParams): Promise<PaginatedResult<GitRepository>>;

  /** Get the file tree for a repo at a given ref (branch/sha) */
  getTree(
    owner: string,
    repo: string,
    ref?: string
  ): Promise<GitTreeEntry[]>;

  /** Get file content from a repo */
  getFile(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<GitFileContent>;

  /** List branches for a repository */
  listBranches(
    owner: string,
    repo: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<GitBranch>>;

  /** List commits for a repository (optionally on a specific branch) */
  listCommits(
    owner: string,
    repo: string,
    ref?: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<GitCommit>>;

  /** List pull requests for a repository */
  listPRs(
    owner: string,
    repo: string,
    state?: 'open' | 'closed' | 'all',
    params?: PaginationParams
  ): Promise<PaginatedResult<GitPullRequest>>;

  /** List issues for a repository */
  listIssues(
    owner: string,
    repo: string,
    state?: 'open' | 'closed' | 'all',
    params?: PaginationParams
  ): Promise<PaginatedResult<GitIssue>>;

  /** Create a review on a pull request */
  createReview(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    comments: GitReviewComment[],
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'
  ): Promise<{ id: number }>;

  /** Get repository info */
  getRepo(owner: string, repo: string): Promise<GitRepository>;

  /** Revoke the current token/connection */
  revokeAccess(): Promise<void>;
}
