import dotenv from 'dotenv';
import Web3 from 'web3';

dotenv.config();

const MAINNET_RPC_ENDPOINT = process.env['MAINNET_RPC_ENDPOINT']!;
const TESTNET_RPC_ENDPOINT = process.env['TESTNET_RPC_ENDPOINT']!;

export const OWNER = process.env['PRIVKEY']!;
export const RANDOM_NUM = process.env['RANDOM_NUM']!;
export const NODE_REAL_API = process.env['NODE_REAL_API']!;

export const TOKEN_MANAGER_CONTRACT_V2_ADDRESS =
  '0x5c952063c7fc8610FFDB798152D69F0B9550762b';
export const PANCAKE_V3_FACTORY_ADDRESS =
  '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865';
export const PANCAKE_V3_SWAPROUTER_ADDRESS =
  '0x1b81D678ffb9C0263b24A97847620C99d213eB14';
export const PANCAKE_V2_FACTORY_ADDRESS =
  '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
export const PANCAKE_V2_SWAPROUTER_ADDRESS =
  '0x10ED43C718714eb63d5aA57B78B54704E256024E';
export const PANCAKE_QUOTER_ADDRESS =
  '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';
export const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

export const FOUR_MEME_URL = 'https://four.meme/meme-api';
export const RPC_ENDPOINT = MAINNET_RPC_ENDPOINT;
export const w3 = new Web3(new Web3.providers.HttpProvider(RPC_ENDPOINT!));
export const chainId = 56; // testversion : 97

