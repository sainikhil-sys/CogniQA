import RepoDetailClient from './RepoDetailClient';

export const metadata = {
  title: 'Repository — CogniQA',
  description: 'View repository details, branches, commits, pull requests, and issues.',
};

export default function RepoDetailPage() {
  return <RepoDetailClient />;
}
