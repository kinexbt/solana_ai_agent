'use server';

import { ethers } from 'ethers';
import { z } from 'zod';

import { BSC_RPC_URL } from '@/lib/constants';
import prisma from '@/lib/prisma';
import { ActionResponse, actionClient } from '@/lib/safe-action';
import { decryptPrivateKey } from '@/lib/solana/wallet-generator';
import { EmbeddedWallet } from '@/types/db';

import { retrieveAgentKit } from './ai';
import { verifyUser } from './user';

const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);

export const listEmbeddedWallets = actionClient.action<
  ActionResponse<EmbeddedWallet[]>
>(async () => {
  const authResult = await verifyUser();
  const userId = authResult?.data?.data?.id;

  if (!userId) {
    return {
      success: false,
      error: 'Authentication failed',
    };
  }

  const wallets = await prisma.wallet.findMany({
    where: { userId: userId },
  });

  return {
    success: true,
    data: wallets || [],
  };
});

export const getActiveWallet = actionClient.action<
  ActionResponse<EmbeddedWallet>
>(async () => {
  const authResult = await verifyUser();
  const userId = authResult?.data?.data?.id;

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const wallet = await prisma.wallet.findFirst({
    where: {
      userId: userId,
      active: true,
    },
  });

  if (!wallet) {
    return { success: false, error: 'Wallet not found' };
  }

  return {
    success: true,
    data: wallet,
  };
});

export const setActiveWallet = actionClient
  .schema(z.object({ publicKey: z.string() }))
  .action(async ({ parsedInput: { publicKey } }) => {
    const authResult = await verifyUser();
    const userId = authResult?.data?.data?.id;

    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const wallet = await prisma.wallet.findFirst({
      where: {
        userId: userId,
        publicKey,
      },
    });

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    const existingWallet = await prisma.wallet.findFirst({
      where: {
        userId: userId,
        active: true,
      },
    });

    if (existingWallet) {
      await prisma.wallet.update({
        where: {
          userId_publicKey: {
            userId: userId,
            publicKey: existingWallet.publicKey,
          },
        },
        data: {
          active: false,
        },
      });
    }

    await prisma.wallet.update({
      where: {
        userId_publicKey: {
          userId: userId,
          publicKey,
        },
      },
      data: {
        active: true,
      },
    });

    return {
      success: true,
    };
  });

export const embeddedWalletSendBNB = actionClient
  .schema(
    z.object({
      walletId: z.string(),
      recipientAddress: z.string(),
      amount: z.number(),
    }),
  )
  .action<ActionResponse<string>>(
    async ({ parsedInput: { walletId, recipientAddress, amount } }) => {
      const authResult = await verifyUser();
      const userId = authResult?.data?.data?.id;
      if (!userId) {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }

      // Fetch wallet from database
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet || wallet.userId !== userId) {
        return {
          success: false,
          error: 'Wallet not found',
        };
      }

      // Decrypt private key (Make sure `decryptPrivateKey` works for BSC)
      let privateKey;
      try {
        privateKey = await decryptPrivateKey(wallet.encryptedPrivateKey);
      } catch (error) {
        return {
          success: false,
          error: 'Failed to decrypt private key',
        };
      }

      // Create Wallet Signer
      const signer = new ethers.Wallet(privateKey, provider);

      try {
        // Convert BNB amount to Wei
        const value = ethers.parseEther(amount.toString());

        // Create & send transaction
        const tx = await signer.sendTransaction({
          to: recipientAddress,
          value: value,
          gasLimit: ethers.toBigInt(21000), // Standard gas limit for BNB transfer
        });

        return {
          success: true,
          data: tx.hash, // Return transaction hash
        };
      } catch (error) {
        return {
          success: false,
          error:
            'Failed to send BNB: ' +
            (error instanceof Error ? error.message : String(error)),
        };
      }
    },
  );
