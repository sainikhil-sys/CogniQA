import { Octokit } from 'octokit';
import type {
  GitProvider,
  GitRepository,
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitIssue,
  GitTreeEntry,
  GitFileContent,
  GitReviewComment,
  PaginationParams,
  PaginatedResult,
} from './types';

/**
 * GitHub adapter implementing the GitProvider interface.
 * All methods call the real GitHub API via Octokit.
 */
export class GitHubAdapter implements GitProvider {
  private octokit: Octokit;
  private token: string;

  constructor(accessToken: string) {
    this.token = accessToken;
    this.octokit = new Octokit({ auth: accessToken });
  }

  async listRepos(
    params: PaginationParams = {}
  ): Promise<PaginatedResult<GitRepository>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 30;

    const response = await this.octokit.rest.repos.listForAuthenticatedUser({
      page,
      per_page: perPage,
      sort: 'updated',
      direction: 'desc',
    });

    const repos: GitRepository[] = response.data.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      url: r.html_url,
      cloneUrl: r.clone_url ?? r.html_url,
      defaultBranch: r.default_branch ?? 'main',
      language: r.language,
      starCount: r.stargazers_count ?? 0,
      forkCount: r.forks_count ?? 0,
      isPrivate: r.private,
      updatedAt: r.updated_at ?? new Date().toISOString(),
    }));

    // GitHub link header indicates if there's a next page
    const linkHeader = response.headers.link ?? '';
    const hasNextPage = linkHeader.includes('rel="next"');

    return { data: repos, hasNextPage };
  }

  async getRepo(owner: string, repo: string): Promise<GitRepository> {
    const { data: r } = await this.octokit.rest.repos.get({ owner, repo });

    return {
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      url: r.html_url,
      cloneUrl: r.clone_url ?? r.html_url,
      defaultBranch: r.default_branch ?? 'main',
      language: r.language,
      starCount: r.stargazers_count ?? 0,
      forkCount: r.forks_count ?? 0,
      isPrivate: r.private,
      updatedAt: r.updated_at ?? new Date().toISOString(),
    };
  }

  async getTree(
    owner: string,
    repo: string,
    ref?: string
  ): Promise<GitTreeEntry[]> {
    const sha = ref ?? 'HEAD';
    const { data } = await this.octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: sha,
      recursive: 'true',
    });

    return data.tree
      .filter((entry) => entry.path && entry.sha)
      .map((entry) => ({
        path: entry.path!,
        type: entry.type === 'tree' ? 'tree' as const : 'blob' as const,
        sha: entry.sha!,
        size: entry.size,
      }));
  }

  async getFile(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<GitFileContent> {
    const params: { owner: string; repo: string; path: string; ref?: string } = {
      owner,
      repo,
      path,
    };
    if (ref) params.ref = ref;

    const { data } = await this.octokit.rest.repos.getContent(params);

    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error(`Path "${path}" is not a file`);
    }

    const content =
      data.encoding === 'base64' && data.content
        ? Buffer.from(data.content, 'base64').toString('utf-8')
        : (data.content ?? '');

    return {
      path: data.path,
      content,
      sha: data.sha,
      size: data.size,
      encoding: 'utf-8',
    };
  }

  async listBranches(
    owner: string,
    repo: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResult<GitBranch>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 30;

    const response = await this.octokit.rest.repos.listBranches({
      owner,
      repo,
      page,
      per_page: perPage,
    });

    const branches: GitBranch[] = response.data.map((b) => ({
      name: b.name,
      sha: b.commit.sha,
      isProtected: b.protected,
    }));

    const linkHeader = response.headers.link ?? '';
    const hasNextPage = linkHeader.includes('rel="next"');

    return { data: branches, hasNextPage };
  }

  async listCommits(
    owner: string,
    repo: string,
    ref?: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResult<GitCommit>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 30;

    const requestParams: {
      owner: string;
      repo: string;
      page: number;
      per_page: number;
      sha?: string;
    } = { owner, repo, page, per_page: perPage };
    if (ref) requestParams.sha = ref;

    const response = await this.octokit.rest.repos.listCommits(requestParams);

    const commits: GitCommit[] = response.data.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: {
        name: c.commit.author?.name ?? 'Unknown',
        email: c.commit.author?.email ?? '',
        date: c.commit.author?.date ?? new Date().toISOString(),
        avatarUrl: c.author?.avatar_url,
      },
      url: c.html_url,
    }));

    const linkHeader = response.headers.link ?? '';
    const hasNextPage = linkHeader.includes('rel="next"');

    return { data: commits, hasNextPage };
  }

  async listPRs(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open',
    params: PaginationParams = {}
  ): Promise<PaginatedResult<GitPullRequest>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 30;

    const response = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state,
      page,
      per_page: perPage,
      sort: 'updated',
      direction: 'desc',
    });

    const prs: GitPullRequest[] = response.data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
      author: {
        login: pr.user?.login ?? 'unknown',
        avatarUrl: pr.user?.avatar_url ?? '',
      },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      url: pr.html_url,
    }));

    const linkHeader = response.headers.link ?? '';
    const hasNextPage = linkHeader.includes('rel="next"');

    return { data: prs, hasNextPage };
  }

  async listIssues(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open',
    params: PaginationParams = {}
  ): Promise<PaginatedResult<GitIssue>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 30;

    const response = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
      page,
      per_page: perPage,
      sort: 'updated',
      direction: 'desc',
    });

    // Filter out pull requests (GitHub API returns PRs as issues)
    const issues: GitIssue[] = response.data
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? null,
        state: issue.state as 'open' | 'closed',
        author: {
          login: issue.user?.login ?? 'unknown',
          avatarUrl: issue.user?.avatar_url ?? '',
        },
        labels: (issue.labels ?? [])
          .filter((l): l is { name: string; color: string } =>
            typeof l === 'object' && l !== null && 'name' in l
          )
          .map((l) => ({
            name: (l as { name: string; color: string }).name,
            color: (l as { name: string; color: string }).color,
          })),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        url: issue.html_url,
      }));

    const linkHeader = response.headers.link ?? '';
    const hasNextPage = linkHeader.includes('rel="next"');

    return { data: issues, hasNextPage };
  }

  async createReview(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    comments: GitReviewComment[],
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'
  ): Promise<{ id: number }> {
    const { data } = await this.octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      body,
      event,
      comments: comments.map((c) => ({
        path: c.path,
        line: c.line,
        body: c.body,
      })),
    });

    return { id: data.id };
  }

  async revokeAccess(): Promise<void> {
    // Attempt to revoke the OAuth token via GitHub API
    try {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (clientId && clientSecret) {
        // Use the OAuth app endpoint to delete the token
        await fetch(
          `https://api.github.com/applications/${clientId}/token`,
          {
            method: 'DELETE',
            headers: {
              Authorization:
                'Basic ' +
                Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ access_token: this.token }),
          }
        );
      }
    } catch {
      // Token revocation is best-effort; the token will be deleted from our DB regardless
      console.warn('GitHub token revocation failed (best-effort)');
    }
  }
}
