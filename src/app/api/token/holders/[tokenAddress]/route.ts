import { NextRequest, NextResponse } from 'next/server';

import { getTokenHolders } from '@/lib/bsc/ankr';

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenAddress: string } },
) {
  try {
    const { tokenAddress } = params;
    const holders = await getTokenHolders(tokenAddress);
    return NextResponse.json({ holders });
  } catch (error) {
    console.error('Error fetching token holders:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch token holders' }),
      { status: 500 },
    );
  }
}
