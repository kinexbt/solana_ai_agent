import { z } from 'zod';

// Types for BSC tokens and prices
export interface BSCToken {
  address: string;
  name: string;
  symbol: string;
  logoURI: string | null;
  decimals: number;
}

export interface TokenPrice {
  price: string;
  priceUsd?: string;
  confidence?: number;
  timestamp?: number;
  buyPrice?: string;
  sellPrice?: string;
  volume24h?: string;
  marketCap?: string;
  priceChange24h?: string;
}

// Cache for token list to avoid frequent refetching
let tokenListCache: BSCToken[] | null = null;
let tokenListCacheTimestamp = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Fetches the BSC token list and caches it
 */
async function fetchTokenList(): Promise<BSCToken[]> {
  // Check if we have a valid cache
  const now = Date.now();
  if (tokenListCache && now - tokenListCacheTimestamp < CACHE_DURATION) {
    return tokenListCache;
  }

  try {
    // PancakeSwap token list - this is the most complete list for BSC
    const response = await fetch(
      'https://tokens.pancakeswap.finance/pancakeswap-extended.json',
      { next: { revalidate: 3600 } }, // Revalidate once per hour
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.statusText}`);
    }

    const data = await response.json();

    // Map to our token interface
    const tokens: BSCToken[] = data.tokens.map((token: any) => ({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      logoURI: token.logoURI,
      decimals: token.decimals,
    }));

    // Update cache
    tokenListCache = tokens;
    tokenListCacheTimestamp = now;

    return tokens;
  } catch (error) {
    console.error('Error fetching BSC token list:', error);

    // Return empty array if we can't fetch, or return the stale cache if we have one
    return tokenListCache || [];
  }
}

/**
 * Searches BSC tokens by name, symbol, or address
 */
export async function searchBSCTokens(query: string): Promise<BSCToken[]> {
  try {
    const tokens = await fetchTokenList();
    const searchQuery = query.toLowerCase();

    // Filter tokens based on query
    return tokens
      .filter(
        (token) =>
          token.name.toLowerCase().includes(searchQuery) ||
          token.symbol.toLowerCase().includes(searchQuery) ||
          token.address.toLowerCase() === searchQuery.toLowerCase(),
      )
      .sort((a, b) => {
        // Exact matches first
        const aExact =
          a.symbol.toLowerCase() === searchQuery ||
          a.name.toLowerCase() === searchQuery ||
          a.address.toLowerCase() === searchQuery.toLowerCase();
        const bExact =
          b.symbol.toLowerCase() === searchQuery ||
          b.name.toLowerCase() === searchQuery ||
          b.address.toLowerCase() === searchQuery.toLowerCase();

        // Prioritize by exact match
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Then by symbol match
        const aSymbolMatch = a.symbol.toLowerCase().includes(searchQuery);
        const bSymbolMatch = b.symbol.toLowerCase().includes(searchQuery);
        if (aSymbolMatch && !bSymbolMatch) return -1;
        if (!aSymbolMatch && bSymbolMatch) return 1;

        return 0;
      });
  } catch (error) {
    console.error('Error searching BSC tokens:', error);
    return [];
  }
}

/**
 * Gets price for a BSC token using CoinGecko API or PancakeSwap
 */
export async function getBSCTokenPrice(
  tokenAddress: string,
  showExtraInfo: boolean = true,
): Promise<TokenPrice | null> {
  // Normalize address to lowercase
  const normalizedAddress = tokenAddress.toLowerCase();

  try {
    // First try CoinGecko (more reliable but rate-limited)
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/token_price/binance-smart-chain?contract_addresses=${normalizedAddress}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
        { next: { revalidate: 60 } }, // Revalidate every minute
      );

      if (response.ok) {
        const data = await response.json();
        const tokenData = data[normalizedAddress];

        if (tokenData && tokenData.usd) {
          return {
            price: tokenData.usd.toString(),
            priceUsd: tokenData.usd.toString(),
            timestamp: Date.now(),
            marketCap: tokenData.usd_market_cap?.toString(),
            volume24h: tokenData.usd_24h_vol?.toString(),
            priceChange24h: tokenData.usd_24h_change?.toString(),
            // Only include these if showExtraInfo is true
            ...(showExtraInfo
              ? {
                  confidence: 0.95, // CoinGecko is generally reliable
                  buyPrice: (tokenData.usd * 1.005).toString(), // Estimated buy price (0.5% higher)
                  sellPrice: (tokenData.usd * 0.995).toString(), // Estimated sell price (0.5% lower)
                }
              : {}),
          };
        }
      }
    } catch (coingeckoError) {
      console.warn(
        'CoinGecko API failed, falling back to PancakeSwap',
        coingeckoError,
      );
      // Continue to fallback method
    }

    // Fallback to PancakeSwap API
    // Note: PancakeSwap doesn't have a direct API for this, so in a real implementation
    // you would need to query their router contract directly

    // This is a placeholder implementation
    const response = await fetch(
      `https://api.pancakeswap.info/api/v2/tokens/${normalizedAddress}`,
      { next: { revalidate: 60 } },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch price data: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.data && data.data.price) {
      return {
        price: data.data.price,
        priceUsd: data.data.price,
        timestamp: Date.now(),
        volume24h: data.data.volume || undefined,
        // Only include these if showExtraInfo is true
        ...(showExtraInfo
          ? {
              confidence: 0.8, // PancakeSwap API is less reliable
              buyPrice: (parseFloat(data.data.price) * 1.01).toString(), // Estimated buy price (1% higher)
              sellPrice: (parseFloat(data.data.price) * 0.99).toString(), // Estimated sell price (1% lower)
            }
          : {}),
      };
    }

    throw new Error('Price data not available from either source');
  } catch (error) {
    console.error('Error getting BSC token price:', error);
    return null;
  }
}

/**
 * Gets both token info and price in a single call
 */
export async function getBSCTokenWithPrice(
  tokenAddress: string,
  showExtraInfo: boolean = true,
): Promise<{ token: BSCToken; price: TokenPrice } | null> {
  try {
    // Get token info
    const tokens = await searchBSCTokens(tokenAddress);
    if (!tokens.length) {
      throw new Error('Token not found');
    }

    // Get price data
    const price = await getBSCTokenPrice(tokenAddress, showExtraInfo);
    if (!price) {
      throw new Error('Price data not available');
    }

    return {
      token: tokens[0],
      price,
    };
  } catch (error) {
    console.error('Error getting BSC token with price:', error);
    return null;
  }
}

/**
 * Validates if a string is a valid BSC address
 */
export function isValidBSCAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
