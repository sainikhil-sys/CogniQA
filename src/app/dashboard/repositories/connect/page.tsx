import { Suspense } from 'react';
import ConnectClient from './ConnectClient';

export const metadata = {
  title: 'Connect GitHub — CogniQA',
  description: 'Connect your GitHub account to import and analyze repositories with CogniQA.',
};

export default function ConnectGitHubPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      }
    >
      <ConnectClient />
    </Suspense>
  );
}
