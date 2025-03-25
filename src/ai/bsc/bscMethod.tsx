import Image from 'next/image';

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
import { getHoldersClassification } from '@/lib/bsc/ankr';
import { type Holder, searchWalletAssets } from '@/lib/bsc/ankr';
import { cn } from '@/lib/utils';
import { formatShortNumber, truncate } from '@/lib/utils/format';
import { retrieveAgentKit, transferToken } from '@/server/actions/ai';
// Ensure the correct path to the module
import { BNB_ADDRESS } from '@/types/blockscout/portfolio';
import { transformToPortfolio } from '@/types/bsc/portfolioBsc';
import { addressSchema } from '@/types/util';

// Constants
const DEFAULT_OPTIONS = {
  SLIPPAGE_BPS: 300, // 3% default slippage
} as const;

// Types
interface SwapParams {
  inputToken: string;
  outputToken: string;
  amount: number;
  slippageBps?: number;
  inputSymbol?: string;
  outputSymbol?: string;
}

interface SwapResult {
  success: boolean;
  data?: {
    transactionHash: string;
    inputToken: string;
    outputToken: string;
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
    transactionHash: string;
    receiverAddress: string;
    tokenAddress: string;
    amount: number;
    tokenSymbol?: string;
  };
  error?: string;
}

interface TokenParams {
  address: string;
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

const domainSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9-]+\.bnb$/,
    'Invalid BSC domain format. Must be a valid BNS domain name.',
  )
  .describe(
    'A BSC domain name. (e.g. example.bnb). Needed for resolving a domain to an address.',
  );

