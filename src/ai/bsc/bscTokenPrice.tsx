import Image from 'next/image';

import { z } from 'zod';

import { BSC_SCAN_API_KEY, BSC_SCAN_API_URL } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { Placeholder } from '@/lib/placeholder';
import {
  type BSCToken,
  type TokenPrice,
  getBSCTokenPrice,
  getBSCTokenWithPrice,
  isValidBSCAddress,
  searchBSCTokens,
} from '@/server/actions/bsc';

// Token Card Component
function BSCTokenCard({ token }: { token: BSCToken }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
          <Image
            src={
              token.logoURI ||
              Placeholder.generate({ width: 40, height: 40, text: 'Token' })
            }
            alt={token.name}
            className="object-cover"
            fill
            sizes="40px"
            onError={(e) => {
              (e.target as HTMLImageElement).src = Placeholder.generate({
                width: 40,
                height: 40,
                text: token.symbol,
              });
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-medium">{token.name}</h3>
            <span className="shrink-0 rounded-md bg-background/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {token.symbol}
            </span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">
              {token.address.slice(0, 6)}...{token.address.slice(-4)}
            </span>
            <span className="ml-2 text-xs text-muted-foreground/70">
              {token.decimals} decimals
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Price Card Component
function BSCPriceCard({
  token,
  price,
}: {
  token: BSCToken;
  price: TokenPrice;
}) {
  const priceValue = parseFloat(price.price);
  const formattedPrice =
    priceValue < 1
      ? priceValue.toFixed(Math.min(6, 9 - Math.floor(Math.log10(priceValue))))
      : priceValue.toFixed(2);

  const priceChange = price.priceChange24h
    ? parseFloat(price.priceChange24h)
    : null;
  const volume = price.volume24h ? parseFloat(price.volume24h) : null;
  const marketCap = price.marketCap ? parseFloat(price.marketCap) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
          <Image
            src={
              token.logoURI ||
              Placeholder.generate({
                width: 40,
                height: 40,
                text: token.symbol,
              })
            }
            alt={token.name}
            className="object-cover"
            fill
            sizes="40px"
            onError={(e) => {
              (e.target as HTMLImageElement).src = Placeholder.generate({
                width: 40,
                height: 40,
                text: token.symbol,
              });
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-medium">{token.name}</h3>
            <span className="shrink-0 rounded-md bg-background/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {token.symbol}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-semibold">${formattedPrice}</span>
            {priceChange !== null && (
              <span
                className={`text-sm ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {priceChange >= 0 ? '▲' : '▼'}{' '}
                {Math.abs(priceChange).toFixed(2)}%
              </span>
            )}
          </div>

          {(volume !== null || marketCap !== null) && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {volume !== null && (
                <div>
                  <span className="block text-muted-foreground/70">
                    Volume 24h
                  </span>
                  <span className="font-medium">${formatNumber(volume)}</span>
                </div>
              )}
              {marketCap !== null && (
                <div>
                  <span className="block text-muted-foreground/70">
                    Market Cap
                  </span>
                  <span className="font-medium">
                    ${formatNumber(marketCap)}
                  </span>
                </div>
              )}
            </div>
          )}

          {price.buyPrice && price.sellPrice && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="block text-muted-foreground/70">
                  Buy Price
                </span>
                <span className="font-medium">
                  ${parseFloat(price.buyPrice).toFixed(6)}
                </span>
              </div>
              <div>
                <span className="block text-muted-foreground/70">
                  Sell Price
                </span>
                <span className="font-medium">
                  ${parseFloat(price.sellPrice).toFixed(6)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Export the BSC tools
export const bscTokenInfoTools = {
  searchBSCToken: {
    displayName: '🔍 Search BSC Token',
    isCollapsible: true,
    description:
      'Search for any BSC token by name, symbol, or address to get its contract address, along with detailed information. Useful for getting token addresses for further operations.',
    parameters: z.object({
      query: z
        .string()
        .describe('Token name, symbol, or address to search for'),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        const tokens = await searchBSCTokens(query);

        if (!tokens.length) {
          return {
            success: false,
            error: 'No tokens found matching your query',
          };
        }

        // Return top 1 result to match your Jupiter implementation
        const results = tokens.slice(0, 1);

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to search BSC tokens',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: BSCToken[];
        error?: string;
      };

      if (!typedResult.success) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-destructive/5 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-destructive">
                Error: {typedResult.error}
              </p>
            </div>
          </div>
        );
      }

      if (!typedResult.data?.length) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">No tokens found</p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {typedResult.data.map((token) => (
            <BSCTokenCard key={token.address} token={token} />
          ))}
        </div>
      );
    },
    requiredEnvBars: [BSC_SCAN_API_KEY, BSC_SCAN_API_URL],
  },

  getBSCTokenPrice: {
    displayName: '💰 Get BSC Token Price',
    isCollapsible: true,
    description:
      'Get the current price of any BSC token in USD, including detailed information like buy/sell prices, volume, and market cap.',
    parameters: z.object({
      tokenAddress: z.string().describe("The token's contract address"),
      showExtraInfo: z
        .boolean()
        .default(true)
        .describe(
          'Whether to show additional price information like buy/sell prices and volume',
        ),
    }),
    execute: async ({
      tokenAddress,
      showExtraInfo,
    }: {
      tokenAddress: string;
      showExtraInfo: boolean;
    }) => {
      try {
        // Validate the address format first
        if (!isValidBSCAddress(tokenAddress)) {
          return {
            success: false,
            error: 'Invalid BSC address format',
          };
        }

        // Get both token info and price in one call
        const result = await getBSCTokenWithPrice(tokenAddress, showExtraInfo);

        if (!result) {
          return {
            success: false,
            error: 'Failed to get token price data',
          };
        }

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get BSC token price',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: {
          token: BSCToken;
          price: TokenPrice;
        };
        error?: string;
      };

      if (!typedResult.success) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-destructive/5 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-destructive">
                Error: {typedResult.error}
              </p>
            </div>
          </div>
        );
      }

      if (!typedResult.data) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                No price data available
              </p>
            </div>
          </div>
        );
      }

      return (
        <BSCPriceCard
          token={typedResult.data.token}
          price={typedResult.data.price}
        />
      );
    },
    requiredEnvVars: [], // No specific env vars required for basic functionality
  },
};
