export const API_ROUTES = {
  LOGIN_AUTH: '/api/v1/auth/login',
  LOGOUT_AUTH: '/api/v1/auth/logout',
  REFRESH_AUTH: '/api/v1/auth/refresh',
  USER_INFO: '/api/v1/auth/user',

  MERCHANTS: '/api/v1/private/merchants',
  MERCHANTS_ACCESSIBLE: '/api/v1/private/merchants/accessible',
  MERCHANT_ACCOUNTS: '/api/v1/private/merchant-accounts',
  MERCHANT_DETAILS: '/api/v1/private/merchants/:id',
  MERCHANT_REGENERATE_SECRET_KEY:
    '/api/v1/private/merchants/:id/regenerate-secret',
  MERCHANT_ACCOUNTS_DETAILS: '/api/v1/private/merchant-accounts/:id',
  MERCHANT_FEE_SETTINGS: '/api/v1/private/merchant-fee-settings',
  MERCHANT_FEE_SETTINGS_ID: '/api/v1/private/merchant-fee-settings/:id',
  MERCHANT_SUMMARY: '/api/v1/private/merchants/summary',
  MERCHANT_ACCOUNTS_TRANSACTIONS:
    '/api/v1/private/merchant-accounts/transactions',
  MERCHANTS_BY_AGENT: '/api/v1/private/merchants/agent',

  GATEWAYS_DETAILS: '/api/v1/private/gateways/:id',
  GATEWAYS: '/api/v1/private/gateways',

  GATEWAY_STATUS_CODES: '/api/v1/private/gateway-status-codes',
  GATEWAY_STATUS_CODES_BATCH_DELETE:
    '/api/v1/private/gateway-status-codes/batch-delete',
  GATEWAY_STATUS_CODES_BATCH_UPLOAD:
    '/api/v1/private/gateway-status-codes/batch-upload',

  ROUTERS: '/api/v1/private/routers',
  ROUTERS_DETAILS: '/api/v1/private/routers/:id',

  PAYMENTS: '/api/v1/private/payments',
  PAYMENT_SUMMARY: '/api/v1/private/payments/summary',
  PAYMENT_DETAILS: '/api/v1/private/payments/:id',
  // PAYMENT_SUMMARY_DETAILS: '/api/v1/private/payments/summary/:id',
  TRANSACTION_METHODS: '/api/v1/private/transaction-methods',
  PAYMENT_LOGS: '/api/v1/private/payment-logs',
  PAYMENT_STATUS_UPDATE: '/api/v1/private/payment-status/update',

  REFUNDS: '/api/v1/private/refunds',
  REFUND_STATUS_UPDATE: '/api/v1/private/refund-status/update',

  WITHDRAWALS: '/api/v1/private/withdrawals',
  WITHDRAWAL_SUMMARY: '/api/v1/private/withdrawals/summary',
  WITHDRAWAL_DETAILS: '/api/v1/private/withdrawals/:id',
  WITHDRAWAL_STATUS_UPDATE: '/api/v1/private/withdrawal-status/update',

  BANKS: '/api/v1/private/banks',
  BANKS_ACCESSIBLE: '/api/v1/private/banks/accessible',

  CURRENCIES: '/api/v1/private/currencies',
  STATUS_CODES: '/api/v1/private/status-codes',

  ACCESS_LOGS: '/api/v1/private/access-logs',
  ROLES: '/api/v1/private/roles',
  RULES: '/api/v1/private/rules',
  TRANSACTION_RULES: '/api/v1/private/transaction-rules',

  PERMISSIONS: '/api/v1/private/permissions',
  PERMISSIONS_GROUPED: '/api/v1/private/permissions/grouped',

  USERS: '/api/v1/private/users',
  AGENTS: '/api/v1/private/users/agents',
  USER_LINK_MERCHANTS: '/api/v1/private/users/:id/link-merchants',

  STATUS_LOGS: '/api/v1/private/status-logs',

  GENERAL_LOGS: '/api/v1/private/general-logs/:source_type/:source_id',

  NOTIFICATIONS: '/api/v1/private/notifications',
  NOTIFICATIONS_DETAILS: '/api/v1/private/notifications/:id',
  NOTIFICATIONS_READ: '/api/v1/private/notifications/:id/read',
  NOTIFICATION_BROADCAST: '/api/v1/private/notifications/broadcast',
  NOTIFICATION_USER: '/api/v1/private/notifications/user',
  NOTIFICATION_PERSONAL: '/api/v1/private/notifications/personal',
  NOTIFICATIONS_DELETE_EXPIRED: '/api/v1/private/notifications/expired',

  NOTIFICATION_SSE: '/api/v1/private/notifications/sse',
  NOTIFICATION_UNREAD_SUMMARY: '/api/v1/private/notifications/unread-summary',

  TWO_FACTOR_GENERATE: '/api/v1/private/2fa/generate',
  TWO_FACTOR_VERIFY: '/api/v1/private/2fa/verify',

  STATEMENT_DAILY: '/api/v1/private/statement/daily',
  STATEMENT_MONTHLY: '/api/v1/private/statement/monthly',
  STATEMENT_INCOME: '/api/v1/private/statement/income',

  COMMISSION_LOGS: '/api/v1/private/commission/logs',
  COMMISSION_SETTLEMENTS: '/api/v1/private/commission/settlements',
  COMMISSION_SETTLEMENTS_DETAILS: '/api/v1/private/commission/settlements/:id',

  SETTLEMENT_METHODS: '/api/v1/private/settlement-methods',
  SETTLEMENT_METHODS_DETAILS: '/api/v1/private/settlement-methods/:id',
};
