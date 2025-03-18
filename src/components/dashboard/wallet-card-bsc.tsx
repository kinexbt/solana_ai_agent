'use client';

import { useState } from 'react';

import Link from 'next/link';

import { useDelegatedActions } from '@privy-io/react-auth';
import { useFundWallet, useSolanaWallets } from '@privy-io/react-auth/solana';
import {
  ArrowRightFromLine,
  ArrowUpDown,
  Banknote,
  CheckCircle2,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { useSWRConfig } from 'swr';

import { TokenTransferDialog } from '@/components/transfer-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyableText } from '@/components/ui/copyable-text';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { searchWalletAssets } from '@/lib/solana/helius';
import { cn } from '@/lib/utils';
import { setActiveWallet } from '@/server/actions/wallet';
import { EmbeddedWallet } from '@/types/db';
import { SOL_MINT } from '@/types/helius/portfolio';

interface WalletCardProps {
  wallet: EmbeddedWallet;
  // from the parent SWR, re-fetches the entire wallet list
  mutateWallets: () => Promise<EmbeddedWallet[] | undefined>;
  allWalletAddresses: string[];
}

export function WalletCardBsc({
  wallet,
  mutateWallets,
  allWalletAddresses,
}: WalletCardProps) {
  const { mutate } = useSWRConfig();
  const { fundWallet } = useFundWallet();
  const { exportWallet } = useSolanaWallets();
  const { delegateWallet, revokeWallets } = useDelegatedActions();

  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isPrivyWallet = wallet.walletSource === 'PRIVY';

  const {
    data: walletPortfolio,
    isLoading: isWalletPortfolioLoading,
    mutate: mutateWalletPortfolio,
  } = useSWR(
    ['wallet-portfolio', wallet.publicKey],
    () => searchWalletAssets(wallet.publicKey),
    { refreshInterval: 30000 },
  );

  /**
   * Refresh wallet list + this wallet's balance
   */
  async function refreshWalletData() {
    await mutateWallets();
    await mutateWalletPortfolio();
  }

  async function handleDelegationToggle() {
    try {
      setIsLoading(true);
      if (!wallet.delegated) {
        await delegateWallet({
          address: wallet.publicKey,
          chainType: 'solana',
        });
        toast.success('Wallet delegated');
      } else {
        await revokeWallets();
        toast.success('Delegation revoked');
      }
      await refreshWalletData();
    } catch (err) {
      toast.error('Failed to update delegation');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetActive() {
    if (wallet.active) return;
    try {
      setIsLoading(true);
      await setActiveWallet({ publicKey: wallet.publicKey });
      toast.success('Wallet set as active');
      await refreshWalletData();
    } catch (err) {
      toast.error('Failed to set wallet as active');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFundWallet() {
    try {
      setIsLoading(true);
      await fundWallet(wallet.publicKey, { cluster: { name: 'mainnet-beta' } });
      toast.success('Wallet funded');
      await refreshWalletData();
    } catch (err) {
      toast.error('Failed to fund wallet');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCloseDialog() {
    setIsSendDialogOpen(false);
  }

  async function onTransferSuccess() {
    mutate((key) => {
      return Array.isArray(key) && key[0] === 'wallet-portfolio';
    });
  }

  const solBalanceInfo = walletPortfolio?.fungibleTokens?.find(
    (t) => t.id === SOL_MINT,
  );

  const balance = solBalanceInfo
    ? solBalanceInfo.token_info.balance /
      10 ** solBalanceInfo.token_info.decimals
    : undefined;

  const otherAddresses = allWalletAddresses.filter(
    (address) => address !== wallet.publicKey,
  );

  return (
    <>
      <Card className="relative overflow-hidden transition-all duration-300 hover:border-primary/30">
        <CardContent className="space-y-4 p-6">
          {/* Status Badges */}
          <div className="flex items-center gap-2">
            {wallet?.active && (
              <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Active
              </div>
            )}
            {isPrivyWallet && wallet?.delegated && (
              <div className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Delegated
              </div>
            )}
          </div>

          {/* Balance Section */}
          <div className="space-y-1">
            <Label className="text-xs font-normal text-muted-foreground">
              Available Balance
            </Label>
            <div className="flex items-baseline gap-2">
              {isWalletPortfolioLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                <>
                  <span className="text-3xl font-bold tabular-nums tracking-tight">
                    {balance?.toFixed(4)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    BNB
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Public Key Section */}
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">
              Public Key
            </Label>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <CopyableText text={wallet?.publicKey || ''} showSolscan />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              className="w-full sm:w-auto"
              onClick={handleFundWallet}
              disabled={isLoading}
            >
              <Banknote className="mr-2 h-4 w-4" />
              Fund
            </Button>

            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setIsSendDialogOpen(true)}
              disabled={isLoading}
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Send
            </Button>

            {isPrivyWallet && (
              <>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => exportWallet({ address: wallet.publicKey })}
                  disabled={isLoading}
                >
                  <ArrowRightFromLine className="mr-2 h-4 w-4" />
                  Export
                </Button>

                <Button
                  variant="outline"
                  className={cn(
                    'w-full sm:w-auto',
                    wallet?.delegated ? 'hover:bg-destructive' : '',
                  )}
                  onClick={handleDelegationToggle}
                  disabled={isLoading}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {wallet?.delegated ? 'Revoke' : 'Delegate'}
                </Button>
              </>
            )}

            {!wallet?.active && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleSetActive}
                disabled={isLoading}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Set Active
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <TokenTransferDialog
        isOpen={isSendDialogOpen}
        onClose={handleCloseDialog}
        tokens={walletPortfolio?.fungibleTokens || []}
        onSuccess={onTransferSuccess}
        otherAddresses={otherAddresses}
        walletId={wallet.id}
      />
    </>
  );
}