const TokenSearchResult = ({
  token,
  className,
}: {
  token: any;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-muted/50 p-4',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
          <Image
            src={token.content?.links?.image || '/placeholder.png'}
            alt={token.content?.metadata?.symbol || 'Token'}
            className="object-cover"
            fill
            sizes="40px"
            onError={(e) => {
              // @ts-expect-error - Type 'string' is not assignable to type 'never'
              e.target.src =
                'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/assets/BNB/logo.png';
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-medium">
              {token.content?.metadata?.name || 'Unknown Token'}
            </h3>
            <span className="shrink-0 rounded-md bg-background/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {token.content?.metadata?.symbol || '???'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="truncate font-mono">
              {token.id.slice(0, 4)}...{token.id.slice(-4)}
            </span>
            {token.token_info?.price_info?.total_price && (
              <>
                <span>•</span>
                <span>
                  Vol: $
                  {(
                    token.token_info.price_info.total_price / 1_000_000_000
                  ).toFixed(2)}
                  BNB
                </span>
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
    transactionHash,
    inputToken,
    outputToken,
    amount,
    slippageBps,
    inputSymbol,
    outputSymbol,
  } = result.data!;

  const truncatedInput = truncate(inputToken, 4);
  const truncatedOutput = truncate(outputToken, 4);
  const truncatedTxHash = truncate(transactionHash, 6);

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
          <span className="text-muted-foreground">Input Token</span>
          <span className="font-medium">{truncatedInput}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-muted-foreground">Output Token</span>
          <span className="font-medium">{truncatedOutput}</span>
        </div>

        <div className="flex flex-col md:col-span-2">
          <span className="text-muted-foreground">Transaction Hash</span>
          <div className="flex items-center gap-1 font-medium">
            <span>{truncatedTxHash}</span>
            <button
              onClick={() => navigator.clipboard.writeText(transactionHash)}
              className="text-muted-foreground hover:text-foreground"
              title="Copy Transaction Hash"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <a
          href={`https://bscscan.com/tx/${transactionHash}`}
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
                const ownedPct = (
                  ((holder.balance / totalSupply) * 100) /
                  1e9
                ).toFixed(4);
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
                                  href={`https://bscscan.com/address/${holder.owner}`}
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
                                <p>View on BscScan</p>
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

  const {
    transactionHash,
    receiverAddress,
    tokenAddress,
    amount,
    tokenSymbol,
  } = result.data!;

  const truncatedReceiver = truncate(receiverAddress, 4);
  const truncatedTxHash = truncate(transactionHash, 6);
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
          <span className="text-muted-foreground">Transaction Hash</span>
          <div className="flex items-center gap-1 font-medium">
            <span>{truncatedTxHash}</span>
            <button
              onClick={() => navigator.clipboard.writeText(transactionHash)}
              className="text-muted-foreground hover:text-foreground"
              title="Copy Transaction Hash"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <a
          href={`https://bscscan.com/tx/${transactionHash}`}
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
    displayName: '🔍 Resolve BSC Domain',
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
    parameters: z.object({ walletAddress: addressSchema }),
    execute: async ({ walletAddress }: { walletAddress: string }) => {
      try {
        const { fungibleTokens, nonFungibleTokens } =
          await searchWalletAssets(walletAddress);
        const portfolio = transformToPortfolio(
          walletAddress,
          fungibleTokens,
          nonFungibleTokens,
        );
        const bnbToken = portfolio.tokens.find(
          (token) => token.symbol === ('BNB' as any),
        );

        console.log('portfolio.tokens: ', portfolio.tokens);
        const otherTokens = portfolio.tokens
          .filter((token) => token.symbol !== 'BNB')
          .filter((token) => token.balance * token.pricePerToken > 0.0001)
          .sort(
            (a, b) => b.balance * b.pricePerToken - a.balance * a.pricePerToken,
          )
          .slice(0, 9); // Take 9 instead of 10 to leave room for BNB

        // Combine BNB with other tokens, ensuring BNB is first
        portfolio.tokens = bnbToken ? [bnbToken, ...otherTokens] : otherTokens;
        console.log('portfolio tokens arranged : ', portfolio.tokens);
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
    displayName: '💸 Send Tokens',
    description: 'Send or transfer tokens to another BSC wallet',
    parameters: z.object({
      walletId: z
        .string()
        .optional()
        .describe('ID of the wallet to use (optional)'),
      receiverAddress: addressSchema.describe('Recipient wallet address'),
      tokenAddress: addressSchema.describe(
        'Token contract address (use BNB_ADDRESS for native BNB)',
      ),
      amount: z.number().min(0.000000001).describe('Amount to send'),
      tokenSymbol: z.string().describe('Symbol of the token to send'),
    }),
    execute: async function ({
      walletId,
      receiverAddress,
      tokenAddress,
      amount,
      tokenSymbol,
    }: {
      walletId?: string;
      receiverAddress: string;
      tokenAddress: string;
      amount: number;
      tokenSymbol: string;
    }) {
      try {
        // Convert the amount to string as required by the transferToken action
        const amountString = amount.toString();

        const result = await transferToken({
          walletId: walletId || '', // Use empty string if not provided
          receiverAddress,
          tokenAddress,
          amount: amountString,
          tokenSymbol,
        });

        if (!result?.data?.success) {
          return {
            success: false,
            error: result?.data?.error || 'Transaction failed',
          };
        }

        return {
          success: true,
          data: {
            transactionHash: result?.data?.data?.txHash,
            receiverAddress,
            tokenAddress,
            amount,
            tokenSymbol,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to transfer tokens',
        };
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
    displayName: '🪙 Swap Tokens',
    description: 'Swap tokens on Binance Smart Chain using PancakeSwap',
    parameters: z.object({
      walletId: z
        .string()
        .optional()
        .describe('ID of the wallet to use (optional)'),
      inputToken: addressSchema.describe('Source token address'),
      outputToken: addressSchema.describe('Target token address'),
      amount: z.number().positive().describe('Amount to swap'),
      slippageBps: z
        .number()
        .min(0)
        .max(10000)
        .optional()
        .describe('Slippage tolerance in basis points (0-10000)'),
      inputSymbol: z.string().describe('Source token symbol'),
      outputSymbol: z.string().describe('Target token symbol'),
    }),
    execute: async function ({
      walletId,
      inputToken,
      outputToken,
      amount,
      slippageBps = DEFAULT_OPTIONS.SLIPPAGE_BPS,
      inputSymbol,
      outputSymbol,
    }: SwapParams & { walletId?: string }): Promise<SwapResult> {
      try {
        // Retrieve agent wallet
        const agentResponse = await retrieveAgentKit({
          walletId: walletId || '',
        });

        if (
          !agentResponse?.data?.success ||
          !agentResponse?.data?.data?.walletInstance
        ) {
          return {
            success: false,
            error: 'Failed to retrieve wallet',
          };
        }

        const walletInstance = agentResponse.data.data.walletInstance;

        // Get the wallet address
        let walletAddress: string;

        if ('address' in walletInstance) {
          walletAddress = walletInstance.address;
        } else {
          return {
            success: false,
            error: 'Unable to get wallet address',
          };
        }

        // PancakeSwap Router address
        const PANCAKESWAP_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

        // For this example, we're using the PancakeSwap router
        // In a real implementation, you'd need to:
        // 1. Approve the token spending if it's not BNB
        // 2. Call the swap function on the router

        // Check if we need to approve first (for non-BNB tokens)
        if (inputToken !== BNB_ADDRESS) {
          // ERC20 interface for approval
          const erc20Interface = new ethers.Interface([
            'function approve(address spender, uint256 amount) public returns (bool)',
          ]);

          // Convert amount to wei (assuming 18 decimals)
          const amountInWei = ethers.parseUnits(amount.toString(), 18);

          // Create approval data
          const approvalData = erc20Interface.encodeFunctionData('approve', [
            PANCAKESWAP_ROUTER,
            amountInWei,
          ]);

          // Send approval transaction
          const approveTx = await walletInstance.sendTransaction({
            to: inputToken,
            data: approvalData,
            value: '0',
          });

          // Wait for approval transaction to be confirmed
          // In a real implementation, you'd wait for confirmation here
        }

        // Router interface for swapping
        const routerInterface = new ethers.Interface([
          'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
          'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
          'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        ]);

        // Convert amount to wei (assuming 18 decimals)
        const amountInWei = ethers.parseUnits(amount.toString(), 18);

        // Calculate minimum output based on slippage
        const slippageMultiplier = 1 - slippageBps / 10000;
        const amountOutMinWei = ethers.parseUnits(
          (amount * slippageMultiplier).toString(),
          18,
        );

        // Set deadline 20 minutes from now
        const deadline = Math.floor(Date.now() / 1000) + 1200;

        // Determine which swap function to use based on input/output tokens
        let swapData: string;
        let value = '0';

        if (inputToken === BNB_ADDRESS && outputToken !== BNB_ADDRESS) {
          // Swapping BNB for token
          swapData = routerInterface.encodeFunctionData(
            'swapExactETHForTokens',
            [
              amountOutMinWei,
              [ethers.ZeroAddress, outputToken], // Use ZeroAddress for BNB
              walletAddress,
              deadline,
            ],
          );
          value = amountInWei.toString();
        } else if (inputToken !== BNB_ADDRESS && outputToken === BNB_ADDRESS) {
          // Swapping token for BNB
          swapData = routerInterface.encodeFunctionData(
            'swapExactTokensForETH',
            [
              amountInWei,
              amountOutMinWei,
              [inputToken, ethers.ZeroAddress], // Use ZeroAddress for BNB
              walletAddress,
              deadline,
            ],
          );
        } else {
          // Swapping token for token
          swapData = routerInterface.encodeFunctionData(
            'swapExactTokensForTokens',
            [
              amountInWei,
              amountOutMinWei,
              [inputToken, outputToken],
              walletAddress,
              deadline,
            ],
          );
        }

        // Send swap transaction
        const tx = await walletInstance.sendTransaction({
          to: PANCAKESWAP_ROUTER,
          data: swapData,
          value,
        });

        // Return success response
        return {
          success: true,
          data: {
            transactionHash: typeof tx === 'string' ? tx : tx.hash,
            inputToken,
            outputToken,
            amount,
            slippageBps,
            inputSymbol,
            outputSymbol,
          },
        };
      } catch (error) {
        console.error('[swapTokens] error:', error);
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
      address: addressSchema.describe('Token contract address'),
    }),
    execute: async ({ address }: TokenParams): Promise<TokenHoldersResult> => {
      try {
        const tokenHolderStats = await getHoldersClassification(address);
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
            error instanceof Error
              ? error.message
              : 'Failed to get token holders',
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
