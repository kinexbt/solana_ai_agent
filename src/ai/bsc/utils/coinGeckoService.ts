import axios from 'axios';

// Base URL for CoinGecko API
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// Fetch basic token info (price, market cap, volume, etc.)
export const fetchTokenInfo = async (tokenId: string) => {
  const response = await axios.get(`${COINGECKO_API_URL}/coins/${tokenId}`);
  return response.data;
};

// Fetch historical data (prices over time)
export const fetchHistoricalData = async (
  tokenId: string,
  days: number = 30,
) => {
  const response = await axios.get(
    `${COINGECKO_API_URL}/coins/${tokenId}/market_chart`,
    {
      params: { vs_currency: 'usd', days: days },
    },
  );
  return response.data;
};

// Fetch analysis and stats data (tickers, community, developer, etc.)
export const fetchAnalysisAndStats = async (tokenId: string) => {
  const response = await axios.get(
    `${COINGECKO_API_URL}/coins/${tokenId}/contract`,
  );
  return response.data;
};
