import { NextRequest, NextResponse } from 'next/server';

import { getTokenHolderCount } from '@/lib/bsc/ankr';

export async function GET(
  request: NextRequest,
  context: { params: { tokenAddress: string } },
) {
  try {
    const { tokenAddress } = await context.params;
    const holderCount = await getTokenHolderCount(tokenAddress);
    return NextResponse.json({ holderCount });
  } catch (error) {
    console.error('Error fetching token holder count:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch token holder count' }),
      { status: 500 },
    );
  }
}
