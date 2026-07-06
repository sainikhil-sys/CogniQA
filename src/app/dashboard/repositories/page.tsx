import { Suspense } from 'react';
import RepositoriesClient from './RepositoriesClient';

export const metadata = {
  title: 'Repositories — CogniQA',
  description: 'Manage your imported GitHub repositories for AI-powered code analysis.',
};

export default function RepositoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      }
    >
      <RepositoriesClient />
    </Suspense>
  );
}
