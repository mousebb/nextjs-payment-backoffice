// 页面视图映射配置
// 所有页面类型、权限、组件都在这里统一管理

import PaymentDetail from '@/components/PaymentDetail';
import WithdrawalDetail from '@/components/WithdrawalDetail';
import MerchantList from '@/components/MerchantList';
import MerchantDetail from '@/components/MerchantDetail';
import PaymentList from '@/components/_PaymentList';
import RefundList from '@/components/_RefundList';
import WithdrawalList from '@/components/_WithdrawalList';
import GatewayList from '@/components/GatewayList';
import RouterList from '@/components/RouterList';
import BankList from '@/components/BankList';
import CurrencyList from '@/components/CurrencyList';
import StatusCodeList from '@/components/StatusCodeList';
import GatewayStatusCodeList from '@/components/GatewayStatusCodeList';
import MerchantAccountList from '@/components/MerchantAccountList';
import AccessLogsList from '@/components/AccessLogsList';
import CommissionLogsList from '@/components/CommissionLogsList';
import AccountTransactionsList from '@/components/AccountTransactionsList';
import RoleList from '@/components/RoleList';
import PermissionList from '@/components/PermissionList';
import UserList from '@/components/UserList';
import RuleList from '@/components/RuleList';
import TransactionRuleList from '@/components/TransactionRuleList';
import TransactionMethodList from '@/components/TransactionMethodList';
import SettlementMethodsList from '@/components/SettlementMethodsList';
import DashboardContent from '@/components/DashboardContent';
import NotificationList from '@/components/NotificationList';
import DailyStatement from '@/components/DailyStatement';
import MonthlyStatement from '@/components/MonthlyStatement';
import CommissionSettlementsList from '@/components/CommissionSettlementsList';
import type { FC } from 'react';

// 明确类型，避免 TS 推断所有组件都需要 onPaymentSelect
export type ViewMapType = {
  [key: string]: {
    permission: [string | null, string | null];
    component: FC<any>;
  };
};

export const viewMap: ViewMapType = {
  dashboard: {
    permission: [null, null],
    component: DashboardContent,
  },
  'payment-detail': {
    permission: ['payment', 'view'],
    component: PaymentDetail,
  },
  'withdrawal-detail': {
    permission: ['withdrawal', 'view'],
    component: WithdrawalDetail,
  },
  'merchant-list': {
    permission: ['merchant', 'view'],
    component: MerchantList,
  },
  'merchant-detail': {
    permission: ['merchant', 'view'],
    component: MerchantDetail,
  },
  'payment-list': {
    permission: ['payment', 'view'],
    component: PaymentList,
  },
  'refund-list': {
    permission: ['refund', 'view'],
    component: RefundList,
  },
  'withdrawal-list': {
    permission: ['withdrawal', 'view'],
    component: WithdrawalList,
  },
  'gateway-list': {
    permission: ['gateway', 'view'],
    component: GatewayList,
  },
  routers: {
    permission: ['router', 'view'],
    component: RouterList,
  },
  banks: {
    permission: ['bank', 'view'],
    component: BankList,
  },
  currencies: {
    permission: ['currency', 'view'],
    component: CurrencyList,
  },
  'status-codes': {
    permission: ['status_code', 'view'],
    component: StatusCodeList,
  },
  'gateway-status-codes': {
    permission: ['gateway_status_code', 'view'],
    component: GatewayStatusCodeList,
  },
  'merchant-accounts': {
    permission: ['merchant_account', 'view'],
    component: MerchantAccountList,
  },
  'account-transactions': {
    permission: ['merchant_account_transaction', 'view'],
    component: AccountTransactionsList,
  },
  'access-logs': {
    permission: ['access_log', 'view'],
    component: AccessLogsList,
  },
  roles: {
    permission: ['role', 'edit'],
    component: RoleList,
  },
  permissions: {
    permission: ['permission', 'view'],
    component: PermissionList,
  },
  users: {
    permission: ['user', 'view'],
    component: UserList,
  },
  'rule-list': {
    permission: ['rule', 'view'],
    component: RuleList,
  },
  'transaction-rules': {
    permission: ['transaction_rule', 'view'],
    component: TransactionRuleList,
  },
  'transaction-methods': {
    permission: ['transaction_method', 'view'],
    component: TransactionMethodList,
  },
  'settlement-methods': {
    permission: ['settlement_method', 'view'],
    component: SettlementMethodsList,
  },
  notifications: {
    permission: ['notification', 'view'],
    component: NotificationList,
  },
  'statements-daily': {
    permission: ['statement', 'view'],
    component: DailyStatement,
  },
  'statements-monthly': {
    permission: ['statement', 'view'],
    component: MonthlyStatement,
  },
  'commission-logs': {
    permission: ['commission_log', 'view'],
    component: CommissionLogsList,
  },
  settlement: {
    permission: ['commission_settlement', 'view'],
    component: CommissionSettlementsList,
  },
};
