import { NextRequest, NextResponse } from 'next/server';

import { getTopTokenHolders } from '@/lib/bsc/ankr';

export async function GET(
  requset: NextRequest,
  { params }: { params: { tokenAddress: string } },
) {
  try {
    const { tokenAddress } = await params;
    if (!tokenAddress) {
      return NextResponse.json(
        { error: 'Token address is required' },
        { status: 400 },
      );
    }

    const topHolders = await getTopTokenHolders(tokenAddress);
    return NextResponse.json({
      success: true,
      holders: Array.from(topHolders.values()),
    });
  } catch (error) {
    return NextResponse.json({ error: 'failed to fetch' }, { status: 500 });
  }
}
