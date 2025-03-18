'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { ethers } from 'ethers';
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { z } from 'zod';

import { WalletPortfolio } from '@/components/message/wallet-portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BscUtils } from '@/lib/bsc';
import {
  type Holder,
  getHoldersClassification,
  searchWalletAssetsBSC,
} from '@/lib/bsc/ankr';
import {
  BSC_SCAN_API_KEY,
  COIN_GECKO_API_URL,
  WEI_PER_BNB,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatShortNumber, truncate } from '@/lib/utils/format';
import { retrieveAgentKit } from '@/server/actions/ai';
import {
  BNB_CONTRACT_ADDRESS,
  transformToPortfolioBsc,
} from '@/types/ankr/portfolioBsc';
import { publicKeySchema } from '@/types/util';

// Constants
const DEFAULT_OPTIONS = {
  SLIPPAGE_BPS: 300, // 3% default slippage
} as const;

// Types
interface SwapParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  inputSymbol?: string;
  outputSymbol?: string;
}

interface SwapResult {
  success: boolean;
  data?: {
    signature: string;
    inputMint: string;
    outputMint: string;
    amount: number;
    slippageBps: number;
    inputSymbol?: string;
    outputSymbol?: string;
  };
  error?: string;
}

interface TransferResult {
  success: boolean;
  data?: {
    signature: string;
    receiverAddress: string;
    tokenAddress: string;
    amount: number;
    tokenSymbol?: string;
  };
  error?: string;
}

interface TokenParams {
  mint: string;
}

interface TokenHoldersResult {
  success: boolean;
  data?: {
    totalHolders: number;
    topHolders: Holder[];
    totalSupply: number;
  };
  error?: string;
}

const limit = 10;
const domainSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9-]+\.bnb$/,
    'Invalid BNB domain format. Must be a valid BNB domain name.',
  )
  .describe(
    'A BNB domain name (e.g., example.bnb). Needed for resolving a domain to an address.',
  );

const fetchTokenMetadata = async (contractAddress: string) => {
  const url = `https://api.bscscan.com/api?module=token&action=getTokenInfo&contractaddress=${contractAddress}&apikey=${BSC_SCAN_API_KEY}`;
  const response = await axios.get(url);
  return response.data.result;
};

const fetchTokenPrice = async (symbol: string) => {
  try {
    const response = await axios.get(COIN_GECKO_API_URL);
    const price = response.data.binancecoin.usd;
    return price;
  } catch (error) {
    console.error('Error fetching price', error);
    return null;
  }
};

