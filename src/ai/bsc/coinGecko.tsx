import { z } from 'zod';

// You can create your own component for displaying token info
import Chart from './utils/chart';
import {
  fetchAnalysisAndStats,
  fetchHistoricalData,
  fetchTokenInfo,
} from './utils/coinGeckoService';
import TokenInfo from './utils/tokenInfo';

// You can create your own component for displaying chart

export const coinGeckoTools = {
  getTokenInfo: {
    displayName: '💰 Token Info',
    isCollapsible: true,
    isExpandedByDefault: true,
    description: 'Get information about a specific token on CoinGecko',
    parameters: z.object({
      tokenId: z.string().describe('The token id from CoinGecko'), // This is the CoinGecko token ID (e.g., 'bitcoin', 'ethereum')
    }),
    requiredEnvVars: ['COINGECKO_API_KEY'], // If needed for CoinGecko API
    execute: async ({ tokenId }: { tokenId: string }) => {
      try {
        const tokenInfo = await fetchTokenInfo(tokenId);
        const historicalData = await fetchHistoricalData(tokenId);
        const analysisStats = await fetchAnalysisAndStats(tokenId);

        return {
          success: true,
          data: {
            tokenInfo,
            historicalData,
            analysisStats,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to fetch token info',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: {
          tokenInfo: any;
          historicalData: any;
          analysisStats: any;
        };
        error?: string;
      };

      if (!typedResult.success) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-destructive/5 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-destructive">
                Error: {typedResult.error}
              </p>
            </div>
          </div>
        );
      }

      if (!typedResult.data) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">No data found</p>
            </div>
          </div>
        );
      }

      const { tokenInfo, historicalData, analysisStats } = typedResult.data;

      return (
        <div className="space-y-2">
          {/* Render Token Information */}
          <TokenInfo info={tokenInfo} />

          {/* Render Historical Data */}
          <div>
            <h3>Historical Data (Last 30 Days)</h3>
            {/* Display chart or stats from historicalData */}
            <Chart data={historicalData.prices} />{' '}
            {/* You can replace it with your own chart component */}
          </div>

          {/* Render Analysis & Stats */}
          <div>
            <h3>Analysis & Stats</h3>
            <p>Tickers: {analysisStats.tickers.length}</p>
            <p>Community Data: {JSON.stringify(analysisStats.communityData)}</p>
            <p>Developer Data: {JSON.stringify(analysisStats.developerData)}</p>
          </div>
        </div>
      );
    },
  },

  getTokenHistoricalData: {
    displayName: '📊 Token Historical Data',
    isCollapsible: true,
    isExpandedByDefault: false,
    description: 'Get historical data for a specific token',
    parameters: z.object({
      tokenId: z.string().describe('The token id from CoinGecko'),
      days: z
        .number()
        .default(30)
        .describe('Number of days for historical data (default is 30)'),
    }),
    requiredEnvVars: ['COINGECKO_API_KEY'],
    execute: async ({ tokenId, days }: { tokenId: string; days: number }) => {
      try {
        const historicalData = await fetchHistoricalData(tokenId, days);
        return {
          success: true,
          data: historicalData,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to fetch historical data',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: any;
        error?: string;
      };

      if (!typedResult.success) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-destructive/5 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-destructive">
                Error: {typedResult.error}
              </p>
            </div>
          </div>
        );
      }

      if (!typedResult.data?.prices?.length) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                No historical data found
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          <h3>Historical Data</h3>
          {/* Display chart with prices */}
          <Chart data={typedResult.data.prices} />
        </div>
      );
    },
  },
};
