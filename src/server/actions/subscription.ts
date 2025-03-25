'use server';

import { revalidatePath } from 'next/cache';

import { BillingCycle, PaymentStatus } from '@prisma/client';
import moment from 'moment';

import prisma from '@/lib/prisma';
import { ActionResponse, actionClient } from '@/lib/safe-action';
import { searchWalletAssets } from '@/lib/solana/helius';
import { canAffordSubscription, getSubPriceFloat } from '@/lib/utils';
import { SOL_MINT } from '@/types/helius/portfolio';

import { transferToken } from './ai-solana';
import { verifyUser } from './user';

const checkUserAuth = async () => {
  const authResult = await verifyUser();
  const userId = authResult?.data?.data?.id;
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  // If user is EAP, return error since they can't update subscription
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallets: true, subscription: true },
  });
  if (user?.earlyAccess) {
    return {
      success: false,
      error: 'User is already in Early Access Program',
    };
  }

  return { success: true, user };
};

export const subscribeUser = actionClient.action(
  async (): Promise<ActionResponse<{ success: boolean }>> => {
    try {
      const authResult = await checkUserAuth();
      if (authResult.success === false || !authResult.user) return authResult;

      const user = authResult.user;

      // Check that the user has Privy wallet
      const activeWallet = user.wallets.find((w) => w.active);
      if (!activeWallet) {
        return { success: false, error: 'User does not have an active wallet' };
      }

      // Check that there is not already an active subscription for this timeframe
      if (user.subscription?.active) {
        return {
          success: false,
          error: 'User already has an active subscription',
        };
      }

      // Check the balance of the Privy wallet
      const portfolio = await searchWalletAssets(activeWallet.publicKey);
      const hasEnoughBalance = canAffordSubscription(portfolio);
      if (!hasEnoughBalance) {
        return { success: false, error: 'Insufficient balance' };
      }

      const now = moment();

      // Create the subscription record in the database if it doesn't exist
      const newSubscription =
        user.subscription ||
        (await prisma.subscription.create({
          data: {
            userId: user.id,
            active: false,
            startDate: now.toDate(),
            billingCycle: BillingCycle.MONTHLY,
            nextPaymentDate: now.clone().add(1, 'month').toDate(),
          },
        }));

      // Initiate the transfer of funds
      const response = await transferToken({
        walletId: activeWallet.id,
        receiverAddress: process.env.NEXT_PUBLIC_EAP_RECEIVE_WALLET_ADDRESS!,
        tokenAddress: SOL_MINT,
        amount: getSubPriceFloat(),
        tokenSymbol: 'SOL',
      });

      // If successful, update the subscription record and subscription payment record
      if (response?.data?.success) {
        console.log(
          `[subscribeUser] Subscription payment successful for user ${user.id}`,
        );

        await prisma.subscription.update({
          where: { id: newSubscription.id },
          data: { active: true },
        });

        // Create a subscription payment record
        await prisma.subscriptionPayment.create({
          data: {
            subscriptionId: newSubscription.id,
            amount: getSubPriceFloat(),
            paymentDate: now.toDate(),
            status: PaymentStatus.SUCCESS,
            transactionHash: response.data?.data?.signature,
          },
        });
      } else if (!response?.data?.success || !response?.data?.data) {
        console.error(
          `[subscribeUser] Subscription payment failed for user ${user.id}:`,
          response?.data?.error,
        );

        return { success: false, error: 'An error occurred during payment' };
      }

      revalidatePath('/account');
      return { success: true };
    } catch (error) {
      console.dir(error, { depth: null });
      return { success: false, error: 'Failed to process subscription' };
    }
  },
);

export const unsubscribeUser = actionClient.action(
  async (): Promise<ActionResponse<{ success: boolean }>> => {
    try {
      const authResult = await checkUserAuth();
      if (authResult.success === false || !authResult.user) return authResult;

      const user = authResult.user;

      // Check that user has an active subscription
      if (!user.subscription?.active) {
        return {
          success: false,
          error: 'User does not have an active subscription',
        };
      }

      // Cancel the subscription
      await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: {
          endDate: user.subscription.nextPaymentDate,
        },
      });

      revalidatePath('/account');
      return { success: true };
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return { success: false, error: 'Failed to cancel subscription' };
    }
  },
);

export const reactivateUser = actionClient.action(
  async (): Promise<ActionResponse<{ success: boolean }>> => {
    try {
      const authResult = await checkUserAuth();
      if (authResult.success === false || !authResult.user) return authResult;

      const user = authResult.user;

      // Check that user has an active subscription
      if (!user.subscription?.active) {
        return {
          success: false,
          error: 'User does not have an active subscription',
        };
      }

      // Check that the subscription had an end date set (was cancelled previously)
      if (!user.subscription.endDate) {
        return { success: false, error: 'Subscription is not cancelled' };
      }

      // Reactivate the subscription
      await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: {
          active: true,
          endDate: null,
        },
      });

      revalidatePath('/account');
      return { success: true };
    } catch (error) {
      console.error('Reactivate failed:', error);
      return { success: false, error: 'Failed to reactivate subscription' };
    }
  },
);
