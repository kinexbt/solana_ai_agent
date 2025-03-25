export interface Suggestion {
  id: string;
  title: string;
  subtitle: string;
}

export const SUGGESTIONS: Suggestion[] = [
  {
    id: 'launch-token',
    title: 'Launch a new token',
    subtitle: 'deploy a new token on four.meme',
  },
  {
    id: 'swap-bnb-usdc',
    title: 'Swap 1 BNB for USDC',
    subtitle: 'using Pancake to swap on BSC',
  },
  {
    id: 'bsc-trends',
    title: "What's trending on BSC?",
    subtitle: 'find the current market trends',
  },
  {
    id: 'price-feed',
    title: "What's the price of BNB?",
    subtitle: 'find the current price of BNB',
  },
  {
    id: 'top-gainers-last-24h',
    title: 'Top gainers in the last 24h',
    subtitle: 'find the top gainers in the last 24 hours',
  },
  {
    id: 'check-my-wallet',
    title: 'Check my wallet',
    subtitle: 'check the portfolio of your wallet',
  },
  // {
  //   id: 'sell-everything-buy-neur',
  //   title: 'Sell everything and buy $NEUR',
  //   subtitle: 'swap all your tokens for $NEUR',
  // },
  // {
  //   id: 'phantom-updates',
  //   title: 'Any updates from @phantom recently?',
  //   subtitle: 'summarize the latest tweets from @phantom',
  // },
  // {
  //     id: "toly-updates",
  //     title: "What has toly been doing recently?",
  //     subtitle: "summarize his recent tweets"
  // },
];

export function getRandomSuggestions(count: number): Suggestion[] {
  // Ensure we don't request more items than available
  const safeCount = Math.min(count, SUGGESTIONS.length);
  const startIndex = Math.floor(Date.now() / 1000) % SUGGESTIONS.length;

  // Create a rotated copy of the array starting from startIndex
  const rotatedSuggestions = [
    ...SUGGESTIONS.slice(startIndex),
    ...SUGGESTIONS.slice(0, startIndex),
  ];

  // Return only the first safeCount items
  return rotatedSuggestions.slice(0, safeCount);
}
