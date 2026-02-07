export interface MerchantData {
  id: string;
  name: string;
  secret_key?: string;
  enabled: boolean;
  created_at: string;
  updated_at?: string;
  router_id?: string;
  router_name?: string;
  username?: string;
  billing_email?: string;
  contact_phone?: string;
  country?: string;
  notes?: string;
  total_orders?: number;
  total_spent?: number;
}

export interface MerchantAccount {
  id: string;
  merchant_id: string;
  currency_code: string;
  balance: string;
  reserved_balance?: string;
  available_balance?: string;
  account_type?: string;
  bank_name?: string;
  account_number_last4?: string;
  is_default: boolean;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MerchantFeeSetting {
  id: string;
  merchant_id: string;
  bank_id?: string;
  bank_name?: string;
  type?: string;
  method_id?: string;
  method_name?: string;
  currency_code?: string;
  min_amount?: string;
  max_amount?: string;
  percentage?: string;
  fixed_fee?: string;
  min_fee?: string;
  max_fee?: string;
  agent_username?: string;
  included_commission_percentage?: string;
  included_commission_fixed?: string;
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RouterBank {
  bank_id: string;
  bank_name: string;
  priority: number;
  currencies?: Array<{ currency_code: string }>;
}

export interface RouterData {
  id: string;
  name: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  banks: RouterBank[];
}
