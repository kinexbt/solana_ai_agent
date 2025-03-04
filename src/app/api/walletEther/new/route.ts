import { NextRequest, NextResponse } from 'next/server';

import { PrismaClient } from '@prisma/client';
import { Wallet } from 'ethers';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { userId, walletName } = await req.json();

    // Ensure the user hasn't exceeded the wallet limit
    const ethWalletCount = await prisma.ethereumWallet.count({
      where: {
        ownerId: userId,
        chain: 'BSC',
      },
    });

    if (ethWalletCount >= 5) {
      return NextResponse.json(
        { error: 'Max 5 wallets allowed' },
        { status: 400 },
      );
    }

    // Create a new wallet using ethers.js
    const wallet = Wallet.createRandom();

    const newWallet = await prisma.ethereumWallet.create({
      data: {
        ownerId: userId,
        name: walletName,
        publicKey: wallet.address,
        encryptedPrivateKey: wallet.privateKey, // You might choose not to encrypt it, but it's good practice
        chain: 'BSC',
      },
    });

    return NextResponse.json(newWallet, { status: 201 });
  } catch (error) {
    console.error('Error creating BSC wallet:', error);
    return NextResponse.json(
      { error: 'Failed to create wallet' },
      { status: 500 },
    );
  }
}
