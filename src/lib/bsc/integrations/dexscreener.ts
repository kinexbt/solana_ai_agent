const DEXSCREENER_API_URL = 'https://api.dexscreener.com';
const BSC_CHAIN_ID = 'bsc';

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
}

interface TransactionData {
  buys: number;
  sells: number;
}

interface Transactions {
  m5: TransactionData;
  h1: TransactionData;
  h6: TransactionData;
  h24: TransactionData;
}

interface VolumeData {
  h24: number;
  h6: number;
  h1: number;
  m5: number;
}

interface PriceChangeData {
  m5: number;
  h1: number;
  h6: number;
  h24: number;
}

interface LiquidityData {
  usd: number;
  base: number;
  quote: number;
}

interface Social {
  type: string;
  url: string;
}

interface Website {
  label: string;
  url: string;
}

interface PairInfo {
  imageUrl?: string;
  header?: string;
  openGraph?: string;
  websites?: Website[];
  socials?: Social[];
}

interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  priceNative: string;
  priceUsd: string;
  txns: Transactions;
  volume: VolumeData;
  priceChange: PriceChangeData;
  liquidity: LiquidityData;
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  info?: PairInfo;
}

export interface DexScreenerError {
  code: string;
  message: string;
}

/**
 * Search for trading pairs on DEX platforms
 * @param query - Search query (token symbol, name, or address)
 * @param limit - Maximum number of results to return
 * @returns Promise with array of trading pairs or empty array if none found
 */
export async function searchPairs(
  query: string,
  limit: number = 10,
): Promise<DexPair[]> {
  try {
    const response = await fetch(
      `${DEXSCREENER_API_URL}/latest/dex/search?q=${query}&limit=${limit}`,
      { next: { revalidate: 30 } },
    );

    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.statusText}`);
    }

    const data = await response.json();
    const pairs = data.pairs as DexPair[];

    if (!Array.isArray(pairs)) {
      return [];
    }

    return pairs
      .filter((p) => p.chainId === BSC_CHAIN_ID)
      .sort((a, b) => b.volume.h24 - a.volume.h24);
  } catch (error) {
    console.error('DexScreener search error:', error);
    return [];
  }
}
