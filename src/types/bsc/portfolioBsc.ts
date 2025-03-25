import { Decimal } from '@prisma/client/runtime/library';

import { FungibleToken } from './fungibleToken';
import { NonFungibleToken } from './nonFungibleToken';

// Define the ERC20Token and ERC721Token interfaces based on BSC-specific needs
export interface ERC20Token {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  decimals: number;
  imageUrl?: string;
  image?: string;
  priceInfo?: {
    price_per_token: number;
  };
}

export interface ERC721Token {
  name: string;
  symbol?: string; // Make symbol optional since it might be undefined
  imageUrl?: string;
  image?: string;
  collectionName?: string;
  collection?: {
    name: string;
  };
}

export const BNB_CONTRACT_ADDRESS =
  '0x55d398326f99059ff775485246999027b3197955';
export const BNB_ADDRESS = '0x0000000000000000000000000000000000000000';

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
  symbol: string; // Required in interface
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
  console.log(bsc);
  const tokens: Token[] = fungibleTokens
    .filter(
      (token) =>
        token.id === BNB_CONTRACT_ADDRESS ||
        token.token_info.balance *
          (token.token_info.price_info?.price_per_token || 0) >
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
    symbol: nft.content.metadata.symbol || '', // Provide default empty string if symbol is undefined
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

export function transformToPortfolioBsc(
  address: string,
  ERC20Tokens: ERC20Token[],
  ERC721Tokens: ERC721Token[],
): WalletPortfolio {
  // Rename Wrapped BSC token to BNB
  const bsc = ERC20Tokens.find((token) => token.id === BNB_CONTRACT_ADDRESS);
  if (bsc) {
    bsc.name = 'BNB'; // Renaming Wrapped BSC token to 'BNB'
    bsc.symbol = 'BNB'; // Ensure symbol is also updated
  }

  const tokens: Token[] = ERC20Tokens.filter(
    (token) =>
      token.id === BNB_CONTRACT_ADDRESS ||
      token.balance * (token.priceInfo?.price_per_token || 0) > 1,
  )
    .map((token) => ({
      mint: token.id,
      name: token.name,
      symbol: token.symbol,
      imageUrl: token.imageUrl || token.image || '', // Handle multiple possible image properties
      balance: token.balance / Math.pow(10, token.decimals),
      pricePerToken: token.priceInfo?.price_per_token || 0,
      decimals: token.decimals,
    }))
    .filter(
      (token, index, self) =>
        token.symbol !== 'BNB' ||
        index === self.findIndex((t) => t.symbol === 'BNB'),
    );

  // Process ERC721 NFTs
  const nfts: NFT[] = ERC721Tokens.map((nft) => ({
    name: nft.name,
    symbol: nft.symbol || '', // Provide default empty string if symbol is undefined
    imageUrl: nft.imageUrl || nft.image || '',
    collectionName: nft.collectionName || nft.collection?.name || '',
  }));

  // Calculate total balance of the portfolio
  const totalBalance = tokens.reduce(
    (acc, token) => acc + token.balance * token.pricePerToken,
    0,
  );

  // Ensure BNB is always the first token in the list
  let tokenList = [...tokens];
  const bnbToken = tokenList.find((token) => token.symbol === 'BNB');
  if (bnbToken) {
    tokenList = tokenList.filter((token) => token.symbol !== 'BNB');
    tokenList.unshift(bnbToken); // Move BNB to the top
  }

  return {
    address,
    totalBalance,
    tokens: tokenList,
    nfts,
  };
}
