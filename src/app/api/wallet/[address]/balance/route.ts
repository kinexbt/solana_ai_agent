import { NextRequest } from 'next/server';

import { getBalance } from '@/lib/bsc/ankr';

// Adjust this path based on your project structure

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } },
) {
  try {
    const { address } = await params;
    if (!address) {
      return new Response(JSON.stringify({ error: 'No address provided' }), {
        status: 400,
      });
    }

    const balance = await getBalance(address);
    return new Response(JSON.stringify({ balance }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch balance' }), {
      status: 500,
    });
  }
}
