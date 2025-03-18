import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  const { userId } = params;

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  try {
    const accounts = await prisma.ethereumWallet.findMany({
      where: { userId: userId },
      select: { id: true, name: true, publicKey: true, balance: true },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json(
      { error: 'Error fetching wallets' },
      { status: 500 },
    );
  }
}
