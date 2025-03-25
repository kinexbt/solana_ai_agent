import axios from 'axios';

import { fetchJson } from '@/lib/utils/fetchJson';
import { FungibleToken } from '@/types/bsc/fungibleToken';
import { NonFungibleToken } from '@/types/bsc/nonFungibleToken';

// Utility function for fetch requests

const BSC_SCAN_API_KEY = 'Q3D89IXCN77BWHPNEP5SWGUEA8D5IM91Z8';
const ALCHEMY_API_KEY = 'oFfvEpXYjGo8Nj4QQIkU3kXd6Z0JvfJZ';

export const getBnbBalance = async (walletAddress: string): Promise<number> => {
  const url = `https://api.bscscan.com/api?module=account&action=balance&address=${walletAddress}&apikey=${BSC_SCAN_API_KEY}`;
  const response = (await fetchJson(url)) as { result: string };
  return Number(response.result) / 1e18; // Convert from Wei to BNB
};

interface FileInfo {
  uri: string;
  mime: string;
  cdn_uri: string; // This is the missing required property
}

// Now the fixed function
export const getBep20Tokens = async (
  walletAddress: string,
): Promise<FungibleToken[]> => {
  // Use tokenlist instead of tokenbalance to get all tokens
  const url = `https://api.bscscan.com/api?module=account&action=tokentx&address=${walletAddress}&sort=asc&apikey=${BSC_SCAN_API_KEY}`;

  try {
    const response = await fetchJson(url);

    if (!response || !response.result || !Array.isArray(response.result)) {
      console.error('Invalid response format from BscScan:', response);
      return []; // Return empty array instead of throwing
    }

    // Process transactions to get unique tokens
    const uniqueTokens = new Map();

    response.result.forEach((tx: any) => {
      const tokenAddress = tx.contractAddress;
      if (!uniqueTokens.has(tokenAddress)) {
        uniqueTokens.set(tokenAddress, {
          contractAddress: tokenAddress,
          name: tx.tokenName,
          symbol: tx.tokenSymbol,
          decimals: parseInt(tx.tokenDecimal),
          balance: '0', // Will need to get balance separately
          totalSupply: '0',
        });
      }
    });

    // For each token, get the balance
    const tokens = Array.from(uniqueTokens.values());
    const tokenPromises = tokens.map(async (token) => {
      const balanceUrl = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${token.contractAddress}&address=${walletAddress}&tag=latest&apikey=${BSC_SCAN_API_KEY}`;
      try {
        const balanceResponse = await fetchJson(balanceUrl);
        if (balanceResponse && balanceResponse.result) {
          token.balance = balanceResponse.result;
        }
      } catch (error) {
        console.error(
          `Error fetching balance for token ${token.symbol}:`,
          error,
        );
      }
      return token;
    });

    const tokensWithBalance = await Promise.all(tokenPromises);

    // Filter out tokens with zero balance
    const activeTokens = tokensWithBalance.filter(
      (token) => token.balance && token.balance !== '0',
    );

    return activeTokens.map((token) => ({
      interface: 'FungibleToken' as const,
      id: token.contractAddress,
      content: {
        $schema: 'https://schema.example.com/token1.0.json',
        files: [
          {
            uri: `https://assets.trustwalletapp.com/blockchains/smartchain/assets/${token.contractAddress}/logo.png`,
            mime: 'image/png',
            cdn_uri: `https://assets.trustwalletapp.com/blockchains/smartchain/assets/${token.contractAddress}/logo.png`,
          },
        ],
        metadata: {
          description: token.name,
          name: token.name,
          symbol: token.symbol,
          token_standard: 'BEP20',
        },
        links: {
          image: `https://assets.trustwalletapp.com/blockchains/smartchain/assets/${token.contractAddress}/logo.png`,
        },
      },
      token_info: {
        symbol: token.symbol,
        balance: Number(token.balance) / 10 ** token.decimals,
        supply: Number(token.totalSupply),
        decimals: token.decimals,
        token_program: token.contractAddress,
        associated_token_address: walletAddress,
        price_info: {
          price_per_token: 0, // Would need to fetch price from a separate API
          total_price: 0,
          currency: 'USD',
        },
      },
      contract_type: 'BEP20',
    }));
  } catch (error) {
    console.error('Error fetching BEP20 tokens:', error);
    if (error instanceof Error) {
      throw new Error(`Invalid response format from BscScan: ${error.message}`);
    }
    throw new Error('Invalid response format from BscScan');
  }
};

