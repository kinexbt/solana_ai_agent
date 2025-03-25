'use server';

import { type CoreMessage, type CoreUserMessage, generateText } from 'ai';
import { ethers } from 'ethers';
import { z } from 'zod';

import { defaultModel } from '@/ai/providers';
import { PrivyEmbeddedWallet } from '@/lib/bsc/PrivyEmbeddedWallet';
import { decryptPrivateKey } from '@/lib/bsc/wallet-generator';
import { BSC_RPC_URL } from '@/lib/constants';
import prisma from '@/lib/prisma';
import { ActionEmptyResponse, actionClient } from '@/lib/safe-action';
import { BNB_ADDRESS } from '@/types/bsc/portfolioBsc';
import { addressSchema } from '@/types/util';

import { getPrivyClient, verifyUser } from './user';

// BSC Provider
const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);

export async function generateTitleFromUserMessage({
  message,
}: {
  message: string;
}) {
  const { text: title } = await generateText({
    model: defaultModel,
    system: `
        - Generate a short title based on the user's first message.
        - Keep it under 80 characters.
        - Do not use quotes or colons.`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function convertUserResponseToBoolean(message: string) {
  const { text: rawBool } = await generateText({
    model: defaultModel,
    system: `
      - Return true or false based on the user's message.
      - If an explicit affirmative response cannot be determined, return false.`,
    prompt: message,
  });

  return rawBool === 'true';
}

const renameSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
});

export const renameConversation = actionClient
  .schema(renameSchema)
  .action(
    async ({ parsedInput: { id, title } }): Promise<ActionEmptyResponse> => {
      try {
        await prisma.conversation.update({
          where: { id },
          data: { title },
        });
        return { success: true };
      } catch (error) {
        return { success: false, error: 'UNEXPECTED_ERROR' };
      }
    },
  );

export const retrieveAgentKit = actionClient
  .schema(
    z
      .object({
        walletId: z.string(),
      })
      .optional(),
  )
  .action(async ({ parsedInput }) => {
    const authResult = await verifyUser();
    const userId = authResult?.data?.data?.id;

    if (!userId) {
      return { success: false, error: 'UNAUTHORIZED', data: null };
    }

    return await getAgentKit({ userId, walletId: parsedInput?.walletId });
  });

export const getAgentKit = async ({
  userId,
  walletId,
}: {
  userId: string;
  walletId?: string;
}) => {
  const whereClause = walletId
    ? { ownerId: userId, id: walletId }
    : { ownerId: userId, active: true };

  const wallet = await prisma.wallet.findFirst({ where: whereClause });

  if (!wallet) {
    return { success: false, error: 'WALLET_NOT_FOUND' };
  }
  let walletInstance: ethers.Wallet | PrivyEmbeddedWallet;

  if (wallet.encryptedPrivateKey) {
    const decryptedKey = await decryptPrivateKey(wallet.encryptedPrivateKey);
    walletInstance = new ethers.Wallet(decryptedKey, provider);
  } else {
    const privyClientResponse = await getPrivyClient();
    const privyClient = privyClientResponse?.data;

    if (!privyClient) {
      return { success: false, error: 'PRIVY_CLIENT_NOT_FOUND' };
    }

    walletInstance = new PrivyEmbeddedWallet(privyClient, wallet.publicKey);
  }

  return { success: true, data: { walletInstance } };
};

export const transferToken = actionClient
  .schema(
    z.object({
      walletId: z.string(),
      receiverAddress: addressSchema,
      tokenAddress: addressSchema,
      amount: z.string(), // Using string for BigNumber compatibility
      tokenSymbol: z.string().describe('Symbol of the token to send'),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { walletId, receiverAddress, tokenAddress, amount, tokenSymbol } =
      parsedInput;

    const agentResponse = await retrieveAgentKit({ walletId });
    console.log('agentResponse--->', agentResponse);

    if (!agentResponse?.data?.success || !agentResponse?.data?.data) {
      return { success: false, error: 'AGENT_NOT_FOUND' };
    }

    const walletInstance = agentResponse.data.data.walletInstance;
    const amountInWei = ethers.parseUnits(amount, 18);

    const feeData = await provider.getFeeData();
    const maxFeePerGas =
      feeData.maxFeePerGas ?? ethers.parseUnits('10', 'gwei');
    const maxPriorityFeePerGas =
      feeData.maxPriorityFeePerGas ?? ethers.parseUnits('2', 'gwei');
    const nonce = await provider.getTransactionCount(walletInstance.address);

    if (walletInstance instanceof ethers.Wallet) {
      // Case 1: Using ethers.js wallet (private key decrypted)
      let tx;
      if (tokenAddress === BNB_ADDRESS) {
        tx = await walletInstance.sendTransaction({
          to: receiverAddress,
          value: amountInWei,
          gasLimit: ethers.toBigInt(21000),
          maxFeePerGas,
          nonce,
        });
      } else {
        const erc20Abi = [
          'function transfer(address to, uint256 amount) public returns (bool)',
        ];
        const tokenContract = new ethers.Contract(
          tokenAddress,
          erc20Abi,
          walletInstance,
        );
        tx = await tokenContract.transfer(receiverAddress, amountInWei);
      }

      await tx.wait();
      const txHash = tx?.hash || tx;
      return { success: true, data: { txHash: tx.hash } };
    } else if (walletInstance instanceof PrivyEmbeddedWallet) {
      // Case 2: Using PrivyEmbeddedWallet (browser-based signing)
      let tx;
      if (tokenAddress === BNB_ADDRESS) {
        tx = await walletInstance.sendTransaction({
          to: receiverAddress,
          value: amountInWei.toString(), // Privy expects string format
          gasLimit: '21000', // Standard gas limit for BNB transfer
        });
      } else {
        tx = await walletInstance.sendTransaction({
          to: tokenAddress,
          value: '0', // ERC-20 token transfer doesn't send native BNB
          data: new ethers.Interface([
            'function transfer(address to, uint256 amount) public returns (bool)',
          ]).encodeFunctionData('transfer', [
            receiverAddress,
            amountInWei.toString(),
          ]),
          gasLimit: '100000',
        });
      }

      return { success: true, data: { txHash: tx } };
    }

    return { success: false, error: 'INVALID_WALLET_TYPE' };
  });
