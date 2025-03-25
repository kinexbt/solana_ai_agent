import { ethers } from 'ethers';
import { bigint } from 'zod';

import {
  getBep20Tokens,
  getBnbBalance,
  getBnbPrice,
  getNfts,
} from '@/lib/bsc/api';
import { chunkArray } from '@/lib/utils';
import rawKnownAddresses from '@/lib/utils/bsc-known-addresses.json';
import { FungibleToken } from '@/types/bsc/fungibleToken';
import { NonFungibleToken } from '@/types/bsc/nonFungibleToken';

import { BSC_SCAN_API_KEY } from '../constants';

// Standard ERC20 ABI for token interactions
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint amount) returns (bool)',
];

// Standard ERC721 ABI for NFT interactions
const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
];

// Constants for BSC
export const RPC_URL = 'https://bsc-dataseed.binance.org/';
export const BNB_CONTRACT = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'; // WBNB contract
export const BUSD_CONTRACT = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'; // BUSD contract
export const ETH_API_KEY = '22IJEHB9FGA6QPWQV4TNEQWWU4TQATZFU5';
export interface Holder {
  owner: string;
  balance: number;
  classification?: string; // optional, assigned later
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

const KNOWN_ADDRESSES: Record<string, string> = rawKnownAddresses as Record<
  string,
  string
>;

// Initialize provider
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Generic function to handle BSC API requests
const fetchBSC = async (method: string, params: any) => {
  try {
    const response = await fetch(RPC_URL, {
      next: { revalidate: 5 },
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'request-id',
        method: method,
        params: params,
      }),
    });

