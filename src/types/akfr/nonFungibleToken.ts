export interface NonFungibleApiResponse {
  items: NonFungibleToken[];
}

export interface NonFungibleToken {
  interface: string;
  id: string;
  content: NonFungibleContent;
  authorities: Authority[];
  compression: Compression;
  grouping: Grouping[];
  royalty: Royalty;
  creators: Creator[];
  ownership: Ownership;
  supply: Supply | null;
  mutable: boolean;
  burnt: boolean;
  inscription: Inscription;
  spl20: Spl20;
}

export interface NonFungibleContent {
  $schema: string;
  json_uri: string;
  files: File[];
  metadata: Metadata;
  links: Record<string, string>;
}

export interface File {
  uri: string;
  cdn_uri: string;
  mime: string;
}

export interface Metadata {
  attributes: Attribute[];
  description: string;
  name: string;
  symbol: string;
}

export interface Attribute {
  value: string;
  trait_type: string;
}

export interface Authority {
  address: string;
  scopes: string[];
}

export interface CollectionMetadata {
  name: string;
  symbol: string;
  image: string;
  description: string;
  external_url: string;
}

export interface Grouping {
  group_key: string;
  group_value: string;
  collection_metadata: CollectionMetadata;
}

export interface Creator {
  address: string;
  share: number;
  verified: boolean;
}

export interface Supply {
  print_max_supply: number;
  print_current_supply: number;
  edition_nonce: number;
}

export interface Inscription {
  order: number;
  size: number;
  contentType: string;
  encoding: string;
  validationHash: string;
  inscriptionDataAccount: string;
}
export interface Spl20 {
  p: string;
  op: string;
  tick: string;
  amt: string;
}
export interface Compression {
  eligible: boolean;
  compressed: boolean;
  data_hash: string;
  creator_hash: string;
  asset_hash: string;
  tree: string;
  seq: number;
  leaf_id: number;
}
export interface Royalty {
  royalty_model: string;
  target: string | null;
  percent: number;
  basis_points: number;
  primary_sale_happened: boolean;
  locked: boolean;
}
export interface Ownership {
  frozen: boolean;
  delegated: boolean;
  delegate: null | string;
  ownership_model: string;
  owner: string;
}