const TokenSearchResult = ({
  tokenAddress,
  className,
}: {
  tokenAddress: string;
  className?: string;
}) => {
  const [tokenData, setTokenData] = useState<any>(null);
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const metadata = await fetchTokenMetadata(tokenAddress);
      const price = await fetchTokenPrice(metadata.symbol);

      setTokenData(metadata);
      setTokenPrice(price);
    };

    fetchData();
  }, [tokenAddress]);

  if (!tokenData) return <div>Loading...</div>;

  return (
    <div
      className={
        className || 'relative overflow-hidden rounded-2xl bg-muted/50 p-4'
      }
    >
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
          <img
            src={tokenData?.image || '/placeholder.png'}
            alt={tokenData?.symbol || 'Token'}
            className="object-cover"
            width="40px"
            height="40px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-medium">
              {tokenData?.name || 'Unknown Token'}
            </h3>
            <span className="shrink-0 rounded-md bg-background/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {tokenData?.symbol || '???'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="truncate font-mono">
              {tokenAddress.slice(0, 4)}...{tokenAddress.slice(-4)}
            </span>
            {tokenPrice && (
              <>
                <span>•</span>
                <span>Price: ${tokenPrice.toFixed(2)} USD</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export function SwapResult({ result }: { result: SwapResult }) {
  if (!result.success) {
    return (
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <h2 className="text-sm font-medium text-destructive">Swap Failed</h2>
        </div>
        <p className="text-xs text-red-300">
          {result.error ?? 'An unknown error occurred.'}
        </p>
      </Card>
    );
  }

  const {
    signature,
    inputMint,
    outputMint,
    amount,
    slippageBps,
    inputSymbol,
    outputSymbol,
  } = result.data!;

  const truncatedInput = truncate(inputMint, 4);
  const truncatedOutput = truncate(outputMint, 4);
  const truncatedSignature = truncate(signature, 6);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <h2 className="text-sm font-medium text-foreground">Swap Successful</h2>
      </div>

      <div className="text-sm font-medium text-foreground">
        Swapped {amount} {inputSymbol?.toUpperCase() ?? truncatedInput} to{' '}
        {outputSymbol?.toUpperCase() ?? truncatedOutput}
        {slippageBps ? ` (slippage ${slippageBps} bps)` : null}
      </div>

      <div className="grid grid-cols-1 gap-1 text-xs sm:text-sm md:grid-cols-2 md:gap-x-6 md:gap-y-2">
        <div className="flex flex-col">
          <span className="text-muted-foreground">Input Mint</span>
          <span className="font-medium">{truncatedInput}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-muted-foreground">Output Mint</span>
          <span className="font-medium">{truncatedOutput}</span>
        </div>

        <div className="flex flex-col md:col-span-2">
          <span className="text-muted-foreground">Signature</span>
          <div className="flex items-center gap-1 font-medium">
            <span>{truncatedSignature}</span>
            <button
              onClick={() => navigator.clipboard.writeText(signature)}
              className="text-muted-foreground hover:text-foreground"
              title="Copy Signature"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <a
          href={`https://bscscan.io/tx/${signature}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-1',
            'text-xs text-muted-foreground ring-1 ring-border hover:bg-muted/10',
          )}
        >
          <ExternalLink className="h-3 w-3" />
          View on BscScan
        </a>
      </div>
    </Card>
  );
}

export function TokenHoldersResult({
  holdersResult,
}: {
  holdersResult?: TokenHoldersResult;
}) {
  if (!holdersResult) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg font-medium">
            Holders Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <ExternalLink className="h-5 w-5" />
            <p className="text-sm font-medium">No holder data available.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (!holdersResult.success) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg font-medium">
            Holders Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <ExternalLink className="h-5 w-5" />
            <p className="text-sm font-medium">
              {holdersResult.error ?? 'Failed to load holder data.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Destructure data with defaults
  const { totalHolders, topHolders, totalSupply } = holdersResult.data ?? {
    totalHolders: 0,
    topHolders: [],
    totalSupply: 1,
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <div className="space-y-2">
          <CardTitle className="text-lg font-medium">
            Holders Information
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {totalHolders < 0 ? '50,000+' : totalHolders.toLocaleString()}{' '}
            unique holders
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-1/2 px-4 ">Owner</TableHead>
              <TableHead className="px-4 ">Holdings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topHolders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  No top holders found.
                </TableCell>
              </TableRow>
            ) : (
              topHolders.map((holder, index) => {
                const ownedPct = ((holder.balance / totalSupply) * 100).toFixed(
                  2,
                );
                const shortBalance = formatShortNumber(holder.balance);

                return (
                  <TableRow
                    key={holder.owner}
                    className="group transition-colors"
                  >
                    <TableCell className="max-w-xs px-4 py-4">
                      <div className="flex flex-col justify-center gap-1">
                        <div className="font-mono">
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={`https://BscScan.io/account/${holder.owner}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded-md hover:text-primary"
                                >
                                  {holder.owner.slice(0, 4)}...
                                  {holder.owner.slice(-4)}
                                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View on Bscscan</p>
                                <p className="text-xs text-muted-foreground">
                                  {holder.owner}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {holder.classification && (
                          <div className="line-clamp-1 max-w-[200px] text-xs text-muted-foreground">
                            {holder.classification}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex flex-col justify-center gap-1">
                        <div className="font-medium">{ownedPct}%</div>
                        <div className="text-xs text-muted-foreground">
                          {shortBalance} tokens
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function TransferResult({ result }: { result: TransferResult }) {
  if (!result.success) {
    return (
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <h2 className="text-sm font-medium text-destructive">
            Transaction Failed
          </h2>
        </div>
        <p className="text-xs text-red-300">
          {result.error ?? 'An unknown error occurred.'}
        </p>
      </Card>
    );
  }

  const { signature, receiverAddress, tokenAddress, amount, tokenSymbol } =
    result.data!;

  const truncatedReceiver = truncate(receiverAddress, 4);
  const truncatedSignature = truncate(signature, 6);
  const truncatedTokenAddress = truncate(tokenAddress, 4);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <h2 className="text-sm font-medium text-foreground">
          Transfer Successful
        </h2>
      </div>

      <div className="text-sm font-medium text-foreground">
        Sent {amount} {tokenSymbol?.toUpperCase() ?? truncatedTokenAddress} to{' '}
        {truncatedReceiver}
      </div>

      <div className="grid grid-cols-1 gap-1 text-xs sm:text-sm md:grid-cols-2 md:gap-x-6 md:gap-y-2">
        <div className="flex flex-col">
          <span className="text-muted-foreground">Token Address</span>
          <span className="font-medium">{truncatedTokenAddress}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-muted-foreground">Signature</span>
          <div className="flex items-center gap-1 font-medium">
            <span>{truncatedSignature}</span>
            <button
              onClick={() => navigator.clipboard.writeText(signature)}
              className="text-muted-foreground hover:text-foreground"
              title="Copy Signature"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <a
          href={`https://bscscan.io/tx/${signature}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-1',
            'text-xs text-muted-foreground ring-1 ring-border hover:bg-muted/10',
          )}
        >
          <ExternalLink className="h-3 w-3" />
          View on BscScan
        </a>
      </div>
    </Card>
  );
}

const wallet = {
  resolveWalletAddressFromDomain: {
    displayName: '🔍 Resolve Bsc Domain',
    description:
      'Resolve a BSC domain name to an address. Useful for getting the address of a wallet from a domain name.',
    isCollapsible: true,
    parameters: z.object({ domain: domainSchema }),
    execute: async ({ domain }: { domain: string }) => {
      return await BscUtils.resolveDomainToAddress(domain);
    },
  },
  getWalletPortfolio: {
    displayName: '🏦 Wallet Portfolio',
    description:
      'Get the portfolio of a BSC wallet, including detailed token information & total value, BNB value etc.',
    parameters: z.object({ walletAddress: publicKeySchema }),
    execute: async ({ walletAddress }: { walletAddress: string }) => {
      try {
        const { fungibleTokens } = await searchWalletAssetsBSC(walletAddress);
        const portfolio = transformToPortfolioBsc(
          walletAddress,
          fungibleTokens,
          [],
        );

        // First, separate BNB from other tokens
        const bscToken = portfolio.tokens.find(
          (token) => token.symbol === 'BNB',
        );
        const otherTokens = portfolio.tokens
          .filter((token) => token.symbol !== 'BNB')
          .filter((token) => token.balance * token.pricePerToken > 0.01)
          .sort(
            (a, b) => b.balance * b.pricePerToken - a.balance * a.pricePerToken,
          )
          .slice(0, 9); // Take 9 instead of 10 to leave room for BNB

        // Combine BNB with other tokens, ensuring BNB is first
        portfolio.tokens = bscToken ? [bscToken, ...otherTokens] : otherTokens;

        return {
          suppressFollowUp: true,
          data: portfolio,
        };
      } catch (error) {
        throw new Error(
          `Failed to get wallet portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = (raw as { data: any }).data;
      if (!result || typeof result !== 'object') return null;
      return <WalletPortfolio data={result} />;
    },
  },
  sendTokens: {
    agentKit: null,
    displayName: '💸 Send Tokens',
    description: 'Send or transfer tokens to another BSC wallet',
    parameters: z.object({
      receiverAddress: publicKeySchema,
      tokenAddress: publicKeySchema,
      amount: z.number().min(0.000000001),
      tokenSymbol: z.string().describe('Symbol of the token to send'),
    }),
    execute: async function ({
      receiverAddress,
      tokenAddress,
      amount,
      tokenSymbol,
    }: {
      receiverAddress: string;
      tokenAddress: string;
      amount: number;
      tokenSymbol?: string;
    }) {
      try {
        const agent =
          this.agentKit ||
          (await retrieveAgentKit(undefined))?.data?.data?.agent;

        if (!agent) {
          throw new Error('Failed to retrieve agent');
        }

        const signature = await agent.transfer(
          new PublicKey(receiverAddress),
          amount,
          tokenAddress !== BNB_CONTRACT_ADDRESS
            ? new PublicKey(tokenAddress)
            : undefined,
        );

        return {
          success: true,
          data: {
            signature,
            receiverAddress,
            tokenAddress,
            amount,
            tokenSymbol,
          },
        };
      } catch (error) {
        throw new Error(
          `Failed to transfer tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = raw as TransferResult;
      return <TransferResult result={result} />;
    },
  },
};

const swap = {
  swapTokens: {
    agentKit: null,
    displayName: '🪙 Swap Tokens',
    description:
      'Swap tokens using Jupiter Exchange with the embedded wallet. (requires confirmation)',
    parameters: z.object({
      requiresConfirmation: z.boolean().optional().default(true),
      inputMint: publicKeySchema.describe('Source token mint address'),
      outputMint: publicKeySchema.describe('Target token mint address'),
      amount: z.number().positive().describe('Amount to swap'),
      slippageBps: z
        .number()
        .min(0)
        .max(10000)
        .optional()
        .describe('Slippage tolerance in basis points (0-10000)'),
      inputSymbol: z.string().describe('Source token symbol').default(''),
      outputSymbol: z.string().describe('Target token symbol').default(''),
    }),
    execute: async function ({
      inputMint,
      outputMint,
      amount,
      slippageBps = DEFAULT_OPTIONS.SLIPPAGE_BPS,
      inputSymbol,
      outputSymbol,
    }: SwapParams): Promise<SwapResult> {
      try {
        const agent =
          this.agentKit ||
          (await retrieveAgentKit(undefined))?.data?.data?.agent;

        if (!agent) {
          throw new Error('Failed to retrieve agent');
        }

        console.log('[swapTokens] inputMint', inputMint);
        console.log('[swapTokens] outputMint', outputMint);
        console.log('[swapTokens] amount', amount);
        console.log('[swapTokens] slippageBps', slippageBps);

        const signature = await agent.trade(
          new PublicKey(outputMint),
          amount,
          new PublicKey(inputMint),
          slippageBps,
        );

        return {
          success: true,
          data: {
            signature,
            inputMint,
            outputMint,
            amount,
            slippageBps,
            inputSymbol,
            outputSymbol,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to execute swap',
        };
      }
    },
    render: (raw: unknown) => {
      const result = raw as SwapResult;
      return <SwapResult result={result} />;
    },
  },
};

const token = {
  holders: {
    displayName: '💼 Token Holder Stats',
    description: 'Get the token holder stats for a BSC token',
    parameters: z.object({
      mint: publicKeySchema.describe('Token mint address'),
    }),
    execute: async ({ mint }: TokenParams): Promise<TokenHoldersResult> => {
      try {
        const tokenHolderStats = await getHoldersClassification(
          mint,
          limit,
          BSC_SCAN_API_KEY as string,
        );
        console.log('[token.holders] tokenHolderStats', tokenHolderStats);
        return {
          success: true,
          data: {
            totalHolders: tokenHolderStats.totalHolders,
            topHolders: tokenHolderStats.topHolders,
            totalSupply: tokenHolderStats.totalSupply,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to execute swap',
        };
      }
    },
    render: (raw: unknown) => {
      const result = raw as TokenHoldersResult;
      return <TokenHoldersResult holdersResult={result} />;
    },
  },
};

export const bscTools = {
  ...wallet,
  ...swap,
  ...token,
};
