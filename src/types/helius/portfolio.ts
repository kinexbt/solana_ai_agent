import { FungibleToken } from './fungibleToken';
import { NonFungibleToken } from './nonFungibleToken';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';

export interface Token {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string;
  balance: number;
  pricePerToken: number;
  decimals: number;
}

export interface NFT {
  name: string;
  symbol: string;
  imageUrl: string;
  collectionName: string;
}

export interface WalletPortfolio {
  address: string;
  totalBalance: number;
  tokens: Token[];
  nfts: NFT[];
}

export function transformToPortfolio(
  address: string,
  fungibleTokens: FungibleToken[],
  nonFungibleTokens: NonFungibleToken[],
): WalletPortfolio {
  const sol = fungibleTokens.find((token) => token.id === SOL_MINT);
  if (sol) {
    sol.content.metadata.name = 'Solana';
  }

  const tokens: Token[] = fungibleTokens
    .filter(
      (token) =>
        token.id === SOL_MINT ||
        token.token_info.balance *
          token.token_info.price_info?.price_per_token >
          1,
    )
    .map((token) => ({
      mint: token.id,
      name: token.content.metadata.name,
      symbol: token.content.metadata.symbol,
      imageUrl:
        token.content.files?.[0]?.uri || token.content.links?.image || '',
      balance:
        token.token_info.balance / Math.pow(10, token.token_info.decimals),
      pricePerToken: token.token_info.price_info?.price_per_token || 0,
      decimals: token.token_info.decimals,
    }))
    .filter(
      (token, index, self) =>
        token.symbol !== 'SOL' ||
        index === self.findIndex((t) => t.symbol === 'SOL'),
    );

  const nfts: NFT[] = nonFungibleTokens.map((nft) => ({
    name: nft.content.metadata.name,
    symbol: nft.content.metadata.symbol,
    imageUrl: nft.content.files?.[0]?.uri || nft.content.links?.image || '',
    collectionName: nft.grouping?.[0]?.collection_metadata?.name || '',
  }));

  const totalBalance = tokens.reduce(
    (acc, token) => acc + token.balance * token.pricePerToken,
    0,
  );

  // Always make sure SOL is the first token
  let tokenList = [...tokens];
  const solToken = tokenList.find((token) => token.symbol === 'SOL');
  if (solToken) {
    tokenList = tokenList.filter((token) => token.symbol !== 'SOL');
    tokenList.unshift(solToken);
  }

  return {
    address,
    totalBalance,
    tokens: tokenList,
    nfts,
  };
}
