import { ethers } from 'ethers';
// Correct import
import { JsonRpcProvider, TransactionRequest } from 'ethers';

import { rpcUrl } from '../constants';

// Import utils separately

export interface TransferWithMemoParams {
  /** Target address */
  to: string;
  /** Transfer amount (in BNB) */
  amount: number;
  /** Attached message */
  memo: string;
}

export class BscUtils {
  private static provider: JsonRpcProvider;

  constructor() {
    BscUtils.provider = new JsonRpcProvider(rpcUrl);
  }

  /**
   * Get wallet BNB balance
   * @param address Wallet address
   */
  static async getBalance(address: string): Promise<number> {
    try {
      const balance = await this.provider.getBalance(address);
      return parseFloat(ethers.formatEther(balance)); // Convert from Wei to BNB
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return 0;
    }
  }

  /**
   * Resolve .bsc domain name to address
   * @param domain Domain name
   */
  static async resolveDomainToAddress(domain: string): Promise<string | null> {
    // Placeholder for BNS (Binance Name Service) resolution logic
    // You can integrate with a BNS resolver if needed
    return domain; // For now, return domain directly
  }

  static async getProvider(): Promise<JsonRpcProvider | null> {
    return this.provider;
  }

  /**
   * Send BNB transfer transaction with memo
   */
  static async sendTransferWithMemo(
    params: TransferWithMemoParams,
    privateKey: string,
  ): Promise<string | null> {
    const { to, amount, memo } = params;

    const wallet = new ethers.Wallet(privateKey, this.provider);

    // Check balance first
    const balance = await this.getBalance(wallet.address);
    const requiredAmount = amount;
    if (balance < requiredAmount) {
      throw new Error(
        `Insufficient balance. You have ${balance} BNB but need ${amount} BNB`,
      );
    }

    try {
      // Create transaction object
      const transaction: TransactionRequest = {
        to,
        value: ethers.parseEther(amount.toString()), // Convert from BNB to Wei
        data: ethers.hexlify(ethers.toUtf8Bytes(memo)), // Attach memo as data (it will be stored in the transaction)
      };

      // Send transaction
      const txResponse = await wallet.sendTransaction(transaction);

      // Get transaction hash before waiting for the transaction to be mined
      const transactionHash = txResponse.hash;

      // Wait for transaction to be mined
      const receipt = await txResponse.wait();

      // Log for debugging
      console.log('Transaction sent successfully:', transactionHash);

      // Return transaction hash (signature)
      return transactionHash;
    } catch (error) {
      console.error('Transaction error:', error);
      if (error instanceof Error) {
        // Handle specific known errors
        if (error.message.includes('insufficient funds')) {
          throw new Error(
            `Insufficient balance. Please make sure you have enough BNB to cover the transaction.`,
          );
        }
        if (error.message.includes('transaction failed')) {
          throw new Error(`Transaction failed. Please try again.`);
        }
      }
      throw error;
    }
  }
}