    if (response.status === 429) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    if (!response.ok) {
      throw new Error(
        `BSC API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(
        `BSC API error: ${data.error.message || JSON.stringify(data.error)}`,
      );
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
      return {
        status: 429,
        error: 'BSC API request failed: Too many requests',
      };
    }
    if (error instanceof Error) {
      throw new Error(`BSC API request failed: ${error.message}`);
    }
    throw new Error('BSC API request failed with unknown error');
  }
};

// Get BNB balance for a wallet
export const getBalance = async (walletAddress: string): Promise<number> => {
  try {
    const balanceWei = await provider.getBalance(walletAddress);
    return Number(ethers.formatEther(balanceWei)); // Convert from wei to BNB
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
    throw new Error('Failed to get balance with unknown error');
  }
};

// Get token info from contract address
export const getTokenInfo = async (
  tokenAddress: string,
): Promise<TokenInfo> => {
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider,
    );
    console.log('---->', tokenContract);
    // Fetch token details with error handling for each method
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      tokenContract.name().catch(() => 'Unknown'), // Fallback to 'Unknown' if name() fails
      tokenContract.symbol().catch(() => 'Unknown'), // Fallback to 'Unknown' if symbol() fails
      tokenContract.decimals().catch(() => 18), // Fallback to 18 if decimals() fails
      tokenContract.totalSupply().catch(() => BigInt(0)), // Fallback to 0 if totalSupply() fails
    ]);
    return {
      address: tokenAddress,
      name,
      symbol,
      decimals,
      totalSupply,
    };
  } catch (error) {
    console.error('Error in getTokenInfo:', error); // Log the error here
    if (error instanceof Error) {
      throw new Error(`Failed to get token info: ${error.message}`);
    }
    throw new Error('Failed to get token info with unknown error');
  }
};
// Get token balance for a specific address
export const getTokenBalance = async (
  tokenAddress: string,
  walletAddress: string,
  decimals?: number,
): Promise<number> => {
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider,
    );
    const balanceRaw = await tokenContract.balanceOf(walletAddress);

    const tokenDecimals = decimals ?? (await tokenContract.decimals());

    // Convert raw balance to human-readable format
    return Number(ethers.formatUnits(balanceRaw, tokenDecimals));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
    throw new Error('Failed to get token balance with unknown error');
  }
};

// Search wallet assets (both fungible and non-fungible tokens)
export const searchWalletAssets = async (
  walletAddress: string,
): Promise<{
  fungibleTokens: FungibleToken[];
  nonFungibleTokens: NonFungibleToken[];
}> => {
  try {
    // Fetch BNB balance and price
    const [bnbBalance, bnbPrice] = await Promise.all([
      getBnbBalance(walletAddress),
      getBnbPrice(),
    ]);

    let bep20Tokens: FungibleToken[] = [];

    try {
      bep20Tokens = await getBep20Tokens(walletAddress);
    } catch (error) {
      console.error('Error fetching BEP20 tokens:', error);
    }
    // Fetch NFTs
    let nonFungibleTokens: NonFungibleToken[] = [];

    try {
      nonFungibleTokens = await getNfts(walletAddress);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    }

    // Add BNB as a fungible token
    const fungibleTokens: FungibleToken[] = [
      {
        interface: 'FungibleAsset',
        id: 'BNB',
        content: {
          $schema: 'https://schema.example.com/token1.0.json',
          files: [
            {
              uri: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
              cdn_uri: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
              mime: 'image/png',
            },
          ],
          metadata: {
            description: 'Binance Coin',
            name: 'Binance Coin',
            symbol: 'BNB',
            token_standard: 'Native Token',
          },
          links: {
            image: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
          },
        },
        token_info: {
          symbol: 'BNB',
          balance: bnbBalance,
          supply: 0,
          decimals: 18,
          token_program: '',
          associated_token_address: '',
          price_info: {
            price_per_token: bnbPrice,
            total_price: bnbBalance * bnbPrice,
            currency: 'USD',
          },
        },
      },
      ...bep20Tokens, // Append BEP20 tokens if fetched
    ];

    // Check for Wrapped BNB (WBNB)
    try {
      const wbnbBalance = await getTokenBalance(BNB_CONTRACT, walletAddress);
      if (wbnbBalance > 0) {
        fungibleTokens.push({
          interface: 'FungibleToken',
          id: BNB_CONTRACT,
          content: {
            $schema: 'https://schema.example.com/token1.0.json',
            files: [
              {
                uri: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
                cdn_uri:
                  'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
                mime: 'image/png',
              },
            ],
            metadata: {
              description: 'Wrapped BNB',
              name: 'Wrapped BNB',
              symbol: 'WBNB',
              token_standard: 'BEP20',
            },
            links: {
              image: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
            },
          },
          token_info: {
            symbol: 'WBNB',
            balance: wbnbBalance,
            supply: 0,
            decimals: 18,
            token_program: '',
            associated_token_address: '',
            price_info: {
              price_per_token: bnbPrice,
              total_price: wbnbBalance * bnbPrice,
              currency: 'USD',
            },
          },
        });
      }
    } catch (error) {
      console.error('Error fetching WBNB balance:', error);
    }

    return { fungibleTokens, nonFungibleTokens };
  } catch (error) {
    console.error('searchWalletAssets error:', error);
    throw new Error(
      `Failed to search wallet assets: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
};

// Get token holders for a specific token
export interface Holder {
  owner: string;
  balance: number;
}

export async function getTokenHolders(
  tokenAddress: string,
  decimals?: number,
): Promise<Map<string, Holder>> {
  try {
    // Etherscan API URL for fetching token holders
    const etherscanApiUrl = `https://api.etherscan.io/api?module=token&action=tokenholderlist&contractaddress=${tokenAddress}&page=1&offset=1000&apikey=${ETH_API_KEY}`;

    // Fetch data from Etherscan API
    const response = await fetch(etherscanApiUrl);
    // Check if the response is okay
    if (!response.ok) {
      throw new Error('Failed to fetch data from Etherscan');
    }

    const data = await response.json();
    console.log('data:', data);
    if (data.status !== '1') {
      throw new Error('Etherscan API error: ' + data.message);
    }

    // Create a map to store token holders and their balances
    const holderMap = new Map<string, Holder>();

    // Get token decimals either from the passed argument or fetch from token info
    const tokenDecimals =
      decimals ??
      (await getTokenInfo(tokenAddress).then((info) => info.decimals));

    // Loop through the holders data and store the balances
    data.result.forEach((holder: any) => {
      const owner = holder.Address;
      const balanceRaw = BigInt(holder.TokenHolderQuantity || '0');
      const balance = Number(ethers.formatUnits(balanceRaw, tokenDecimals));
      console.log('balanceRaw:', balanceRaw);
      console.log('tokenDecimals:', tokenDecimals);
      holderMap.set(owner, {
        owner,
        balance,
      });
    });

    return holderMap;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get token holders: ${error.message}`);
    }
    throw new Error('Failed to get token holders with unknown error');
  }
}

// Get top token holders
export async function getTopTokenHolders(
  tokenAddress: string,
  decimals?: number,
): Promise<Map<string, Holder>> {
  try {
    // Get token decimals
    const tokenDecimals =
      decimals ??
      (await getTokenInfo(tokenAddress).then((info) => info.decimals));
    // BscScan API URL for fetching token transfers
    const transfersUrl = `https://api.etherscan.io/v2/api?module=account&action=tokentx&contractaddress=${tokenAddress}&chainid=56&page=1&offset=10000&sort=desc&apikey=${ETH_API_KEY}`;
    const response = await fetch(transfersUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch transfer data from BscScan');
    }

    const data = await response.json();
    if (data.status !== '1') {
      throw new Error('BscScan API error: ' + data.message);
    }

    // Create a map to track token holders
    const holderMap = new Map<string, Holder>();

    // Process transfer events to determine current holders
    for (const tx of data.result) {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();
      const value = BigInt(tx.value);

      // Update sender balance
      if (!holderMap.has(from)) {
        holderMap.set(from, { owner: from, balance: 0 });
      }

      // Update receiver balance
      if (!holderMap.has(to)) {
        holderMap.set(to, { owner: to, balance: 0 });
      }

      const formattedValue = Number(ethers.formatUnits(value, tokenDecimals));
      const fromHolder = holderMap.get(from)!;
      fromHolder.balance -= formattedValue;

      const toHolder = holderMap.get(to)!;
      toHolder.balance += formattedValue;
    }

    // Filter out holders with zero or negative balance
    // and sort by balance to get top holders
    const sortedHolders = [...holderMap.entries()]
      .filter(([_, holder]) => holder.balance > 0)
      .sort(([, a], [, b]) => b.balance - a.balance);

    return new Map(sortedHolders);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get BSC token holders: ${error.message}`);
    }
    throw new Error('Failed to get BSC token holders with unknown error');
  }
}

// Get the total number of holders for a token
export async function getTokenHolderCount(
  tokenAddress: string,
): Promise<number> {
  try {
    // In a real implementation, you would use a token indexer API that provides holder count
    // This is a simplified example using a mock API call
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=token&action=tokenholdercount&contractaddress=${tokenAddress}&apikey=${ETH_API_KEY}`,
    );
    const data = await response.json();

    return data.result || 0;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get token holder count: ${error.message}`);
    }
    throw new Error('Failed to get token holder count with unknown error');
  }
}

// Classify addresses (determine if they're exchanges, contracts, etc.)
async function classifyAddresses(
  holderMap: Map<string, Holder>,
  addresses: string[],
  chunkSize = 20,
) {
  const addressChunks = chunkArray(addresses, chunkSize);

  for (const chunk of addressChunks) {
    // For each address in the chunk, check if it's a contract
    const contractChecks = await Promise.all(
      chunk.map((address) =>
        provider.getCode(address).then((code) => code !== '0x'),
      ),
    );

    for (let i = 0; i < chunk.length; i++) {
      const addr = chunk[i];
      const isContract = contractChecks[i];
      const holder = holderMap.get(addr);

      if (!holder) continue;

      // If address is in KNOWN_ADDRESSES, use that classification
      if (addr in KNOWN_ADDRESSES) {
        holder.classification = KNOWN_ADDRESSES[addr];
        continue;
      }

      // Otherwise determine based on whether it's a contract
      if (isContract) {
        // We could further inspect the contract to determine its type
        holder.classification = 'Contract';
      } else {
        holder.classification = 'EOA (User)';
      }
    }
  }
}

// Get holders classification for a token
export async function getHoldersClassification(
  tokenAddress: string,
  limit: number = 10,
) {
  try {
    const tokenInfo = await getTokenInfo(tokenAddress);
    const totalSupply = Number(
      ethers.formatUnits(tokenInfo.totalSupply, tokenInfo.decimals),
    );

    const topHolderMap = await getTopTokenHolders(tokenAddress, limit);
    const totalHolders = await getTokenHolderCount(tokenAddress);

    const sortedHolders = Array.from(topHolderMap.values()).sort((a, b) => {
      return b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0;
    });

    const topHolders = sortedHolders.slice(0, limit);
    await classifyAddresses(
      topHolderMap,
      topHolders.map((h) => h.owner),
      limit,
    );

    return {
      totalHolders,
      topHolders,
      totalSupply,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get holders classification: ${error.message}`);
    }
    throw new Error('Failed to get holders classification with unknown error');
  }
}

