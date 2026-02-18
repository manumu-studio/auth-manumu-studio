// Displays connected OAuth providers with disconnect functionality
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { disconnectProvider } from '@/features/account/server/actions/disconnectProvider';
import type { ConnectedAccountsProps } from './ConnectedAccounts.types';

// Provider display config
const providerInfo: Record<string, { label: string; color: string }> = {
  google: { label: 'Google', color: '#4285F4' },
  github: { label: 'GitHub', color: '#333' },
};

export default function ConnectedAccounts({ providers, hasPassword }: ConnectedAccountsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const handleDisconnect = (provider: string) => {
    setError(null);
    setDisconnecting(provider);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('provider', provider);

      const result = await disconnectProvider(formData);

      if (!result.ok) {
        setError(result.errors.formErrors?.[0] ?? 'Failed to disconnect provider');
        setDisconnecting(null);
        return;
      }

      setDisconnecting(null);
      router.refresh();
    });
  };

  // No connected providers
  if (providers.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
        No connected accounts. Sign in with Google or GitHub to link your account.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Error banner */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Provider list */}
      {providers.map(({ provider }) => {
        const info = providerInfo[provider] ?? { label: provider, color: '#666' };
        const isDisconnecting = disconnecting === provider;
        const canDisconnect = hasPassword || providers.length > 1;

        return (
          <div
            key={provider}
            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-[#3f3f3f]"
          >
            <div className="flex items-center gap-3">
              {/* Provider icon dot */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: info.color }}
              >
                {info.label[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                  {info.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Connected</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDisconnect(provider)}
              disabled={!canDisconnect || isPending}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={!canDisconnect ? 'Set a password before disconnecting your only provider' : undefined}
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        );
      })}

      {/* Help text */}
      {!hasPassword && providers.length === 1 && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
          Set a password before disconnecting your only sign-in method.
        </p>
      )}
    </div>
  );
}
