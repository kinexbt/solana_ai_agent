import { PublicKey } from '@solana/web3.js';

import { SOL_MINT } from '@/types/helius/portfolio';

import { getAgentKit } from '../actions/ai-solana';

/*
Server Utils
Only server side utility functions should be placed here.
Do not call these functions from the client side.
*/

/**
 * Bypasses verifyUser() and retrieves the agent kit for the given userId.
 * @param userId
 * @returns Agent kit for userId
 */
export const retrieveAgentKitServer = async ({
  userId,
  walletId,
}: {
  userId: string;
  walletId?: string;
}) => {
  return getAgentKit({ userId, walletId });
};

export const transferTokenServer = async ({
  userId,
  walletId,
  receiverAddress,
  tokenAddress,
  amount,
  tokenSymbol,
}: {
  userId: string;
  walletId: string;
  receiverAddress: string;
  tokenAddress: string;
  amount: number;
  tokenSymbol: string;
}) => {
  const agentResponse = await retrieveAgentKitServer({ userId, walletId });

  if (!agentResponse?.success || !agentResponse?.data) {
    return { success: false, error: 'AGENT_NOT_FOUND' };
  }

  const agent = agentResponse.data.agent;

  try {
    const signature = await agent.transfer(
      new PublicKey(receiverAddress),
      amount,
      tokenAddress !== SOL_MINT ? new PublicKey(tokenAddress) : undefined,
    );
    return { success: true, data: { signature } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transfer failed',
    };
  }
};
