'use server';

import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';

import { PrivyClient } from '@privy-io/server-auth';
import { WalletWithMetadata } from '@privy-io/server-auth';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';

import { useWalletPortfolio } from '@/hooks/use-wallet-portfolio';
import { generateEncryptedKeyPair } from '@/lib/bsc/wallet-generator';
import prisma from '@/lib/prisma';
import { ActionResponse, actionClient } from '@/lib/safe-action';
import { EmbeddedWallet, PrismaUser } from '@/types/db';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
const PRIVY_SIGNING_KEY = process.env.PRIVY_SIGNING_KEY;

if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
  throw new Error('Missing required Privy environment variables');
}

const PRIVY_SERVER_CLIENT = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET, {
  ...(!!PRIVY_SIGNING_KEY && {
    walletApi: {
      authorizationPrivateKey: PRIVY_SIGNING_KEY,
    },
  }),
});

// Helper function to generate unique referral codes
const generateReferralCode = async (): Promise<string> => {
  const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890', 8); // 8-character alphanumeric

  const MAX_ATTEMPTS = 10; // Limit to prevent infinite loops
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    const referralCode = nanoid();
    const existingCode = await prisma.user.findUnique({
      where: { referralCode },
    });

    if (!existingCode) {
      return referralCode; // Return the unique code
    }

    attempts++;
  }

  // Failsafe: throw an error if a unique code couldn't be generated
  throw new Error(
    'Unable to generate a unique referral code after 10 attempts',
  );
};

const getOrCreateUser = actionClient
  .schema(z.object({ userId: z.string() }))
  .action<ActionResponse<PrismaUser>>(async ({ parsedInput: { userId } }) => {
    const token = (await cookies()).get('privy-token')?.value;
    if (!token) {
      return { success: false, error: 'No privy token found' };
    }

    try {
      const claims = await PRIVY_SERVER_CLIENT.verifyAuthToken(token);

      const existingUser = await prisma.user.findUnique({
        where: { privyId: claims.userId },
        include: {
          wallets: {
            select: {
              id: true,
              userId: true,
              name: true,
              publicKey: true,
              walletSource: true,
              delegated: true,
              active: true,
              chain: true,
              encryptedPrivateKey: true,
              createdAt: true,
              updatedAt: true,
            },
            where: {
              active: true,
            },
          },
          subscription: {
            include: {
              payments: true,
            },
          },
        },
      });

      if (existingUser) {
        // If the user exists but doesn't have a referralCode, generate one
        if (!existingUser.referralCode) {
          const referralCode = await generateReferralCode();
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { referralCode },
          });
          existingUser.referralCode = referralCode;
        }
        return { success: true, data: existingUser };
      }

      // Look up referralCode from cookie
      const cookieReferralCode = (await cookies()).get('referralCode')?.value;
      let referringUserId: string | null = null;

      if (cookieReferralCode) {
        const referringUser = await prisma.user.findUnique({
          where: { referralCode: cookieReferralCode },
          select: { id: true },
        });

        if (referringUser) {
          referringUserId = referringUser.id;
        }
      }

      // Create a new user if none exists
      const referralCode = await generateReferralCode();
      const createdUser = await prisma.user.create({
        data: {
          privyId: userId,
          referralCode,
          referringUserId,
        },
      });

      const { publicKey, encryptedPrivateKey } =
        await generateEncryptedKeyPair();
      const initialWallet = await prisma.wallet.create({
        data: {
          userId: createdUser.id,
          name: 'Default',
          publicKey,
          encryptedPrivateKey,
        },
      });

      return {
        success: true,
        data: {
          ...createdUser,
          wallets: [
            {
              id: initialWallet.id,
              userId: initialWallet.userId,
              name: initialWallet.name,
              publicKey: initialWallet.publicKey,
              walletSource: initialWallet.walletSource,
              delegated: initialWallet.delegated,
              active: initialWallet.active,
              chain: initialWallet.chain,
              encryptedPrivateKey: initialWallet.encryptedPrivateKey,
              createdAt: initialWallet.createdAt || new Date(),
              updatedAt: initialWallet.updatedAt || new Date(),
            },
          ],
          subscription: {
            id: '',
            userId: createdUser.id,
            active: false,
            createdAt: new Date(),
            startDate: new Date(),
            nextPaymentDate: new Date(),
            endDate: null,
            billingCycle: 'MONTHLY',
            payments: [],
          },
        },
      };
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      return { success: false, error: 'Authentication failed' };
    }
  });

export const verifyUser = actionClient.action<
  ActionResponse<{
    id: string;
    degenMode: boolean;
    publicKey?: string;
    privyId: string;
  }>
