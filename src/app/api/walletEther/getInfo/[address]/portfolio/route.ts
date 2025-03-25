import { NextRequest, NextResponse } from 'next/server';

import { PrismaClient } from '@prisma/client';
import { Contract, JsonRpcProvider, ethers } from 'ethers';

import { ERC20_ABI, ERC721_ABI } from '@/lib/utils/abis';

const prisma = new PrismaClient();
const provider = new JsonRpcProvider(process.env.BSC_RPC_URL);

interface FungibleToken {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
}

interface NonFungibleToken {
  tokenId: string;
  name: string;
  imageUrl?: string;
  metadata?: string;
}

const tokenAddresses = ['0x...'];
const nftAddresses = ['0x...'];

// Function to fetch fungible tokens (ERC-20) for the wallet
async function getFungibleTokens(address: string): Promise<FungibleToken[]> {
  const tokenList: FungibleToken[] = [];

  for (const tokenAddress of tokenAddresses) {
    const contract = new Contract(tokenAddress, ERC20_ABI, provider);

    try {
      const [symbol, name, decimals, balance] = await Promise.all([
        contract.symbol(),
        contract.name(),
        contract.decimals(),
        contract.balanceOf(address),
      ]);

      tokenList.push({
        symbol,
        name,
        balance: balance.toString(),
        decimals,
      });
    } catch (error) {
      console.error(`Failed to fetch ERC-20 data for ${tokenAddress}`, error);
    }
  }

  return tokenList;
}

// Function to fetch non-fungible tokens (ERC-721) for the wallet
async function getNonFungibleTokens(
  address: string,
): Promise<NonFungibleToken[]> {
  const nftList: NonFungibleToken[] = [];

  for (const nftAddress of nftAddresses) {
    const contract = new Contract(nftAddress, ERC721_ABI, provider);

    try {
      const balance = await contract.balanceOf(address);

      for (let i = 0; i < balance; i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(address, i);
        const tokenURI = await contract.tokenURI(tokenId);

        // Assuming metadata is JSON and contains 'name' and 'image'
        const metadataResponse = await fetch(tokenURI);
        const metadata = await metadataResponse.json();

        nftList.push({
          tokenId: tokenId.toString(),
          name: metadata.name,
          imageUrl: metadata.image,
          metadata: JSON.stringify(metadata),
        });
      }
    } catch (error) {
      console.error(`Failed to fetch NFT data for ${nftAddress}`, error);
    }
  }

  return nftList;
}

// Example GET handler for Ethereum wallet portfolio
export async function GET(request: NextRequest) {
  try {
    // Access the wallet address from the route path
    const address = request.nextUrl.pathname.split('/')[4]; // Index 4 to get the address

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 },
      );
    }

    const [fungibleTokens, nonFungibleTokens] = await Promise.all([
      getFungibleTokens(address),
      getNonFungibleTokens(address),
    ]);

    return NextResponse.json({
      address,
      fungibleTokens,
      nonFungibleTokens,
    });
  } catch (error) {
    console.error('Error fetching ETH wallet portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet portfolio' },
      { status: 500 },
    );
  }
}
