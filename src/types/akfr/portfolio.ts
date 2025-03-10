import { FungibleToken } from './fungibleToken';
import { NonFungibleToken } from './nonFungibleToken';

export const BNB_CONTRACT_ADDRESS =
  '0x55d398326f99059ff775485246999027b3197955';

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
  // Rename Wrapped bsc to BNB
  const bsc = fungibleTokens.find((token) => token.id === BNB_CONTRACT_ADDRESS);
  if (bsc) {
    bsc.content.metadata.name = 'BNB';
  }

  const tokens: Token[] = fungibleTokens
    .filter(
      (token) =>
        token.id === BNB_CONTRACT_ADDRESS ||
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
        token.symbol !== 'BNB' ||
        index === self.findIndex((t) => t.symbol === 'BNB'),
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

  // Always make sure BNB is the first token
  let tokenList = [...tokens];
  const bscToken = tokenList.find((token) => token.symbol === 'BNB');
  if (bscToken) {
    tokenList = tokenList.filter((token) => token.symbol !== 'BNB');
    tokenList.unshift(bscToken);
  }

  return {
    address,
    totalBalance,
    tokens: tokenList,
    nfts,
  };
}
