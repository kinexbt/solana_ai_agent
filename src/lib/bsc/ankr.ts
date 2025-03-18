import { JsonRpcApiProvider, ethers } from 'ethers';

import { chunkArray } from '@/lib/utils';
import rawKnownAddresses from '@/lib/utils/known-addresses.json';
import { ERC20Token } from '@/types/ankr/fungibleToken';
import { ERC721Token } from '@/types/ankr/nonFungibleToken';

import {
  BSC_PROVIDER_URL,
  BSC_SCAN_API_URL,
  RPC_URL,
  WEI_PER_BNB,
} from '../constants';

const provier = new ethers.JsonRpcProvider(RPC_URL);

export interface Holder {
  owner: string;
  balance: number;
  classification?: string; // optional, assigned later
}

interface BscTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  owner?: string;
}

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
];

type AnkrMethod =
  | 'eth_getBalance'
  | 'eth_call'
  | 'eth_getTransactionCount'
  | 'eth_sendTransaction'
  | 'eth_getBlockByHash'
  | 'eth_getTransactionByHash'
  | 'eth_getTransactionReceipt'
  | 'searchAssets';

const KNOWN_ADDRESSES: Record<string, string> = rawKnownAddresses as Record<
  string,
  string
>;

const fetchAnkr = async (method: AnkrMethod, params: any) => {
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'request-id',
        method: method,
        params: params, // some methods require objects, some require arrays
      }),
    });

    // Check for rate limiting response
    if (response.status === 429) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    if (!response.ok) {
      throw new Error(
        `BSC RPC error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(
        `BSC RPC error: ${data.error.message || JSON.stringify(data.error)}`,
      );
    }

    return data.result;
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
      return {
        status: 429,
        error: 'BSC RPC request failed: Too many requests',
      };
    }
    if (error instanceof Error) {
      throw new Error(`BSC RPC request failed: ${error.message}`);
    }
    throw new Error('BSC RPC request failed with unknown error');
  }
};

export const getBalance: (walletAddress: string) => Promise<number> = async (
  walletAddress: string,
) => {
  const data = await fetchAnkr('eth_getBalance', [walletAddress, 'latest']);
  return Number(data.result) / WEI_PER_BNB;
};

export const searchWalletAssetsBSC: (walletAddress: string) => Promise<{
  fungibleTokens: ERC20Token[];
  nonFungibleTokens: ERC721Token[];
}> = async (ownerAddress: string) => {
  try {
    const data = await fetchAnkr('searchAssets', {
      ownerAddress: ownerAddress,
      blockchain: 'bsc',
      tokenType: 'all',
      displayOptions: {
        showNativeBalance: true,
      },
    });

    if (!data.result?.assets) {
      throw new Error('Invalid response format from Ankr API');
    }

    const items: (ERC20Token | ERC721Token)[] = data.result.assets;

    let fungibleTokens: ERC20Token[] = items.filter(
      (item): item is ERC20Token => item.interface === 'ERC20Token',
    );

    const nonFungibleTokens: ERC721Token[] = items.filter(
      (item): item is ERC721Token =>
        item.interface === 'ERC721' || item.interface === 'ERC1155',
    );

    let bnbBalance = data.result.nativeBalance.balance;
    const bnbTotalSupply = data.result.nativeBalance.total_supply;
    const address = data.result.nativeBalance.address;

    const bnbToken: ERC20Token = {
      interface: 'ERC20',
      id: '0x0000000000000000000000000000000000000000',
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
      totalSupply: bnbTotalSupply,
      balanceOf(address: string): number {
        return bnbBalance;
      },
      transfer(to: string, amount: number): boolean {
        if (bnbBalance >= amount) {
          bnbBalance -= amount; // Subtract from balance (simplified logic)
          return true; // Return true to indicate the transfer was successful
        }
        return false; // If not enough balance, return false
      },
      priceInfo: {
        price_per_token: data.result.nativeBalance.price_per_bnb,
        total_price: data.result.nativeBalance.total_price,
        currency: 'USD',
      },
    };

    fungibleTokens.push(bnbToken);

    return { fungibleTokens, nonFungibleTokens };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search wallet assets: ${error.message}`);
    }
    throw new Error('Failed to search wallet assets with unknown error');
  }
};

