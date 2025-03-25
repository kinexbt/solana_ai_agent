// @/types/bsc/fungibleToken.ts

export interface PriceInfo {
  price_per_token: number;
  total_price: number;
  currency: string;
}

export interface TokenMetadata {
  description: string;
  name: string;
  symbol: string;
  token_standard: string;
}

export interface FileInfo {
  uri: string;
  cdn_uri: string;
  mime: string;
}

export interface TokenContent {
  $schema: string;
  json_uri?: string;
  files: FileInfo[];
  metadata: TokenMetadata;
  links: {
    image: string;
    [key: string]: string;
  };
}

export interface TokenInfo {
  symbol: string;
  balance: number;
  supply: number;
  decimals: number;
  token_program: string;
  associated_token_address: string;
  price_info: PriceInfo;
}

export interface FungibleToken {
  interface: 'FungibleToken' | 'FungibleAsset';
  id: string; // contract address
  content: TokenContent;
  authorities?: any[];
  ownership?: {
    frozen?: boolean;
    delegated?: boolean;
    delegate?: string | null;
    ownership_model: string;
    owner: string;
  };
  token_info: TokenInfo;
  // Additional BSC-specific fields
  contract_type?: 'BEP20';
  verified?: boolean;
}
