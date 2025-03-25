export const BNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

// Types
export interface TokenInfo {
  address: string;
  balance: number;
  decimals: number;
  name: string;
  pricePerToken: number; // In USD
  symbol: string;
  totalSupply?: number;
  holderCount?: number;
  type?: string;
}

export interface WalletPortfolio {
  address: string;
  totalValueUSD: number;
  tokens: TokenInfo[];
}

interface WalletAssetToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  price: number;
  totalSupply: number;
  holderCount: number;
  type: string;
}

interface NFTAsset {
  // NFT-specific properties
  id: string;
  name: string;
  collectionName: string;
  imageUrl: string;
}

/**
 * Transforms wallet assets into a portfolio format
 */
export function transformToPortfolio(
  walletAddress: string,
  tokens: WalletAssetToken[],
  nfts: NFTAsset[],
): WalletPortfolio {
  // Transform tokens into TokenInfo format
  const tokenInfos: TokenInfo[] = tokens.map((token) => ({
    address: token.address,
    balance: token.balance,
    decimals: token.decimals,
    name: token.name,
    pricePerToken: token.price,
    symbol: token.symbol,
    totalSupply: token.totalSupply,
    holderCount: token.holderCount,
    type: token.type,
  }));

  // Calculate total portfolio value in USD
  const totalValueUSD = tokenInfos.reduce(
    (total, token) => total + token.balance * token.pricePerToken,
    0,
  );

  return {
    address: walletAddress,
    totalValueUSD,
    tokens: tokenInfos,
  };
}
