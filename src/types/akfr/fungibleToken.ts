export interface ApiResponse {
  total: number;
  limit: number;
  cursor: string;
  items: FungibleToken[];
}

export interface FungibleToken {
  interface: string;
  id: string;
  content: Content;
  authorities: any[];
  compression: Compression;
  grouping: any[];
  royalty: Royalty;
  creators: any[];
  ownership: Ownership;
  supply: null | number;
  mutable: boolean;
  burnt: boolean;
  mint_extensions?: MintExtensions;
  token_info: TokenInfo;
}

export interface Content {
  $schema: string;
  json_uri: string;
  files: any[];
  metadata: Record<string, any>;
  links: Record<string, any>;
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
  target: null | string;
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

export interface MintExtensions {
  confidential_transfer_mint: {
    authority: string;
    auto_approve_new_accounts: boolean;
    auditor_elgamal_pubkey: string;
  };
  confidential_transfer_fee_config: {
    authority: string;
    withdraw_withheld_authority_elgamal_pubkey: string;
    harvest_to_mint_enabled: boolean;
    withheld_amount: string;
  };
  transfer_fee_config: {
    transfer_fee_config_authority: string;
    withdraw_withheld_authority: string;
    withheld_amount: number;
    older_transfer_fee: {
      epoch: string;
      maximum_fee: string;
      transfer_fee_basis_points: string;
    };
    newer_transfer_fee: {
      epoch: string;
    };
  };
  metadata_pointer: {
    authority: string;
    metadata_address: string;
  };
  mint_close_authority: {
    close_authority: string;
  };
  permanent_delegate: {
    delegate: string;
  };
  transfer_hook: {
    authority: string;
    program_id: string;
  };
  interest_bearing_config: {
    rate_authority: string;
    initialization_timestamp: number;
    pre_update_average_rate: number;
    last_update_timestamp: number;
    current_rate: number;
  };
  default_account_state: {
    state: string;
  };
  confidential_transfer_account: {
    approved: boolean;
    elgamal_pubkey: string;
    pending_balance_lo: string;
    pending_balance_hi: string;
    available_balance: string;
    decryptable_available_balance: string;
    allow_confidential_credits: boolean;
    allow_non_confidential_credits: boolean;
    pending_balance_credit_counter: number;
    maximum_pending_balance_credit_counter: number;
    expected_pending_balance_credit_counter: number;
    actual_pending_balance_credit_counter: number;
  };
  metadata: {
    update_authority: string;
    mint: string;
    name: string;
    symbol: string;
    uri: string;
    additional_metadata: {
      key: string;
      value: string;
    }[];
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

export interface PriceInfo {
  price_per_token: number;
  total_price: number;
  currency: string;
}
