import { NextRequest, NextResponse } from 'next/server';

import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/v2/api';

async function fetchTokenInfo(contractAddress: string) {
  try {
    const [topHolders, tokenSupply, holderCount] = await Promise.all([
      fetch(
        `${ETHERSCAN_BASE_URL}?chainid=56&module=token&action=tokenholderlist&contractAddress=${contractAddress}&page=1&offset=1000&apikey=${ETHERSCAN_API_KEY}`,
      ).then((res) => res.json()),
      fetch(
        `${ETHERSCAN_BASE_URL}?chainid=56&module=stats&action=tokensupply&contractAddress=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`,
      ).then((res) => res.json()),
      fetch(
        `${ETHERSCAN_BASE_URL}?chainid=56&module=token&action=tokenholdercount&contractAddress=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`,
      ).then((res) => res.json()),
    ]);

    if (!topHolders.result || !tokenSupply.result || !holderCount.result) {
      throw new Error('Invalid response from Etherscan API');
    }

    const sortedTopHolders = topHolders.result
      .sort((a, b) => Number(b.balance) - Number(a.balance))
      .slice(0, 10);

    return {
      topHolders: sortedTopHolders,
      marketCap: parseFloat(tokenSupply.result) / 1e18, // Assuming 18 decimals
      holderCount: parseInt(holderCount.result),
    };
  } catch (error) {
    console.error('Error fetching token info:', error);
    throw error; // Re-throw to be handled in the GET request
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const contractAddress = searchParams.get('contractAddress');

  console.log(contractAddress, '=======================.');

  if (!contractAddress) {
    return NextResponse.json(
      { error: 'Contract address is required' },
      { status: 400 },
    );
  }

  try {
    // Fetch token details from Etherscan API
    const info = await fetchTokenInfo(contractAddress);

    return NextResponse.json({ data: info }, { status: 200 });
  } catch (error) {
    console.error('Error fetching token info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token info' },
      { status: 500 },
    );
  }
}
