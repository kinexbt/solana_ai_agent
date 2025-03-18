import { NextRequest, NextResponse } from 'next/server';

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

// Use a singleton Prisma client to prevent multiple instances
const prisma = new PrismaClient();
const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com'); // Use Ethereum RPC

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const walletId = searchParams.get('walletId');

    console.log('Received request to delete wallet. Wallet ID:', walletId);

    if (!walletId) {
      return NextResponse.json(
        { error: 'Wallet ID required' },
        { status: 400 },
      );
    }

    // Get wallet details
    const wallet = await prisma.ethereumWallet.findFirst({
      where: { id: walletId },
    });

    console.log('Wallet ID:', walletId);
    console.log('Wallet Query Result:', wallet);

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    console.log('Found wallet:', wallet);

    // Get balance of the wallet from Ethereum blockchain
    const balance = await provider.getBalance(wallet.publicKey);
    const balanceInEther = ethers.formatEther(balance);

    console.log(`Wallet balance: ${balanceInEther} ETH`);

    if (parseFloat(balanceInEther) > 0) {
      return NextResponse.json(
        { error: 'Wallet has a balance and cannot be deleted' },
        { status: 400 },
      );
    }

    // Delete wallet from database
    await prisma.ethereumWallet.delete({
      where: { id: wallet.id },
    });

    console.log('Wallet successfully deleted:', walletId);
    return NextResponse.json({ message: 'Wallet deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting ETH wallet:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete wallet', details: errorMessage },
      { status: 500 },
    );
  }
}