export async function getBscTokenInfo(
  tokenAddress: string,
  providerUrl: string,
): Promise<any> {
  // Create a provider connected to the BSC network
  const provider = new ethers.JsonRpcProvider(providerUrl);

  // Create a contract instance using the token address and ABI
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  try {
    // Fetch token details
    const name = await tokenContract.name();
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();
    const totalSupply = await tokenContract.totalSupply();

    // You can also fetch the balance of a specific address if needed
    // const balance = await tokenContract.balanceOf(someAddress);

    // Return token info
    return {
      tokenAddress,
      name,
      symbol,
      decimals,
      totalSupply: totalSupply.toString(), // Convert to string to handle large numbers
    };
  } catch (error) {
    throw new Error(
      `Error fetching token info for address: ${tokenAddress}. ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

/**
 * Fetches all holders for a given mint (via "getTokenAccounts"),
 * returning a Map of `address -> Holder`.
 */
export async function getTokenHolders(
  tokenAddress: string, // BSC token address (ERC-20)
  providerUrl: string, // BSC provider URL
  holders: string[], // List of token holders' addresses
): Promise<Map<string, Holder>> {
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  const holderMap = new Map<string, Holder>();

  for (let i = 0; i < holders.length; i++) {
    const holderAddress = holders[i];

    try {
      // Fetch the balance for the holder
      const balanceRaw = await tokenContract.balanceOf(holderAddress);
      const decimals = await tokenContract.decimals();
      const balance = parseFloat(ethers.formatUnits(balanceRaw, decimals));

      if (balance > 0) {
        holderMap.set(holderAddress, {
          owner: holderAddress,
          balance,
        });
      }
    } catch (error) {
      console.error(
        `Error fetching balance for holder ${holderAddress}:`,
        error,
      );
    }
  }

  return holderMap;
}

export const getTokenAccountInfo = async (
  address: string, // The user's wallet address
  tokenAddress: string, // The ERC-20 token contract address
  providerUrl: string, // The RPC provider URL for BSC
) => {
  // Create a provider connected to the BSC network
  const provider = new ethers.JsonRpcProvider(providerUrl);

  // Create a contract instance using the token address and ABI
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  try {
    // Fetch token balance for the given address
    const balanceRaw = await tokenContract.balanceOf(address);
    const decimals = await tokenContract.decimals();
    const balance = parseFloat(ethers.formatUnits(balanceRaw, decimals));

    // Return the account information
    return {
      address,
      balance,
      tokenAddress,
    };
  } catch (error) {
    console.error(
      `Error fetching token account info for address ${address}:`,
      error,
    );
    throw new Error('Failed to fetch token account info');
  }
};

export async function getTopTokenHolders(
  tokenInfo: BscTokenInfo,
  apiKey: string, // BSCScan API key
  providerUrl: string, // BSC provider URL
): Promise<Map<string, Holder>> {
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const tokenContract = new ethers.Contract(
    tokenInfo.address,
    ERC20_ABI,
    provider,
  );

  // Step 1: Fetch top token holders from BSCScan
  const response = await fetch(
    `${BSC_SCAN_API_URL}?module=token&action=topholders&contractaddress=${tokenInfo.address}&apikey=${apiKey}`,
  );

  const data = await response.json();

  if (data.status !== '1' || !data.result) {
    throw new Error('No token holders found');
  }

  const topHolders = data.result.slice(0, 100); // Fetch top 100 holders, for example

  // Step 2: Get the balances of these holders
  const holderMap = new Map<string, Holder>();
  for (const holder of topHolders) {
    const holderAddress = holder.Account;

    try {
      const balanceRaw = await tokenContract.balanceOf(holderAddress);
      const decimals = await tokenContract.decimals();
      const balance = parseFloat(ethers.formatUnits(balanceRaw, decimals));

      if (balance > 0) {
        holderMap.set(holderAddress, {
          owner: holderAddress,
          balance,
        });
      }
    } catch (error) {
      console.error(
        `Error fetching balance for holder ${holderAddress}:`,
        error,
      );
    }
  }

  return holderMap;
}

/**
 * Fetches total number of holders returns -1 if there are more than 50k holders
 */
export async function getTokenHolderCount(
  tokenInfo: BscTokenInfo,
  apiKey: string, // BSCScan API Key
): Promise<number> {
  const PAGE_SIZE = 1000;
  let page = 1;
  const allOwners = new Set<string>();

  while (page <= 100) {
    // Fetch transaction logs from BSCScan to get token holders
    const response = await fetch(
      `${BSC_SCAN_API_URL}?module=account&action=tokentx&contractaddress=${tokenInfo.address}&page=${page}&offset=${PAGE_SIZE}&apikey=${apiKey}`,
    );

    const data = await response.json();

    if (data.status !== '1' || !data.result || data.result.length === 0) {
      break; // no more token transactions
    }

    data.result.forEach((tx: any) => {
      // Add sender and receiver to the owners set
      allOwners.add(tx.from);
      allOwners.add(tx.to);
    });

    if (data.result.length < PAGE_SIZE) {
      break; // reached the last page
    }

    page++;
  }

  // If there are more than 50,000 owners, return -1 (for large data sets)
  if (allOwners.size > 50000) {
    return -1;
  }

  return allOwners.size;
}

/**
 * Use "getMultipleAccounts" in a single RPC call for a list of addresses
 */
export async function getMultipleAccountsInfoBSC(
  addresses: string[],
  apiKey: string,
) {
  const results = [];

  // Loop over the addresses in batches (BSCScan supports max 100 addresses per API call)
  for (let i = 0; i < addresses.length; i += 100) {
    const batch = addresses.slice(i, i + 100);
    const addressList = batch.join(',');

    // Fetch the account info for multiple addresses (token balances)
    const response = await fetch(
      `${BSC_SCAN_API_URL}?module=account&action=balancemulti&address=${addressList}&tag=latest&apikey=${apiKey}`,
    );

    const data = await response.json();

    if (data.status !== '1' || !data.result) {
      throw new Error('Error fetching account info from BSCScan');
    }

    // Add the result to the results array
    results.push(...data.result);
  }

  return results;
}

/**
 * Classify a list of addresses (subset of holders).
 * - If address is in ACCOUNT_LABELS, use that.
 * - Else look at the account's `owner` program → PROGRAM_LABELS or fallback.
 * - Mutates the `Holder.classification` in `holderMap`.
 */
async function classifyAddresses(
  holderMap: Map<string, Holder>,
  addresses: string[],
  chunkSize = 20,
  apiKey: string, // Pass the BSCScan API key for API calls
) {
  const addressChunks = chunkArray(addresses, chunkSize);

  for (const chunk of addressChunks) {
    const response = await getMultipleAccountsInfoBSC(chunk, apiKey);
    if (!response || response.length === 0) {
      continue;
    }

    for (let i = 0; i < chunk.length; i++) {
      const addr = chunk[i];
      const accInfo = response[i];
      const holder = holderMap.get(addr);
      if (!holder) continue;

      // If address is in KNOWN_ADDRESSES
      if (addr in KNOWN_ADDRESSES) {
        holder.classification = KNOWN_ADDRESSES[addr];
        continue;
      }

      // Check if the address is a contract or EOA (Externally Owned Account)
      if (accInfo.balance && accInfo.balance > 0) {
        // Address has a balance, possibly an EOA or token contract
        // You can also perform other checks like token balances or contract types
        holder.classification = 'EOA (Externally Owned Account)';
      } else if (accInfo.is_contract && accInfo.is_contract === true) {
        // Address is a contract
        holder.classification = 'Smart Contract Address';
      } else {
        holder.classification = "Unknown or Doesn't Exist";
      }
    }
  }
}

export async function getHoldersClassification(
  mint: string,
  limit: number = 10,
  apiKey: string, // Pass your BSCScan API key
) {
  // Assuming getMintAccountInfo is replaced with a BSC equivalent
  const mintAccountInfo = await getMintAccountInfoBSC(mint, apiKey);
  const totalSupply =
    Number(mintAccountInfo.totalSupply) / 10 ** mintAccountInfo.decimals;

  const topHolderMap = await getTopTokenHolders(
    mintAccountInfo,
    apiKey,
    BSC_PROVIDER_URL,
  );
  const totalHolders = await getTokenHolderCount(mintAccountInfo, apiKey);

  const sortedHolders = Array.from(topHolderMap.values()).sort((a, b) => {
    return b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0;
  });

  const topHolders = sortedHolders.slice(0, limit);

  // Classify holders based on their address and API data
  await classifyAddresses(
    topHolderMap,
    topHolders.map((h) => h.owner),
    limit,
    apiKey,
  );

  return {
    totalHolders,
    topHolders,
    totalSupply,
  };
}

// Replace with your BSC-specific mint info retrieval function (from BSCScan API)
async function getMintAccountInfoBSC(
  address: string,
  apiKey: string,
): Promise<BscTokenInfo> {
  const response = await fetch(
    `https://api.bscscan.com/api?module=token&action=tokeninfo&contractaddress=${address}&apikey=${apiKey}`,
  );
  const data = await response.json();

  if (data.status !== '1') {
    throw new Error(`Failed to fetch mint account info for: ${address}`);
  }

  return {
    address,
    name: data.result[0].name,
    symbol: data.result[0].symbol,
    decimals: parseInt(data.result[0].decimals),
    totalSupply: BigInt(data.result[0].totalSupply),
  };
}
