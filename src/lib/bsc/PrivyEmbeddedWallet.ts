import {
  type EthereumPersonalSignRpcInputType,
  type EthereumSendTransactionRpcInputType,
  type EthereumSignTransactionRpcInputType,
  PrivyClient,
} from '@privy-io/server-auth';
import { Wallet } from 'ethers';

export class PrivyEmbeddedWallet {
  private privyClient: PrivyClient;
  public address: string;

  constructor(privyClient: PrivyClient, address: string) {
    try {
      this.privyClient = privyClient;
      this.address = address;
    } catch (error) {
      throw new Error(
        `Failed to initialize BSC wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async signTransaction(transaction: any): Promise<string> {
    try {
      const request: EthereumSignTransactionRpcInputType = {
        address: this.address,
        chainType: 'ethereum',
        method: 'eth_signTransaction',
        params: {
          transaction,
        },
      };
      const { data } = await this.privyClient.walletApi.rpc(request);
      return data.signedTransaction;
    } catch (error) {
      throw new Error(
        `Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      const request: EthereumPersonalSignRpcInputType = {
        address: this.address,
        chainType: 'ethereum', // or 'evm' if necessary
        method: 'personal_sign',
        params: {
          message,
        },
      };

      const { data }: any = await this.privyClient.walletApi.rpc(request);
      return data.signedMessage;
    } catch (error) {
      throw new Error(
        `Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async sendTransaction(transaction: any): Promise<string> {
    try {
      const request: EthereumSendTransactionRpcInputType = {
        address: this.address,
        chainType: 'ethereum',
        method: 'eth_sendTransaction',
        caip2: 'eip155:56', // or 'eip155:56' for BSC, based on the network
        params: {
          transaction,
        },
      };
      const { data }: any = await this.privyClient.walletApi.rpc(request);
      return data.transactionHash;
    } catch (error) {
      throw new Error(
        `Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
