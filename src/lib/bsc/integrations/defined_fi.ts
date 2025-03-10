import crypto from 'crypto';

class DefinedClient {
  private readonly endpoint = 'https://graph.codex.io/graphql';
  private tokenCache: { token: string; updatedAt: number } | null = null;

  private async generateToken(): Promise<string> {
    const timestamp =
      Math.floor(Date.now() / 1e3) - (Math.floor(Date.now() / 1e3) % 300);
    const encoder = new TextEncoder();
    const data = encoder.encode(timestamp.toString());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

    const response = await fetch(
      `https://d2gndqco47nwa6.cloudfront.net?challenge=${encodeURIComponent(hashBase64)}`,
      { method: 'GET' },
    );

    if (!response.ok) {
      throw new Error('Failed to get JWT token');
    }

    const token = await response.text();
    if (token.includes('Failed challenge')) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return this.generateToken();
    }

    return token;
  }

  private async getValidToken(): Promise<string> {
    if (this.tokenCache && Date.now() - this.tokenCache.updatedAt <= 240000) {
      return this.tokenCache.token;
    }

    const token = await this.generateToken();
    this.tokenCache = {
      token,
      updatedAt: Date.now(),
    };

    return token;
  }

  private async request<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const token = await this.getValidToken();

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  }

  async filterTokens(
    options: FilterTokensOptions,
  ): Promise<FilterTokensResponse> {
    const query = `
      query FilterTokens($filters: TokenFilters, $statsType: TokenPairStatisticsType, $phrase: String, $tokens: [String], $rankings: [TokenRanking], $limit: Int, $offset: Int) {
        filterTokens(
          filters: $filters
          statsType: $statsType
          phrase: $phrase
          tokens: $tokens
          rankings: $rankings
          limit: $limit
          offset: $offset
        ) {
          results {
            buyCount1
            buyCount12
            buyCount24
            buyCount4
            uniqueBuys1
            uniqueBuys12
            uniqueBuys24
            uniqueBuys4
            change1
            change12
            change24
            change4
            createdAt
            exchanges {
              address
              color
              exchangeVersion
              id
              name
              networkId
              tradeUrl
              iconUrl
              enabled
            }
            fdv
            high1
            high12
            high24
            high4
            holders
            lastTransaction
            liquidity
            low1
            low12
            low24
            low4
            marketCap
            pair {
              address
              exchangeHash
              fee
              id
              networkId
              tickSpacing
              token0
              token1
            }
            priceUSD
            quoteToken
            sellCount1
            sellCount12
            sellCount24
            sellCount4
            uniqueSells1
            uniqueSells12
            uniqueSells24
            uniqueSells4
            token {
              address
              decimals
              id
              name
              networkId
              symbol
              isScam
              socialLinks {
                discord
                telegram
                twitter
                website
              }
              imageThumbUrl
              imageSmallUrl
              imageLargeUrl
            }
            txnCount1
            txnCount12
            txnCount24
            txnCount4
            uniqueTransactions1
            uniqueTransactions12
            uniqueTransactions24
            uniqueTransactions4
            volume1
            volume12
            volume24
            volume4
          }
          count
          page
        }
      }
    `;
    return await this.request<FilterTokensResponse>(
      query,
      options as Record<string, unknown>,
    );
  }
}

export interface FilterTokensOptions {
  filters?: {
    priceUSD?: { lte?: number; gte?: number };
    volume24?: { lte?: number; gte?: number };
    liquidity?: { lte?: number; gte?: number };
    marketCap?: { lte?: number; gte?: number };
    uniqueTransactions24?: { gte?: number };
    createdAt?: { gte?: number };
    exchangeId?: string[];
    network?: number[];
    potentialScam?: boolean;
  };
  statsType?: string;
  offset?: number;
  rankings?: Array<{
    attribute: string;
    direction: string;
  }>;
  limit?: number;
}

export interface FilterTokensResponse {
  data: {
    filterTokens: {
      results: Array<TokenData>;
      count: number;
      page: number;
    };
  };
}

export interface TokenData {
  buyCount1: number;
  buyCount12: number;
  buyCount24: number;
  buyCount4: number;
  uniqueBuys1: number;
  uniqueBuys12: number;
  uniqueBuys24: number;
  uniqueBuys4: number;
  sellCount1: number;
  sellCount12: number;
  sellCount24: number;
  sellCount4: number;
  uniqueSells1: number;
  uniqueSells12: number;
  uniqueSells24: number;
  uniqueSells4: number;
  txnCount1: number;
  txnCount12: number;
  txnCount24: number;
  txnCount4: number;
  uniqueTransactions1: number;
  uniqueTransactions12: number;
  uniqueTransactions24: number;
  uniqueTransactions4: number;

  change1: string;
  change12: string;
  change24: string;
  change4: string;
  high1: string;
  high12: string;
  high24: string;
  high4: string;
  low1: string;
  low12: string;
  low24: string;
  low4: string;
  priceUSD: string;

  createdAt: number;
  fdv: string;
  holders: number;
  lastTransaction: number;
  liquidity: string;
  marketCap: string;
  quoteToken: string;
  volume1: string;
  volume12: string;
  volume24: string;
  volume4: string;

  exchanges: Exchange[];
  pair: TokenPair;
  token: Token;
}

export interface Exchange {
  address: string;
  color: string | null;
  exchangeVersion: string | null;
  id: string;
  name: string;
  networkId: number;
  tradeUrl: string;
  iconUrl: string;
  enabled: boolean | null;
}

export interface TokenPair {
  address: string;
  exchangeHash: string;
  fee: number | null;
  id: string;
  networkId: number;
  tickSpacing: number | null;
  token0: string;
  token1: string;
}

export interface Token {
  address: string;
  decimals: number;
  id: string;
  name: string;
  networkId: number;
  symbol: string;
  isScam: boolean | null;
  socialLinks: {
    discord: string | null;
    telegram: string | null;
    twitter: string | null;
    website: string | null;
  };
  imageThumbUrl: string | null;
  imageSmallUrl: string | null;
  imageLargeUrl: string | null;
}

const client = new DefinedClient();

export async function filterSolanaTokens(
  options: FilterTokensOptions,
): Promise<FilterTokensResponse> {
  return client.filterTokens(options);
}
