export interface IntegrationTheme {
  primary: string;
  secondary: string;
}

export interface Integration {
  icon: string;
  label: string;
  description?: string;
  theme: IntegrationTheme;
}

export const INTEGRATIONS: Integration[] = [
  {
    icon: 'integrations/fourmeme.svg',
    label: 'four.meme',
    description: 'Discover new tokens, launch tokens',
    theme: {
      primary: '#10B981', // Green
      secondary: '#10B981', // Green
    },
  },
  {
    icon: 'integrations/pancake.svg',
    label: 'Pancake',
    description: 'Swap tokens & DCA, Limit orders',
    theme: {
      primary: '#16A34A', // Green
      secondary: '#22C55E', // Light green
    },
  },
  {
    icon: 'integrations/element_market.svg',
    label: 'Element.market',
    description: 'Explore the best NFT collections',
    theme: {
      primary: '#9333EA', // Purple
      secondary: '#A855F7', // Light purple
    },
  },
  {
    icon: 'integrations/dialect.svg',
    label: 'Dialect',
    description: 'Create and share blinks',
    theme: {
      primary: '#0EA5E9', // Blue
      secondary: '#38BDF8', // Light blue
    },
  },
  {
    icon: 'integrations/dexscreener.svg',
    label: 'DexScreener',
    description: 'Discover trending tokens',
    theme: {
      primary: '#64748B', // Gray
      secondary: '#94A3B8', // Light gray
    },
  },
  {
    icon: 'integrations/defined_fi.svg',
    label: 'Defined Fi',
    description: 'Discover unbiassed trending tokens',
    theme: {
      primary: '#B0EECF', // Orange
      secondary: '#181432', // White
    },
  },
];
