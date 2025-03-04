import { NextRequest, NextResponse } from 'next/server';

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();
const provider = new ethers.JsonRpcProvider('https://binance.llamarpc.com/');

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const walletId = searchParams.get('walletId');

    if (!walletId) {
      return NextResponse.json(
        { error: 'Wallet ID required' },
        { status: 400 },
      );
    }

    const wallet = await prisma.ethereumWallet.findUnique({
      where: { id: walletId }, // Assuming 'id' is the wallet identifier
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const balance = await provider.getBalance(wallet.publicKey);
    const balanceInEther = ethers.formatEther(balance);

    if (parseFloat(balanceInEther) > 0) {
      return NextResponse.json(
        { error: 'Wallet has a balance and cannot be deleted' },
        { status: 400 },
      );
    }

    await prisma.ethereumWallet.delete({
      where: { id: walletId },
    });

    return NextResponse.json({ message: 'Wallet deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting ETH wallet:', error);
    return NextResponse.json(
      { error: 'Failed to delete wallet' },
      { status: 500 },
    );
  }
}