export const getNfts = async (
  walletAddress: string,
): Promise<NonFungibleToken[]> => {
  // Use BSCScan API instead
  const url = `https://api.bscscan.com/api?module=account&action=tokennfttx&address=${walletAddress}&sort=asc&apikey=${BSC_SCAN_API_KEY}`;

  try {
    const response = await fetchJson(url);

    if (!response || !response.result || !Array.isArray(response.result)) {
      console.error('Invalid response format from BscScan for NFTs:', response);
      return [];
    }

    // Process transactions to get unique NFTs
    const uniqueNfts = new Map();

    response.result.forEach((tx: any) => {
      const nftId = `${tx.contractAddress}:${tx.tokenID}`;
      if (!uniqueNfts.has(nftId)) {
        uniqueNfts.set(nftId, {
          contractAddress: tx.contractAddress,
          tokenId: tx.tokenID,
          tokenName: tx.tokenName || 'Unknown NFT',
          tokenSymbol: tx.tokenSymbol || 'NFT',
          standard: tx.tokenType === 'ERC1155' ? 'BEP1155' : 'BEP721',
        });
      }
    });

    return Array.from(uniqueNfts.values()).map((nft: any) => ({
      interface: nft.standard,
      id: `${nft.contractAddress}:${nft.tokenId}`,
      content: {
        $schema: 'https://schema.example.com/nft1.0.json',
        files: [
          {
            uri: `https://nft-preview.binance.org/?contractAddress=${nft.contractAddress}&tokenId=${nft.tokenId}`,
            mime: 'image/png',
            cdn_uri: `https://nft-preview.binance.org/?contractAddress=${nft.contractAddress}&tokenId=${nft.tokenId}`,
          },
        ],
        json_uri: '',
        metadata: {
          description: `${nft.tokenName} #${nft.tokenId}`,
          name: `${nft.tokenName} #${nft.tokenId}`,
          symbol: nft.tokenSymbol,
          image: `https://nft-preview.binance.org/?contractAddress=${nft.contractAddress}&tokenId=${nft.tokenId}`,
          token_standard: nft.standard,
        },
        links: {
          image: `https://nft-preview.binance.org/?contractAddress=${nft.contractAddress}&tokenId=${nft.tokenId}`,
        },
      },
      royalty: {
        royalty_model: 'creators',
        target: null,
        percent: 0,
        basis_points: 0,
        primary_sale_happened: false,
        locked: false,
      },
      creators: [
        {
          address: nft.contractAddress,
          share: 100,
          verified: false,
        },
      ],
      ownership: {
        frozen: false,
        delegated: false,
        delegate: null,
        ownership_model: 'single',
        owner: walletAddress,
      },
      supply: 1,
      mutable: false,
      burnt: false,
      token_info: {
        token_program: nft.contractAddress,
        token_id: nft.tokenId,
        collection_id: nft.contractAddress,
      },
      contract_type: nft.standard,
      token_id: nft.tokenId,
      contract_address: nft.contractAddress,
    }));
  } catch (error) {
    console.error('Error fetching NFTs from BSCScan:', error);
    return [];
  }
};

// You might need to add these interfaces if they're not already defined
interface Royalty {
  royalty_model: string;
  target: null | string;
  percent: number;
  basis_points: number;
  primary_sale_happened: boolean;
  locked: boolean;
}

interface Creator {
  address: string;
  share: number;
  verified: boolean;
}

interface Ownership {
  frozen: boolean;
  delegated: boolean;
  delegate: null | string;
  ownership_model: string;
  owner: string;
}

export const getBnbPrice = async (): Promise<number> => {
  const url =
    'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd';
  const response = (await fetchJson(url)) as { binancecoin: { usd: number } };
  return response.binancecoin.usd;
};