export const RAISING_LIST = [
  {
    b0Amount: 8,
    buyFee: 0.01,
    buyTokenLink: 'https://pancakeswap.finance/swap',
    deployCost: 0,
    logoUrl:
      'https://static.four.meme/market/68b871b6-96f7-408c-b8d0-388d804b34275092658264263839640.png',
    minTradeFee: 0,
    nativeSymbol: 'BNB',
    networkCode: 'BSC',
    platform: 'MEME',
    reservedNumber: 10,
    saleRate: 0.8,
    sellFee: 0.01,
    status: 'PUBLISH',
    symbol: 'BNB',
    symbolAddress: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    totalAmount: 1000000000,
    totalBAmount: 24,
    tradeLevel: [0.1, 0.5, 1],
  },
  {
    b0Amount: 2000,
    buyFee: 0.01,
    buyTokenLink: 'https://pancakeswap.finance/swap',
    deployCost: 0,
    logoUrl:
      'https://static.four.meme/market/349f0ef2-d7be-4f7e-931c-385dc147ccc612887266201720862208.png',
    minTradeFee: 0,
    nativeSymbol: 'CAKE',
    networkCode: 'BSC',
    platform: 'MEME',
    reservedNumber: 10,
    saleRate: 0.8,
    sellFee: 0.01,
    status: 'PUBLISH',
    symbol: 'CAKE',
    symbolAddress: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
    totalAmount: 1000000000,
    totalBAmount: 10000,
    tradeLevel: [50, 200, 500],
  },
  {
    b0Amount: 14000000000,
    buyFee: 0.01,
    buyTokenLink:
      'https://pancakeswap.finance/swap?outputCurrency=0x9eC02756A559700d8D9e79ECe56809f7bcC5dC27',
    deployCost: 0,
    logoUrl:
      'https://static.four.meme/market/0b318d50-bf0a-41fc-90e2-f786c99c5a1115769448300885386231.png',
    minTradeFee: 0,
    nativeSymbol: 'WHY',
    networkCode: 'BSC',
    platform: 'MEME',
    reservedNumber: 2,
    saleRate: 0.8,
    sellFee: 0.01,
    status: 'PUBLISH',
    symbol: 'WHY',
    symbolAddress: '0x9ec02756a559700d8d9e79ece56809f7bcc5dc27',
    totalAmount: 1000000000,
    totalBAmount: 42000000000,
    tradeLevel: [100000000, 500000000, 1000000000],
  },
  {
    b0Amount: 4000,
    buyFee: 0.01,
    buyTokenLink:
      'https://pancakeswap.finance/swap?outputCurrency=0x55d398326f99059fF775485246999027B3197955',
    deployCost: 0,
    logoUrl:
      'https://static.four.meme/market/cb6b122b-4724-4490-8a94-28719b7a6d3013823940338020973518.png',
    minTradeFee: 0,
    nativeSymbol: 'USDT',
    networkCode: 'BSC',
    platform: 'MEME',
    reservedNumber: 10,
    saleRate: 0.8,
    sellFee: 0.01,
    status: 'PUBLISH',
    symbol: 'USDT',
    symbolAddress: '0x55d398326f99059ff775485246999027b3197955',
    totalAmount: 1000000000,
    totalBAmount: 12000,
    tradeLevel: [50, 250, 500],
  },
  {
    b0Amount: 2500,
    buyFee: 0.01,
    buyTokenLink:
      'https://pancakeswap.finance/swap?outputCurrency=0x5b1f874d0b0C5ee17a495CbB70AB8bf64107A3BD',
    deployCost: 0,
    logoUrl:
      'https://static.four.meme/market/1ca57e5f-0d35-4b62-87e2-7332b7422f7f12129969039190133364.png',
    minTradeFee: 0.001,
    nativeSymbol: 'BNX',
    networkCode: 'BSC',
    platform: 'MEME',
    reservedNumber: 6,
    saleRate: 0.8,
    sellFee: 0.01,
    status: 'PUBLISH',
    symbol: 'BNX',
    symbolAddress: '0x5b1f874d0b0c5ee17a495cbb70ab8bf64107a3bd',
    totalAmount: 1000000000,
    totalBAmount: 75000,
    tradeLevel: [50, 250, 500],
  },
  {
    b0Amount: 2000,
    buyFee: 0.01,
    buyTokenLink:
      'https://pancakeswap.finance/?outputCurrency=0xe6DF05CE8C8301223373CF5B969AFCb1498c5528',
    deployCost: 0,
    logoUrl:
      'https://static.four.meme/market/062d75c6-75c0-4134-a9be-37d1ec0f229710985429081008652009.png',
    minTradeFee: 0,
    nativeSymbol: 'KOGE',
    networkCode: 'BSC',
    platform: 'MEME',
    reservedNumber: 10,
    saleRate: 0.8,
    sellFee: 0.01,
    status: 'PUBLISH',
    symbol: 'Koge',
    symbolAddress: '0xe6df05ce8c8301223373cf5b969afcb1498c5528',
    totalAmount: 1000000000,
    totalBAmount: 400,
    tradeLevel: [2, 4, 10],
  },
  {
    b0Amount: 2000,
    buyFee: 0.01,
    buyTokenLink:
      'https://pancakeswap.finance/?outputCurrency=0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5',
    deployCost: 0,
    logoUrl:
      'https://static.four.meme/market/d07dd621-4153-482d-827c-a9b808b6cdce13863777799408381886.png',
    minTradeFee: 0,
    nativeSymbol: 'LisUSD',
    networkCode: 'BSC',
    platform: 'MEME',
    reservedNumber: 10,
    saleRate: 0.8,
    sellFee: 0.01,
    status: 'PUBLISH',
    symbol: 'LisUSD',
    symbolAddress: '0x0782b6d8c4551b9760e74c0545a9bcd90bdc41e5',
    totalAmount: 1000000000,
    totalBAmount: 12000,
    tradeLevel: [20, 50, 200],
  },
  {
    b0Amount: 4000,
    buyFee: 0.01,
    buyTokenLink:
      'https://thena.fi/swap?inputCurrency=BNB&outputCurrency=0xf4c8e32eadec4bfe97e0f595add0f4450a863a11&swapType=1',
    deployCost: 0,
    logoUrl:
      'https://static.four.meme/market/025d7836-656c-4227-9e10-6c4bbe7691968993144855289501680.png',
    minTradeFee: 0,
    nativeSymbol: 'THENA',
    networkCode: 'BSC',
    platform: 'MEME',
    reservedNumber: 10,
    saleRate: 0.8,
    sellFee: 0.01,
    status: 'PUBLISH',
    symbol: 'Thena',
    symbolAddress: '0xf4c8e32eadec4bfe97e0f595add0f4450a863a11',
    totalAmount: 1000000000,
    totalBAmount: 15000,
    tradeLevel: [50, 250, 500],
  },
];
