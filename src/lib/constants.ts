import config from '../../package.json';

export const APP_VERSION = config.version;
export const IS_BETA = true;

export const RPC_URL =
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL ||
  'https://api.mainnet-beta.solana.com';
export const rpcUrl = process.env.ETH_RPC_URL;

export const MAX_TOKEN_MESSAGES = 10;

export const NO_CONFIRMATION_MESSAGE = ' (Does not require confirmation)';
export const WEI_PER_BNB = 1000000000000000000;
export const BSC_SCAN_API_URL = 'https://api.bscscan.com/api';
export const BSC_SCAN_API_KEY = process.env.BSC_SCAN_API_KEY;
export const BSC_PROVIDER_URL = 'https://bsc-dataseed.binance.org';
export const COIN_GECKO_API_URL = 'https://api.coingecko.com/api/v3';
export const BSC_RPC_URL = 'https://binance.llamarpc.com/';
