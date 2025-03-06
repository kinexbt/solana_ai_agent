import { NextRequest, NextResponse } from 'next/server';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest) {
  try {
    const { userId, walletId, newWalletName } = await req.json();

    // Ensure the user is authorized to update the wallet
    const existingWallet = await prisma.ethereumWallet.findUnique({
      where: {
        id: walletId,
      },
    });

    if (!existingWallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Check if the wallet belongs to the user
    if (existingWallet.ownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the wallet name or any other properties
    const updatedWallet = await prisma.ethereumWallet.update({
      where: {
        id: walletId,
      },
      data: {
        name: newWalletName || existingWallet.name, // Keep the current name if no new name provided
      },
    });

    return NextResponse.json(updatedWallet, { status: 200 });
  } catch (error) {
    console.error('Error updating wallet:', error);
    return NextResponse.json(
      { error: 'Failed to update wallet' },
      { status: 500 },
    );
  }
}