>(async () => {
  const token = (await cookies()).get('privy-token')?.value;
  if (!token) {
    return {
      success: false,
      error: 'No privy token found',
    };
  }

  try {
    const claims = await PRIVY_SERVER_CLIENT.verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { privyId: claims.userId },
      select: {
        id: true,
        degenMode: true,
        privyId: true,
        wallets: {
          select: {
            publicKey: true,
          },
          where: {
            active: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        privyId: user.privyId,
        publicKey: user.wallets[0]?.publicKey,
        degenMode: user.degenMode,
      },
    };
  } catch (error) {
    console.error('Error verifying user:', error);
    return { success: false, error: 'Authentication failed' };
  }
});

export const getUserData = actionClient.action<ActionResponse<PrismaUser>>(
  async () => {
    const token = (await cookies()).get('privy-token')?.value;
    if (!token) {
      return {
        success: false,
        error: 'No privy token found',
      };
    }

    try {
      const claims = await PRIVY_SERVER_CLIENT.verifyAuthToken(token);

      const response = await getOrCreateUser({ userId: claims.userId });
      if (!response?.data?.success) {
        return {
          success: false,
          error: response?.data?.error || 'Failed to retrieve user data',
        };
      }

      const user = response.data?.data;
      if (!user) {
        return { success: false, error: 'Could not create or retrieve user' };
      }

      return { success: true, data: user };
    } catch (error) {
      console.error('Error getting user data:', error);
      return { success: false, error: 'Authentication failed' };
    }
  },
);

export const syncEmbeddedWallets = actionClient.action<
  ActionResponse<{ wallets: EmbeddedWallet[] }>
>(async () => {
  try {
    const response = await getUserData();
    if (!response?.data?.success || !response.data?.data) {
      return { success: false, error: 'Local user not found in DB' };
    }

    const userData = response.data.data;

    const privyUser = await PRIVY_SERVER_CLIENT.getUser(userData.privyId);

    const embeddedWallets = privyUser.linkedAccounts.filter(
      (acct): acct is WalletWithMetadata =>
        acct.type === 'wallet' && acct.walletClientType === 'privy',
    );

    for (const w of embeddedWallets) {
      const pubkey = w.address;
      if (!pubkey) continue;

      await prisma.wallet.upsert({
        where: {
          userId_publicKey: {
            userId: userData.id,
            publicKey: pubkey,
          },
        },
        update: {
          name: 'Privy Embedded',
          walletSource: 'PRIVY',
          delegated: w.delegated ?? false,
          publicKey: pubkey,
          encryptedPrivateKey: undefined, // This will handle a case where a user imports a wallet to privy
        },
        create: {
          userId: userData.id,
          name: 'Privy Embedded',
          publicKey: pubkey,
          walletSource: 'PRIVY',
          chain: 'BSC',
          delegated: w.delegated ?? false,
          active: false,
          encryptedPrivateKey: '',
        },
      });
    }

    const userWallets = await prisma.wallet.findMany({
      where: { userId: userData.id },
      select: {
        id: true,
        userId: true,
        publicKey: true,
        walletSource: true,
        delegated: true,
        name: true,
        chain: true,
        createdAt: true,
        updatedAt: true,
        encryptedPrivateKey: true,
      },
    });
    const typeWallets: EmbeddedWallet[] = userWallets.map((wallet) => ({
      ...wallet,
      userId: wallet.userId,
    }));

    return { success: true, data: { wallets: userWallets } };
  } catch (error) {
    console.error('Error syncing embedded wallets:', error);
    return { success: false, error: 'Error retrieving updated user' };
  }
});

export const getPrivyClient = actionClient.action(
  async () => PRIVY_SERVER_CLIENT,
);

export type UserUpdateData = {
  degenMode?: boolean;
  referralCode?: string;
};

export async function updateUser(data: UserUpdateData) {
  try {
    const authResult = await verifyUser();
    const userId = authResult?.data?.data?.id;
    const privyId = authResult?.data?.data?.privyId;

    if (!userId) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    // Extract referralCode from the input data
    const { referralCode, degenMode } = data;

    // If referralCode is provided, validate and update referringUserId
    if (referralCode) {
      const referringUser = await prisma.user.findUnique({
        where: { referralCode },
      });

      if (!referringUser) {
        return { success: false, error: 'Invalid referral code' };
      }

      if (referringUser.id === userId) {
        return {
          success: false,
          error: 'You cannot use your own referral code',
        };
      }

      // Prevent getting referred by a user who has already been referred by you
      if (referringUser.referringUserId === userId) {
        return {
          success: false,
          error: 'You cannot use a referral code from someone you referred',
        };
      }

      // Update referringUserId along with other fields
      await prisma.user.update({
        where: { id: userId },
        data: {
          degenMode,
          referringUserId: referringUser.id,
        },
      });
    } else {
      // Update user without referral logic if no referralCode is provided
      await prisma.user.update({
        where: { id: userId },
        data: {
          degenMode,
        },
      });
    }

    // Revalidate user cache
    revalidateTag(`user-${privyId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: 'Failed to update user' };
  }
}
