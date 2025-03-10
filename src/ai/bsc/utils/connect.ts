import { JsonRpcProvider, ethers } from 'ethers';

export const bscProvider = new JsonRpcProvider(
  'https://bsc-dataseed.binance.org/',
  { name: 'binance', chainId: 56 },
);

export const wallet = ethers.Wallet.createRandom().connect(bscProvider);

export const publicKey = wallet.address;
