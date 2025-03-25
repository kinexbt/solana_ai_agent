import { z } from 'zod';

export interface ToolActionResult {
  result?: string;
  message: string;
  addResultUtility?: (result: any) => void;
}

export type ToolUpdate = {
  type: string;
  toolCallId: string;
  result: string;
};

export const publicKeySchema = z
  .string()
  .regex(
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    'Invalid Solana address format. Must be a base58 encoded string.',
  )
  .describe('A valid Solana wallet address. (base58 encoded)');

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const addressSchema = z
  .string()
  .regex(
    ADDRESS_REGEX,
    'Invalid address format. Must be a valid Ethereum/BSC address.',
  )
  .describe('A valid Ethereum/BSC wallet address.');

/**
 * Checks if a string is a valid Ethereum/BSC address
 * @param address The address string to validate
 * @returns Boolean indicating if the address is valid
 */
export function isValidAddress(address: string): boolean {
  return ADDRESS_REGEX.test(address);
}

/**
 * Normalizes an address by converting it to lowercase
 * Useful for consistent address comparison
 * @param address The address to normalize
 * @returns Normalized address string
 */
export function normalizeAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new Error('Cannot normalize invalid address');
  }
  return address.toLowerCase();
}

/**
 * Creates a checksummed address according to EIP-55
 * @param address The address to convert to checksum format
 * @returns Checksummed address
 */
export function toChecksumAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new Error('Cannot convert invalid address to checksum format');
  }

  // Implementation of EIP-55 checksum
  // In a real implementation, you would use ethers.js or a similar library
  // This is just a placeholder
  return address;
}
