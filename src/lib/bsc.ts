import axios from 'axios';

// Constants
const BNS_RESOLVER_API = 'https://api.bnbdomains.io/resolver';

export class BscUtils {
  /**
   * Resolves a BNB domain (.bnb) to its wallet address
   * @param domain Domain in format example.bnb
   * @returns The wallet address or null if not found
   */
  static async resolveDomainToAddress(domain: string): Promise<string | null> {
    try {
      if (!domain.endsWith('.bnb')) {
        throw new Error('Invalid BSC domain format. Must end with .bnb');
      }

      const response = await axios.get(`${BNS_RESOLVER_API}/${domain}`);

      if (response.data && response.data.address) {
        return response.data.address;
      }

      return null;
    } catch (error) {
      console.error('Error resolving BSC domain:', error);
      throw new Error(
        `Failed to resolve domain: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validates a BSC address
   * @param address BSC wallet address to validate
   * @returns Boolean indicating if address is valid
   */
  static isValidAddress(address: string): boolean {
    // Basic validation for BSC address
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Gets the current BNB price in USD
   * @returns Current BNB price
   */
  static async getBnbPrice(): Promise<number> {
    try {
      const response = await axios.get(
        'https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT',
      );
      return parseFloat(response.data.price);
    } catch (error) {
      console.error('Error getting BNB price:', error);
      throw new Error(
        `Failed to get BNB price: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
