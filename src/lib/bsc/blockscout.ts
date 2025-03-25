import axios from 'axios';

// API endpoints
const BLOCKSCOUT_API_BASE = 'https://bscscan.com/api';

// Types
export interface Holder {
  owner: string;
  balance: number;
  percentage?: number;
  classification?: string; // Exchange, Whale, Contract, etc.
}

interface BlockscoutResponse<T> {
  status: string;
  message: string;
  result: T;
}

interface TokenHolderResponse {
  items: {
    address: string;
    balance: string;
    share: string;
  }[];
  next_page_params: any;
}

interface WalletAssetResponse {
  items: {
    token: {
      address: string;
      name: string;
      symbol: string;
      decimals: string;
      type: string;
      holders: string;
      exchange_rate: string | null;
      total_supply: string;
    };
    value: string;
    quantity: string;
  }[];
  next_page_params: any;
}

/**
 * Classifies a holder based on address patterns and balance percentage
 */
function classifyHolder(address: string, percentage: number): string {
  // Common exchange addresses
  const exchanges: Record<string, string> = {
    '0x8894e0a0c962cb723c1976a4421c95949be2d4e3': 'Binance Hot Wallet',
    '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance-Peg Wallet',
    '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': 'Binance Cold Wallet',
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'PancakeSwap: Router v2',
    '0x0000000000000000000000000000000000000000': 'Burn Address',
    // Add more known addresses as needed
  };

  // Check if it's a known exchange
  if (exchanges[address.toLowerCase() as keyof typeof exchanges]) {
    return exchanges[address.toLowerCase()];
  }

  // Classify based on percentage holdings
  if (percentage >= 5) {
    return 'Whale (5%+ holdings)';
  } else if (percentage >= 1) {
    return 'Major Holder (1%+ holdings)';
  }

  // Check if it's a contract (simplified check)
  if (address.startsWith('0x') && address.length === 42) {
    // In a real implementation, you would make an API call to check if it's a contract
    // This is a simplified placeholder
    return 'Wallet Address';
  }

  return 'Regular Holder';
}

/**
 * Gets token holder information and classification
 */
export async function getHoldersClassification(tokenAddress: string) {
  try {
    // Fetch token holder data from blockscout
    const response = await axios.get<BlockscoutResponse<TokenHolderResponse>>(
      `${BLOCKSCOUT_API_BASE}/token/holders`,
      {
        params: {
          contractaddress: tokenAddress,
          page: 1,
          offset: 25,
        },
      },
    );

    console.log('tokenholders data: ', response.data);
    console.log('search token address: ', tokenAddress);
    // Fetch token info to get total supply
    const tokenInfoResponse = await axios.get<BlockscoutResponse<any>>(
      `${BLOCKSCOUT_API_BASE}/token/info`,
      {
        params: {
          contractaddress: tokenAddress,
        },
      },
    );
    console.log('response data: ', response.data.result);
    console.log('response data:', response.data);
    const totalSupply = parseFloat(tokenInfoResponse.data.result.totalSupply);
    const holders = response.data.result.items;

    console.log('totalSupply: ', totalSupply);
    console.log('holders:', holders);
    // Transform and classify holders
    const topHolders: Holder[] = holders.map((holder) => {
      const balance = parseFloat(holder.balance);
      const percentage = (balance / totalSupply) * 100;

      return {
        owner: holder.address,
        balance,
        percentage,
        classification: classifyHolder(holder.address, percentage),
      };
    });

    return {
      totalHolders: parseInt(tokenInfoResponse.data.result.holders || '0'),
      topHolders,
      totalSupply,
    };
  } catch (error) {
    console.error('Error fetching token holders:', error);
    throw new Error(
      `Failed to fetch token holders: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Searches wallet assets
 */
export async function searchWalletAssets(walletAddress: string) {
  try {
    const response = await axios.get<BlockscoutResponse<WalletAssetResponse>>(
      `${BLOCKSCOUT_API_BASE}/account/tokens`,
      {
        params: {
          address: walletAddress,
        },
      },
    );

    const tokens = response.data.result.items.map((item) => ({
      address: item.token.address,
      name: item.token.name,
      symbol: item.token.symbol,
      decimals: parseInt(item.token.decimals),
      balance: parseFloat(item.quantity),
      price: item.token.exchange_rate
        ? parseFloat(item.token.exchange_rate)
        : 0,
      totalSupply: parseFloat(item.token.total_supply),
      holderCount: parseInt(item.token.holders || '0'),
      type: item.token.type,
    }));

    return { tokens };
  } catch (error) {
    console.error('Error fetching wallet assets:', error);
    throw new Error(
      `Failed to fetch wallet assets: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
