'use client';

import { useEffect, useState } from 'react';

import detectEthereumProvider from '@metamask/detect-provider';
import { usePrivy } from '@privy-io/react-auth';
import useSWR from 'swr';

import { useUser } from '@/hooks/use-user';
import { throttle } from '@/lib/utils';
import { WalletPortfolio } from '@/types/bsc/portfolioBsc';

export function useWalletPortfolio() {
  const { user } = useUser();
  const { authenticated } = usePrivy(); // Get authentication status from Privy
  const [currentWalletAddress, setCurrentWalletAddress] = useState<
    string | null
  >(null);

  useEffect(() => {
    async function updateWalletAddress() {
      // 1. Check if MetaMask is connected
      const provider: any = await detectEthereumProvider();
      if (provider && provider.selectedAddress) {
        setCurrentWalletAddress(provider.selectedAddress);
        return;
      }
      console.log('provider: ', provider);
      console.log('authenticated status: ', authenticated);
      // 2. Check if the user has connected an external wallet via Privy
      // Removed wallet check as 'wallets' is not available on PrivyInterface
      if (authenticated) {
        console.warn('Authenticated, but no wallet information available.');
        return;
      }

      // 3. Fallback: Use the first embedded wallet from the user object
      if ((user?.wallets?.length as number) > 0) {
        if (user && user.wallets && user.wallets.length > 0) {
          setCurrentWalletAddress(user.wallets[0].publicKey);
        }
      }
    }

    updateWalletAddress();

    // Listen for MetaMask account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setCurrentWalletAddress(accounts[0] || null);
      });
    }
  }, [authenticated, user]);

  const { data, mutate, isLoading } = useSWR<WalletPortfolio>(
    currentWalletAddress ? ['wallet-portfolio', currentWalletAddress] : null,
    async () => {
      if (!currentWalletAddress) throw new Error('No wallet address');

      const response = await fetch(
        `/api/wallet/${currentWalletAddress}/portfolio`,
      );
      if (!response.ok) throw new Error('Failed to fetch portfolio');

      return response.json();
    },
    {
      refreshInterval: 60000, // Refresh every 60 seconds
      revalidateOnFocus: true,
      keepPreviousData: true,
    },
  );

  const refresh = throttle(() => {
    mutate();
  }, 1000);

  return { data, refresh, isLoading, currentWalletAddress };
}
