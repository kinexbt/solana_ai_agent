'use client';

import { startTransition, useOptimistic } from 'react';
import { useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import {
  Discord,
  OAuthTokens,
  Twitter,
  User,
  WalletWithMetadata,
  useOAuthTokens,
  usePrivy,
} from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { mutate } from 'swr';

import { WalletCard } from '@/components/dashboard/wallet-card';
import { ReferralSection } from '@/components/referral-section';
import { SubscriptionSection } from '@/components/subscription/subscription-section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyableText } from '@/components/ui/copyable-text';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUser } from '@/hooks/use-user';
import { useEmbeddedWallets } from '@/hooks/use-wallets';
import { IS_SUBSCRIPTION_ENABLED, cn } from '@/lib/utils';
import {
  formatPrivyId,
  formatUserCreationDate,
  formatWalletAddress,
  truncate,
} from '@/lib/utils/format';
import { getUserID, grantDiscordRole } from '@/lib/utils/grant-discord-role';
import {
  reactivateUser,
  subscribeUser,
  unsubscribeUser,
} from '@/server/actions/subscription';
import { type UserUpdateData, updateUser } from '@/server/actions/user';
import { EmbeddedWallet } from '@/types/db';

import { LoadingStateSkeleton } from './loading-skeleton';

export default function AccountContent() {
  const router = useRouter();
  const { ready } = usePrivy();
  const [isSubscribing, setIsSubscribing] = useState(false);

  const {
    isLoading: isUserLoading,
    user,
    linkTwitter,
    unlinkTwitter,
    linkEmail,
    unlinkEmail,
    linkDiscord,
    unlinkDiscord,
    linkWallet,
    unlinkWallet,
  } = useUser();

  const [optimisticUser, updateOptimisticUser] = useOptimistic(
    {
      degenMode: user?.degenMode || false,
    },
    (state, update: UserUpdateData) => ({
      ...state,
      ...update,
    }),
  );

  const {
    data: embeddedWallets = [],
    error: walletsError,
    isLoading: isWalletsLoading,
    mutate: mutateWallets,
  } = useEmbeddedWallets();

  const { createWallet: createSolanaWallet } = useSolanaWallets();

  const { reauthorize } = useOAuthTokens({
    onOAuthTokenGrant: (tokens: OAuthTokens, { user }: { user: User }) => {
      // Grant Discord role
      handleGrantDiscordRole(tokens.accessToken);
    },
  });

  const handleSubscribe = async () => {
    if (!privyUser?.wallet?.address) return;

    try {
      setIsSubscribing(true);
      const response = await subscribeUser();

      if (response?.data?.success) {
        toast.success('Subscribed successfully');
      } else if (response?.data?.error) {
        toast.error('Failed to subscribe', {
          description: response.data.error,
        });
      }
    } catch (error) {
      toast.error('Failed to subscribe', {
        description: 'Could not subscribe due to an unknown error',
      });
    } finally {
      setIsSubscribing(false);
      handleUpdateUser({});
    }
  };

  const handleReactivate = async () => {
    if (!privyUser?.wallet?.address) return;

    try {
      setIsSubscribing(true);
      const response = await reactivateUser();

      if (response?.data?.success) {
        toast.success('Reactivated subscription');
      } else if (response?.data?.error) {
        toast.error('Failed to reactivate subscription', {
          description: response.data.error,
        });
      }
    } catch (error) {
      toast.error('Failed to reactivate subscription', {
        description: 'Could not subscribe due to an unknown error',
      });
    } finally {
      setIsSubscribing(false);
      handleUpdateUser({});
    }
  };

  const handleUnsubscribe = async () => {
    if (!privyUser?.wallet?.address) return;

    try {
      setIsSubscribing(true);
      const response = await unsubscribeUser();

      if (response?.data?.success) {
        toast.success('Unsubscribed successfully');
      } else if (response?.data?.error) {
        toast.error('Failed to unsubscribe', {
          description: response.data.error,
        });
      }
    } catch (error) {
      toast.error('Failed to unsubscribe', {
        description: 'Could not unsubscribe due to an unknown error',
      });
    } finally {
      setIsSubscribing(false);
      handleUpdateUser({});
    }
  };

  const handleUpdateReferralCode = async (referralCode: string) => {
    try {
      const result = await handleUpdateUser({
        referralCode,
      });

      if (result.success) {
        toast.success('Referral code updated');
      } else {
        toast.error(result.error || 'Failed to update referral code');
      }
    } catch (err) {
      toast.error('Failed to update referral code');
    }
  };

  if (isUserLoading || isWalletsLoading || !user) {
    return <LoadingStateSkeleton />;
  }
  if (walletsError) {
    return (
      <div className="p-4 text-sm text-red-500">
        Failed to load wallets: {walletsError.message}
      </div>
    );
  }

  const privyUser = user.privyUser;
  const userData = {
    privyId: privyUser?.id,
    twitter: privyUser?.twitter as Twitter | undefined,
    email: privyUser?.email?.address,
    phone: privyUser?.phone?.number,
    walletAddress: privyUser?.wallet?.address,
    createdAt: formatUserCreationDate(user?.createdAt?.toString()),
    discord: privyUser?.discord as Discord | undefined,
  };

  const privyWallets = embeddedWallets.filter(
    (w: EmbeddedWallet) => w.walletSource === 'PRIVY' && w.chain === 'SOLANA',
  );
  const legacyWallets = embeddedWallets.filter(
    (w: EmbeddedWallet) => w.walletSource === 'CUSTOM' && w.chain === 'SOLANA',
  );

  const activeWallet = embeddedWallets.find((w) => w.active);

  const allUserLinkedAccounts = privyUser?.linkedAccounts || [];
  const linkedSolanaWallet = allUserLinkedAccounts.find(
    (acct): acct is WalletWithMetadata =>
      acct.type === 'wallet' &&
      acct.walletClientType !== 'privy' &&
      acct.chainType === 'solana',
  );

  const avatarLabel = userData.walletAddress
    ? userData.walletAddress.substring(0, 2).toUpperCase()
    : '?';

  async function handleGrantDiscordRole(accessToken: string) {
    try {
      const discordUserId = await getUserID(accessToken);
      await grantDiscordRole(discordUserId);
    } catch (error) {
      throw new Error(`Failed to grant Discord role: ${error}`);
    }
  }

  const allWalletAddresses = [
    ...(linkedSolanaWallet ? [linkedSolanaWallet.address] : []),
    ...privyWallets.map((w) => w.publicKey),
    ...legacyWallets.map((w) => w.publicKey),
  ];

  const handleUpdateUser = async (data: UserUpdateData) => {
    startTransition(() => {
      updateOptimisticUser(data);
    });

    const result = await updateUser(data);
    if (result.success) {
      await mutate(`user-${userData.privyId}`);
    }

    return result;
  };
  const handleSelectAccount = (chain: 'solana' | 'bsc') => {
    const route = chain === 'solana' ? '/solana' : '/bsc';
    router.push(route);
  };

  return (
    <div className="flex-2 flex">
      <div className="flex flex-1 flex-col py-4">
        <div className="flex-2 flex justify-between">
          <div className="flex-start flex border-b border-gray-300 px-8 pb-2">
            <Image
              src="/solana-chain-avatar.png"
              alt="Solana chain avatar"
              width={24}
              height={8}
            />
            <h2 className="px-2 font-bold">Solana Chain Account</h2>
          </div>
        </div>
        <div className="w-full px-8">
          <div className="max-w-3xl space-y-6 ">
            {/* Profile Information Section */}
            <section className="space-y-4">
              <h2 className="py-2 text-sm font-medium text-muted-foreground">
                Profile Information
              </h2>

              <Card className="bg-sidebar">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* User basic information */}
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage
                          src={userData.twitter?.profilePictureUrl || undefined}
                          className="rounded-lg object-cover"
                        />
                        <AvatarFallback className="rounded-lg bg-sidebar-accent">
                          {avatarLabel}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {userData.twitter
                            ? `@${userData.twitter.username}`
                            : formatWalletAddress(userData.walletAddress)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Member since {userData.createdAt}
                        </p>
                      </div>
                    </div>

                    <Separator className="bg-sidebar-accent/50" />

                    {/* Contact information */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Account ID
                        </Label>
                        <div className="mt-1">
                          <CopyableText
                            text={formatPrivyId(userData.privyId)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Early Access Program
                        </Label>
                        <div className="mt-1 flex h-8 items-center">
                          <span className={cn('text-sm font-medium')}>
                            {user?.earlyAccess ? 'Active' : 'Not Active'}
                          </span>

                          {!user?.earlyAccess && !IS_SUBSCRIPTION_ENABLED && (
                            <div className="ml-auto">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => router.push('/home')}
                              >
                                Get Early Access
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Degen Mode
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Enable Degen Mode to skip confirmation prompts
                                  for on-chain actions
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="mt-1 flex h-8 items-center justify-between">
                          <span className={cn('text-sm font-medium')}>
                            {optimisticUser.degenMode ? 'Enabled' : 'Disabled'}
                          </span>
                          <Switch
                            checked={optimisticUser.degenMode}
                            onCheckedChange={async (checked) => {
                              await handleUpdateUser({ degenMode: checked });
                            }}
                            aria-label="Toggle degen mode"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Referrals */}
            <ReferralSection
              referralCode={user?.referralCode}
              referringUserId={user?.referringUserId}
              handleUpdateReferralCode={handleUpdateReferralCode}
            />

            {/* Connected Accounts Section */}
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Connected Accounts
              </h2>
              <Card className="bg-sidebar">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Wallet Connection */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent/50">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Wallet</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="hidden sm:inline">
                              {linkedSolanaWallet?.address
                                ? linkedSolanaWallet?.address
                                : 'Not connected'}
                            </span>
                            <span className="sm:hidden">
                              {linkedSolanaWallet?.address
                                ? truncate(linkedSolanaWallet?.address)
                                : 'Not connected'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={
                          linkedSolanaWallet?.address
                            ? () => unlinkWallet(linkedSolanaWallet?.address)
                            : () => linkWallet()
                        }
                        className={cn(
                          'min-w-[100px] text-xs',
                          linkedSolanaWallet?.address &&
                            'hover:bg-destructive hover:text-destructive-foreground',
                        )}
                      >
                        {linkedSolanaWallet?.address ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>

                    {/* Twitter Connection */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent/50">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="currentColor"
                          >
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">X (Twitter)</p>
                          <p className="text-xs text-muted-foreground">
                            {userData.twitter
                              ? `@${userData.twitter.username}`
                              : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={
                          userData.twitter
                            ? () => unlinkTwitter(userData.twitter!.subject)
                            : linkTwitter
                        }
                        className={cn(
                          'min-w-[100px] text-xs',
                          userData.twitter &&
                            'hover:bg-destructive hover:text-destructive-foreground',
                        )}
                      >
                        {userData.twitter ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>

                    {/* Email Connection */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent/50">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-xs text-muted-foreground">
                            {userData.email || 'Not connected'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={
                          userData.email
                            ? () => unlinkEmail(userData.email!)
                            : linkEmail
                        }
                        className={cn(
                          'min-w-[100px] text-xs',
                          userData.email &&
                            'hover:bg-destructive hover:text-destructive-foreground',
                        )}
                      >
                        {userData.email ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>

                    {/* Discord Connection */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent/50">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="currentColor"
                          >
                            <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 00-5.487 0 12.505 12.505 0 00-.617-1.249.077.077 0 00-.079-.037c-1.6.363-3.15.915-4.885 1.515a.07.07 0 00-.032.027C.533 9.045-.32 13.579.099 18.057a.082.082 0 00.031.056 19.908 19.908 0 005.993 3.04.078.078 0 00.084-.027c.464-.641.875-1.317 1.226-2.02a.076.076 0 00-.041-.105 13.098 13.098 0 01-1.872-.9.078.078 0 01-.008-.13c.126-.094.252-.192.373-.291a.074.074 0 01.077-.01c3.927 1.793 8.18 1.793 12.061 0a.073.073 0 01.078.009c.121.099.247.198.373.292a.078.078 0 01-.006.13 12.39 12.39 0 01-1.873.899.076.076 0 00-.04.106c.36.703.772 1.379 1.226 2.02a.077.077 0 00.084.028 19.876 19.876 0 005.994-3.04.077.077 0 00.031-.055c.5-5.177-.838-9.657-4.268-13.661a.061.061 0 00-.031-.028zM8.02 15.331c-1.18 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.955 2.419-2.156 2.419zm7.975 0c-1.18 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.946 2.419-2.156 2.419z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Discord</p>
                          <p className="text-xs text-muted-foreground">
                            {userData.discord
                              ? `@${userData.discord.username}`
                              : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={
                          userData.discord
                            ? () => unlinkDiscord(userData.discord!.subject)
                            : linkDiscord
                        }
                        className={cn(
                          'min-w-[100px] text-xs',
                          userData.discord &&
                            'hover:bg-destructive hover:text-destructive-foreground',
                        )}
                      >
                        {userData.discord ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Subscription Section (displayed only if user is not EAP) */}
            {user?.earlyAccess && IS_SUBSCRIPTION_ENABLED ? (
              <section className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Subscription Management
                </h2>
                <Card className="bg-sidebar">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm">
                              EAP Status - subscription not required ❤️
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            ) : activeWallet && IS_SUBSCRIPTION_ENABLED ? (
              <SubscriptionSection
                isSubscribed={user?.subscription?.active ?? false}
                nextPaymentDate={
                  user?.subscription?.nextPaymentDate
                    ? new Date(user?.subscription?.nextPaymentDate)
                    : undefined
                }
                endDate={
                  user?.subscription?.endDate
                    ? new Date(user?.subscription?.endDate)
                    : undefined
                }
                wallet={activeWallet}
                paymentHistory={user?.subscription?.payments}
                onSubscribe={handleSubscribe}
                onUnsubscribe={handleUnsubscribe}
                onReactivate={handleReactivate}
              />
            ) : IS_SUBSCRIPTION_ENABLED ? (
              <section className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Subscription Management
                </h2>
                <Card className="bg-sidebar">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm font-medium">
                              Please ensure you have an active embedded wallet.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            ) : null}

            {/* Privy Embedded Wallet Section */}
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Privy Embedded Wallets
              </h2>
              {privyWallets.length > 0
                ? privyWallets.map((wallet) => (
                    <WalletCard
                      key={wallet.id}
                      wallet={wallet}
                      mutateWallets={mutateWallets}
                      allWalletAddresses={allWalletAddresses}
                    />
                  ))
                : ready && (
                    <Card className="bg-sidebar">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div>
                                <p className="text-sm font-medium">
                                  Public Key
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  None created yet
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                createSolanaWallet().then(() => mutateWallets())
                              }
                              className={cn('min-w-[100px] text-xs')}
                            >
                              Create
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
            </section>

            {/* Legacy Embedded Wallet Section */}
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Legacy Embedded Wallet
              </h2>
              {legacyWallets.map((wallet: EmbeddedWallet) => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  mutateWallets={mutateWallets}
                  allWalletAddresses={allWalletAddresses}
                />
              ))}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