// Helper functions

// Get transaction history for a wallet
export const getTransactionHistory = async (
  walletAddress: string,
  page: number = 1,
  limit: number = 10,
) => {
  try {
    // In a real implementation, you would use BSCScan API or another indexer
    const response = await fetch(
      `https://api.bscscan.com/api?module=account&action=txlist&address=${walletAddress}&page=${page}&offset=${limit}&sort=desc&apikey=${BSC_SCAN_API_KEY}`,
    );
    const data = await response.json();

    if (data.status !== '1') {
      throw new Error(data.message || 'Failed to get transaction history');
    }

    return data.result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
    throw new Error('Failed to get transaction history with unknown error');
  }
};

// Get token transaction history for a wallet
export const getTokenTransactionHistory = async (
  walletAddress: string,
  tokenAddress?: string,
  page: number = 1,
  limit: number = 10,
) => {
  try {
    // Build the API URL based on whether a token address is provided
    let url = `https://api.bscscan.com/api?module=account&action=tokentx&address=${walletAddress}&page=${page}&offset=${limit}&sort=desc&apikey=YOUR_API_KEY`;

    if (tokenAddress) {
      url += `&contractaddress=${tokenAddress}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1') {
      throw new Error(
        data.message || 'Failed to get token transaction history',
      );
    }

    return data.result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to get token transaction history: ${error.message}`,
      );
    }
    throw new Error(
      'Failed to get token transaction history with unknown error',
    );
  }
};
