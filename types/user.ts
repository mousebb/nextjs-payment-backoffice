export interface User {
  id: string;
  username: string;
  email?: string;
  created_at?: string;
  accessible_merchant_ids: string[] | string | null;
  roles: string[];
  permissions: string[];
  ip_address: string;
  // data_time_format?: string;
  metadata?: Record<string, any>;
}
