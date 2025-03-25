import { NextRequest } from 'next/server';

import TokenInfo from '@/ai/bsc/utils/tokenInfo';
import { getTokenInfo } from '@/lib/bsc/ankr';

// Adjust the import path if needed

// API Route to get token info
export async function GET(
  request: NextRequest,
  { params }: { params: { tokenAddress: string } },
) {
  try {
    const { tokenAddress } = params;
    const tokenInfo = await getTokenInfo(tokenAddress);
    console.log('token Info-----> :', tokenInfo);
    let res = {
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      address: tokenInfo.address,
      decimals: tokenInfo.decimals.toString(),
      totalSupply: tokenInfo.totalSupply.toString(),
    };
    return new Response(JSON.stringify(res), {
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching token info:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch token info' }),
      { status: 500 },
    );
  }
}
