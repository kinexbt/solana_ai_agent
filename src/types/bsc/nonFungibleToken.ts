// @/types/bsc/nonFungibleToken.ts

export interface NftAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface NftMetadata {
  name: string;
  description: string;
  symbol?: string;
  image: string;
  animation_url?: string;
  external_url?: string;
  attributes?: NftAttribute[];
  token_standard: string;
}

export interface FileInfo {
  uri: string;
  cdn_uri: string;
  mime: string;
}

export interface NftContent {
  $schema: string;
  json_uri: string;
  files: FileInfo[];
  metadata: NftMetadata;
  links: {
    image: string;
    [key: string]: string;
  };
}

export interface Creator {
  address: string;
  verified: boolean;
  share: number;
}

export interface Royalty {
  royalty_model: string;
  target?: string | null;
  percent: number;
  basis_points: number;
  primary_sale_happened: boolean;
  locked: boolean;
}

export interface Ownership {
  frozen: boolean;
  delegated: boolean;
  delegate: string | null;
  ownership_model: string;
  owner: string;
}

export interface NonFungibleToken {
  interface: 'BEP721' | 'BEP1155';
  id: string; // contract address + token ID
  content: NftContent;
  authorities?: any[];
  compression?: {
    eligible: boolean;
    compressed: boolean;
    data_hash: string;
    creator_hash: string;
    asset_hash: string;
    tree: string;
    seq: number;
    leaf_id: number;
  };
  grouping?: any[];
  royalty: Royalty;
  creators: Creator[];
  ownership: Ownership;
  supply?: number | null;
  mutable: boolean;
  burnt: boolean;
  token_info?: {
    token_program: string;
    token_id: string;
    collection_id?: string;
  };
  // BSC-specific fields
  contract_type: 'BEP721' | 'BEP1155';
  token_id: string;
  contract_address: string;
}
