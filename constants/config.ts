export const CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
};

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 1000;

export const PAYMENT_STATUS = {
  pending: 'pending',
  success: 'success',
  failed: 'failed',
  submitted: 'submitted',
  processing: 'processing',
  cancelled: 'cancelled',
  refunded: 'refunded',
  expired: 'expired',
  unknown: 'unknown',
};

export enum ENUM_CONFIG {
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
  ASC = 'ASC',
  DESC = 'DESC',
}

export const API_ACTION_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  // PATCH: 'PATCH',
  DELETE: 'DELETE',
};

export const WEB_ACTION_METHODS = {
  VIEW: 'VIEW',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
};

export const ALL_ACTION_METHODS = {
  ...API_ACTION_METHODS,
  ...WEB_ACTION_METHODS,
} as const;

export enum ACCESS_LOG_TYPE {
  API = 'API',
  WEB = 'WEB',
  // MOBILE = 'MOBILE',
  // TERMINAL = 'TERMINAL',
  // OTHER = 'OTHER'
}

export const ROLES_ENUM = {
  ADMIN: 'admin',
  OPERATION: 'operation',
  FINANCE: 'finance',
  MERCHANT: 'merchant',
  AGENT: 'agent',
} as const;

export const ADMIN_PERMISSIONS = [
  'all:view',
  'all:create',
  'all:edit',
  'all:delete',
];
export const MERCHANT_PERMISSIONS = ['payment:create'];
export const FINANCE_PERMISSIONS = [
  'statement:view',
  'statement:create',
  'statement:edit',
  'statement:delete',
];
export const OPERATION_PERMISSIONS = [
  'merchant:view',
  'merchant:create',
  'merchant:edit',
  'merchant:delete',
];
export const ALL_MERCHANTS_VIEW_PERMISSIONS = [
  'all:view',
  'all_merchants:view',
];
export const AGENT_PERMISSIONS = [
  'commission_log:view',
  'commission_settlement:view',
  'commission_settlement:create',
];

export enum GATEWAY_TYPE {
  PSP = 'psp',
  BANK = 'bank',
  CRYPTO = 'crypto',
  OTHER = 'other',
}

export enum TRANSACTION_TYPE {
  PAYMENT = 'payment',
  REFUND = 'refund',
  WITHDRAWAL = 'withdrawal',
  CHARGEBACK = 'chargeback',
  // Add other source types as your system evolves
}

export enum TRANSACTION_SOURCE_TYPE {
  PAYMENT = 'payment', // in  （资金进入商户）
  REFUND = 'refund', // out （顾客退款退回给商户）
  WITHDRAWAL = 'withdrawal', // out （商户提现）
  FEE = 'fee', // out （平台扣除费用）
  CHARGEBACK = 'chargeback', // out （拒付扣款）
  RELEASE = 'release', // in  （解冻返还）
  RESERVE = 'reserve', // out （预留商户余额）
  ADJUSTMENT = 'adjustment', // in/out （调整商户余额）out用负数
}

export enum SOURCE_ACTION {
  CREDIT = 'credit', // payment,用户付款成功，平台将资金入账给商户（主余额增加）
  DEBIT = 'debit', // refund, chargeback, payment成功改失败，或商户发起退款/拒付，平台从商户账户中扣款（主余额减少）
  FREEZE = 'freeze', // withdrawal, 商户发起提现，主余额减少，reserved 增加 （主余额减少）
  RESERVE_DEBIT = 'reserve_debit', // withdrawal, 	提现成功，reserved 实际扣除 （主余额不变）
  RESERVE_CREDIT = 'reserve_credit', // withdrawal, 商户提现失败，平台将资金入账给商户（主余额增加）
  UNFREEZE = 'unfreeze', // release, 释放 reserved 资金回主余额 （主余额增加）
}

export enum ENABLED_STATUS {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

export enum ACTIVE_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FROZEN = 'frozen',
  CLOSED = 'closed',
}

export enum SETTLEMENT_METHOD_TYPE {
  BANK = 'bank',
  CRYPTO = 'crypto',
  OTHER = 'other',
}

export enum SETTLEMENT_CYCLE {
  MANUAL = 'manual',
  T0 = 'T0',
  D0 = 'D0',
  T1 = 'T1',
  T15 = 'T15',
  MONTHLY = 'monthly',
}

export const VIEW_LOG_WHITELIST = [
  'payment-detail',
  'withdrawal-detail',
  'merchant-detail',
  'statements-daily',
  'statements-monthly',
];

// 通用 badge 颜色列表（用于 methods/banks/currencies 等彩色 badge）
export const COLOR_BADGE_LIST = [
  'bg-sky-100 text-sky-800 border-sky-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-lime-100 text-lime-800 border-lime-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-gray-100 text-gray-800 border-gray-200',
];

export const DATE_TIME_FORMATS = [
  'yyyy-MM-dd HH:mm:ss', // 标准格式
  'yyyyMMddHHmmss', // 紧凑格式
  'yyyy-MM-ddTHH:mm:ssZ', // ISO 格式
  'yyyy/MM/dd HH:mm:ss', // 斜杠分隔
  'yyyy.MM.dd HH:mm:ss', // 点号分隔
  'MM/dd/yyyy HH:mm:ss', // 美式格式
  'dd.MM.yyyy HH:mm:ss', // 欧式格式
  'yyyy年MM月dd日 HH时mm分ss秒', // 中文格式
  'ddd, dd MMM yyyy HH:mm:ss', // 英文含星期
  'ddd, dd MMM yyyy HH:mm:ss ZZ', // RFC2822
];
