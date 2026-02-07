'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ClockIcon,
  CreditCardIcon,
  ClipboardDocumentIcon,
  CheckIcon as ClipboardCheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PencilIcon,
  UserIcon,
  PaperAirplaneIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import {
  authFetch,
  formatDateByUser,
  maskedLongID,
  recordAccessLog,
} from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Tab } from '@headlessui/react';
import ActionsDropdown, { ActionItem } from './ActionsDropdown';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelTextarea from './FloatingLabelTextarea';
import ToastNotify from './ToastNotify';
import { usePermission } from '@/hooks/usePermission';
import UpdateTransactionStatusModal from './UpdateTransactionStatusModal';
import { AmountStyleBadge, TransactionStatusBadge } from './Common';
import { TRANSACTION_TYPE, DEFAULT_PAGE_SIZE } from '@/constants/config';
import LocalPagingList from './LocalPagingList';
import CopyButton from './CopyButton';
import AccountDetails from './AccountDetails';

// Helper function to format keys (e.g., user_id -> User Id)
const formatMetadataKey = (key: string): string => {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface MetadataDisplayProps {
  data: any;
  level?: number;
}

const MetadataDisplay: React.FC<MetadataDisplayProps> = ({
  data,
  level = 0,
}) => {
  // Case 1: Data is an array
  if (Array.isArray(data)) {
    return (
      <div className="array-items-container space-y-px">
        {data.map((item, index) => (
          <div key={index} className="array-item">
            <MetadataDisplay data={item} level={level} />
          </div>
        ))}
      </div>
    );
  }
  // Case 2: Data is an object (but not an array)
  else if (typeof data === 'object' && data !== null) {
    return (
      <div className="object-key-values-container space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} style={{ marginLeft: `${level * 20}px` }}>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {formatMetadataKey(key)}:
            </span>
            {typeof value === 'object' && value !== null ? (
              <MetadataDisplay data={value} level={level + 1} />
            ) : (
              <span className="text-gray-900 dark:text-gray-100 text-sm ml-2">
                {String(value)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }
  // Case 3: Data is a primitive value
  else {
    return (
      <span
        className="text-gray-900 dark:text-gray-100 text-sm"
        style={{ marginLeft: `${level * 20}px` }}
      >
        {String(data)}
      </span>
    );
  }
};

interface PaymentDetailData {
  id: string;
  order_id: string;
  merchant_id: string;
  merchant_name: string;
  amount: string;
  currency_code: string;
  method: string;
  channel: string;
  status: string;
  bank_tx_id: string;
  return_url: string;
  notify_url: string;
  metadata: {
    user_id?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

interface PaymentLog {
  id: string;
  direction: string;
  method: string;
  status_code: number;
  created_at: string;
}

interface StatusLog {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  created_at: string;
}

interface PaymentDetailProps {
  paymentId: string;
  onBack: () => void;
}

const PaymentDetail = ({ paymentId, onBack }: PaymentDetailProps) => {
  const t = useTranslations();
  const { logout, user } = useAuth();
  const [payment, setPayment] = useState<PaymentDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payment' | 'status' | 'refund'>(
    'payment'
  );
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [isStatusLogsLoading, setIsStatusLogsLoading] = useState(true);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateReason, setUpdateReason] = useState('');
  const [updateSendNotification, setUpdateSendNotification] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { can } = usePermission();
  const [refundsPendingCount, setRefundsPendingCount] = useState(0);
  const [refundsSuccessCount, setRefundsSuccessCount] = useState(0);
  const [refundsSubmittedCount, setRefundsSubmittedCount] = useState(0);
  const [refundsSubmittedAmount, setRefundsSubmittedAmount] = useState(0);
  const [refundsSuccessAmount, setRefundsSuccessAmount] = useState(0);
  const [refundsPendingAmount, setRefundsPendingAmount] = useState(0);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [isRefundsLoading, setIsRefundsLoading] = useState(false);
  // 新增 refund 状态更新相关 state
  const [isUpdateRefundStatusOpen, setIsUpdateRefundStatusOpen] =
    useState(false);
  const [currentRefund, setCurrentRefund] = useState<any>(null);
  const [refundUpdateStatus, setRefundUpdateStatus] = useState('');
  const [refundUpdateReason, setRefundUpdateReason] = useState('');
  const [refundUpdateSendNotification, setRefundUpdateSendNotification] =
    useState(true);
  const [isUpdatingRefundStatus, setIsUpdatingRefundStatus] = useState(false);
  const [accountRefreshTrigger, setAccountRefreshTrigger] = useState(0);

  const handleCopy = async (textToCopy: string, source: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(source); // Use a generic identifier or the text itself if unique
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // 数据获取函数
  const fetchPaymentDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authFetch(
        CONFIG.API_BASE_URL +
          API_ROUTES.PAYMENT_DETAILS.replace(':id', paymentId)
      );
      if (!response) {
        logout();
        return;
      }
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to fetch payment details' }));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }
      const result = await response.json();
      setPayment(result);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsLogsLoading(true);
    try {
      const res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.PAYMENT_LOGS + `/${paymentId}`
      );
      if (res && res.ok) {
        const result = await res.json();
        setLogs(result.logs || []);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const fetchStatusLogs = async () => {
    setIsStatusLogsLoading(true);
    try {
      const params = new URLSearchParams({
        source_type: 'payment',
        source_id: paymentId,
      });
      const res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.STATUS_LOGS + `?${params.toString()}`
      );
      if (res && res.ok) {
        const result = await res.json();
        setStatusLogs(result.logs || []);
      } else {
        setStatusLogs([]);
      }
    } catch {
      setStatusLogs([]);
    } finally {
      setIsStatusLogsLoading(false);
    }
  };

  // 拉取 refunds 数据
  const fetchRefunds = async () => {
    if (!payment?.id) return;
    setIsRefundsLoading(true);
    try {
      const params = new URLSearchParams({
        payment_id: payment.id,
        order_by: 'updated_at',
      });
      const res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.REFUNDS + `?${params.toString()}`
      );
      if (res && res.ok) {
        const result = await res.json();
        const refunds: any[] = Array.isArray(result.data) ? result.data : [];
        setRefunds(refunds);
        const pendingCount = refunds.filter(
          (r: any) => r.status === 'pending'
        ).length;
        const submittedCount = refunds.filter(
          (r: any) => r.status === 'submitted'
        ).length;
        const successCount = refunds.filter(
          (r: any) => r.status === 'success'
        ).length;
        const submittedAmount = refunds
          .filter((r: any) => r.status === 'submitted')
          .reduce(
            (sum: number, r: any) => sum + (parseFloat(r.amount) || 0),
            0
          );
        const pendingAmount = refunds
          .filter((r: any) => r.status === 'pending')
          .reduce(
            (sum: number, r: any) => sum + (parseFloat(r.amount) || 0),
            0
          );
        const successAmount = refunds
          .filter((r: any) => r.status === 'success')
          .reduce(
            (sum: number, r: any) => sum + (parseFloat(r.amount) || 0),
            0
          );
        setRefundsPendingCount(pendingCount);
        setRefundsSubmittedCount(submittedCount);
        setRefundsSuccessCount(successCount);
        setRefundsSuccessAmount(successAmount);
        setRefundsPendingAmount(pendingAmount);
        setRefundsSubmittedAmount(submittedAmount);
      } else {
        setRefunds([]);
        setRefundsPendingCount(0);
        setRefundsSuccessCount(0);
        setRefundsSubmittedCount(0);
        setRefundsSuccessAmount(0);
        setRefundsPendingAmount(0);
        setRefundsSubmittedAmount(0);
      }
    } catch {
      setRefunds([]);
      setRefundsPendingCount(0);
      setRefundsSuccessCount(0);
      setRefundsSubmittedCount(0);
      setRefundsSuccessAmount(0);
      setRefundsPendingAmount(0);
      setRefundsSubmittedAmount(0);
    } finally {
      setIsRefundsLoading(false);
    }
  };
  useEffect(() => {
    fetchRefunds();
  }, [payment?.id]);

  // 刷新本页所有数据
  const handleRefresh = async () => {
    await fetchPaymentDetail();
    await fetchLogs();
    await fetchStatusLogs();
    await fetchRefunds();
  };

  useEffect(() => {
    fetchPaymentDetail();
  }, [paymentId, logout]);

  useEffect(() => {
    fetchLogs();
  }, [paymentId]);

  useEffect(() => {
    fetchStatusLogs();
  }, [paymentId]);

  // 更新支付状态
  const handleUpdateStatus = async () => {
    if (!updateStatus) return;
    setIsUpdatingStatus(true);
    const startTime = Date.now();
    let res: any = null;
    let submissionData: any = {};
    try {
      submissionData = {
        payment_id: paymentId,
        new_status: updateStatus,
        reason: updateReason,
        send_notification: updateSendNotification,
      };
      res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.PAYMENT_STATUS_UPDATE,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData),
        }
      );
      if (res && res.ok) {
        const result = await res.json();
        if (result.notification_sent === true) {
          ToastNotify.success(result.message || 'Status updated successfully');
        } else {
          ToastNotify.warn(
            result.message ||
              'Status updated successfully, but notification not sent'
          );
        }
        setIsUpdateStatusOpen(false);
        setUpdateStatus('');
        setUpdateReason('');
        setUpdateSendNotification(true);
        // 刷新
        await handleRefresh();
      } else {
        const err = await res?.json().catch(() => ({}));
        ToastNotify.error(err.message || 'Failed to update status');
      }
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to update status');
    } finally {
      await recordAccessLog({
        path: '/payments/:id/status',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.UPDATE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify(submissionData),
        response: JSON.stringify(res),
        duration_ms: Date.now() - startTime,
      });
      setIsUpdatingStatus(false);
    }
  };

  // 更新 refund 状态
  const handleUpdateRefundStatus = async () => {
    if (!currentRefund || !refundUpdateStatus) return;
    setIsUpdatingRefundStatus(true);
    try {
      const res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.REFUND_STATUS_UPDATE,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refund_id: currentRefund.id,
            new_status: refundUpdateStatus,
            reason: refundUpdateReason,
            send_notification: refundUpdateSendNotification,
          }),
        }
      );
      if (res && res.ok) {
        const result = await res.json();
        ToastNotify.success(
          result.message || 'Refund status updated successfully'
        );
        setIsUpdateRefundStatusOpen(false);
        setCurrentRefund(null);
        setRefundUpdateStatus('');
        setRefundUpdateReason('');
        setRefundUpdateSendNotification(true);
        // 刷新 refund logs
        fetchRefunds();

        setAccountRefreshTrigger(prev => prev + 1);
      } else {
        const err = await res?.json().catch(() => ({}));
        ToastNotify.error(err.message || 'Failed to update refund status');
      }
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to update refund status');
    } finally {
      setIsUpdatingRefundStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-sky-600 dark:text-sky-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">
            Loading payment details...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500 mb-4">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <InformationCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">Payment not found</p>
        </div>
      </div>
    );
  }

  const tabList: Array<'payment' | 'status' | 'refund'> = ['payment', 'status'];
  if (refundsPendingCount > 0 || refundsSuccessCount > 0)
    tabList.push('refund');
  const selectedTabIndex = tabList.indexOf(activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center md:space-x-3">
          {/* <button
            onClick={onBack}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 focus:outline-none"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button> */}
          <div className="flex items-center md:space-x-2 md:pl-2">
            <h1 className="hidden md:inline text-2xl text-gray-500 dark:text-gray-400">
              Payment #{payment.id}
            </h1>
            <span className="block md:hidden">#{maskedLongID(payment.id)}</span>
            {/* <button
              onClick={() => handleCopy(payment.id, 'header-payment-id')}
              className="text-gray-400 dark:text-gray-500 hover:text-sky-600 dark:hover:text-sky-400"
            >
              {copiedId === 'header-payment-id' ? (
                <ClipboardCheckIcon className="h-4 w-4 text-green-500" />
              ) : (
                <ClipboardDocumentIcon className="h-4 w-4" />
              )}
            </button> */}
            <CopyButton
              value={payment.id}
              copied={copiedId === payment.id}
              onCopied={() => {
                setCopiedId(payment.id);
                setTimeout(() => setCopiedId(null), 2000);
              }}
              title="Copy Payment ID"
            />
          </div>
          <TransactionStatusBadge status={payment.status} />
          {/* Refund 标识和 badge */}
          {(refundsPendingCount > 0 ||
            refundsSuccessCount > 0 ||
            refundsSubmittedCount > 0) && (
            <div className="hidden md:flex items-center py-2 px-2 space-x-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="flex items-center space-x-1">
                <span className="inline-flex items-center px-1 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-700 dark:bg-opacity-25 dark:text-amber-400">
                  <ArrowUpTrayIcon className="h-3 w-3" title="Has Refund" />
                </span>
                {refundsPendingCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:bg-opacity-25 dark:text-yellow-400">
                    Pending: {refundsPendingCount}
                  </span>
                )}
                {refundsSubmittedCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400">
                    Submitted: {refundsSubmittedCount}
                  </span>
                )}
                {refundsSuccessCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700 dark:bg-pink-700 dark:bg-opacity-25 dark:text-pink-400">
                    Success: {refundsSuccessCount}
                  </span>
                )}
              </span>
            </div>
          )}
          {refundsPendingCount > 0 && (
            <span className="block md:hidden ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:bg-opacity-25 dark:text-yellow-400">
              {refundsPendingCount}
            </span>
          )}
          {refundsSubmittedCount > 0 && (
            <span className="block md:hidden ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400">
              {refundsSubmittedCount}
            </span>
          )}
          {refundsSuccessCount > 0 && (
            <span className="block md:hidden ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700 dark:bg-pink-700 dark:bg-opacity-25 dark:text-pink-400">
              {refundsSuccessCount}
            </span>
          )}
        </div>
        <ActionsDropdown
          actions={
            [
              {
                label: 'Refresh',
                icon: <ArrowPathIcon className="h-4 w-4" />,
                onClick: handleRefresh,
              },
              (can('payment_status', 'edit') || can('payment', 'edit')) &&
              !refundsPendingCount &&
              !refundsSuccessCount
                ? {
                    label: 'Update Status',
                    icon: <PencilIcon className="h-4 w-4" />,
                    onClick: () => setIsUpdateStatusOpen(true),
                  }
                : null,
            ].filter(Boolean) as ActionItem[]
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Payment Details (Merged) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Information (Merged Payment Details and Transaction Details) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Payment Details
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Order ID
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {payment.order_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Amount
                  </label>
                  <div className="flex items-center md:space-x-2">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {payment.amount} {payment.currency_code}
                    </p>
                    {(refundsPendingCount > 0 ||
                      refundsSuccessCount > 0 ||
                      refundsSubmittedCount > 0) && (
                      <span
                        className="flex items-center space-x-1"
                        title="Refund Amount"
                      >
                        {refundsPendingCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:bg-opacity-25 dark:text-yellow-400">
                            <ClockIcon className="h-3 w-3 mr-1" />{' '}
                            {refundsPendingAmount}
                          </span>
                        )}
                        {refundsSubmittedCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400">
                            <ClockIcon className="h-3 w-3 mr-1" />{' '}
                            {refundsSubmittedAmount}
                          </span>
                        )}
                        {refundsSuccessCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700 dark:bg-pink-700 dark:bg-opacity-25 dark:text-pink-400">
                            <ArrowUpTrayIcon className="h-3 w-3 mr-1" />{' '}
                            {refundsSuccessAmount}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Transaction Method
                  </label>
                  <div className="flex items-center space-x-2">
                    <CreditCardIcon className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-gray-100 capitalize">
                      {payment.method.replace('_', ' ')}
                      <span className="text-gray-600 dark:text-gray-300 text-sm">
                        {payment.channel ? ` - ${payment.channel}` : ''}
                      </span>
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Merchant Name
                  </label>
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-gray-100 ">
                      {payment.merchant_name}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Bank Transaction ID
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">
                      {payment.bank_tx_id || '-'}
                    </p>
                    {payment.bank_tx_id && (
                      // <button
                      //   onClick={() => handleCopy(payment.bank_tx_id, 'bank-tx-id')}
                      //   className="text-gray-400 dark:text-gray-500 hover:text-sky-600 dark:hover:text-sky-400"
                      // >
                      //   {copiedId === 'bank-tx-id' ? (
                      //     <ClipboardCheckIcon className="h-4 w-4 text-green-500" />
                      //   ) : (
                      //     <ClipboardDocumentIcon className="h-4 w-4" />
                      //   )}
                      // </button>
                      <CopyButton
                        value={payment.bank_tx_id}
                        copied={copiedId === payment.bank_tx_id}
                        onCopied={() => {
                          setCopiedId(payment.bank_tx_id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        title="Copy Bank Transaction ID"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Merchant ID
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">
                    {payment.merchant_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Created At
                  </label>
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-gray-100">
                      {formatDateByUser(
                        payment.created_at,
                        user?.metadata?.data_time_format
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Updated At
                  </label>
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-gray-100">
                      {formatDateByUser(
                        payment.updated_at,
                        user?.metadata?.data_time_format
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <AccountDetails
            sourceId={payment.id}
            sourceType="payment"
            include_related_types="refund"
            refreshTrigger={accountRefreshTrigger}
          />
        </div>

        {/* Right Column - Metadata + Payment Logs Tabs */}
        <div className="space-y-6">
          {/* Metadata */}
          {payment.metadata && Object.keys(payment.metadata).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Metadata
                </h2>
              </div>
              <div className="p-6">
                <div className="max-h-40 scrollbar overflow-y-auto space-y-3">
                  <MetadataDisplay data={payment.metadata} />
                </div>
              </div>
            </div>
          )}
          {/* Payment Logs Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <Tab.Group
              selectedIndex={selectedTabIndex}
              onChange={i => setActiveTab(tabList[i])}
            >
              <Tab.List className="flex border-b border-gray-200 dark:border-gray-700 rounded-tl-2xl">
                {(refundsPendingCount > 0 ||
                  refundsSuccessCount > 0 ||
                  refundsSubmittedCount > 0) && (
                  <Tab
                    className={({ selected }) =>
                      `px-6 py-4 text-lg text-sm focus:outline-none transition-colors ${
                        selected
                          ? 'text-gray-900 border-b-2 border-gray-200 dark:text-gray-100 dark:border-gray-700 dark:bg-gray-800'
                          : 'text-gray-400 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400'
                      }`
                    }
                  >
                    Refund Logs
                  </Tab>
                )}
                <Tab
                  className={({ selected }) =>
                    `px-6 py-4 text-lg text-sm focus:outline-none transition-colors rounded-tl-2xl ${
                      selected
                        ? 'text-gray-900 border-b-2 border-gray-200 dark:text-gray-100 dark:border-gray-700 dark:bg-gray-800'
                        : 'text-gray-400 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400'
                    }`
                  }
                >
                  Payment Logs
                </Tab>
                <Tab
                  className={({ selected }) =>
                    `px-6 py-4 text-lg text-sm focus:outline-none transition-colors ${
                      selected
                        ? 'text-gray-900 border-b-2 border-gray-200 dark:text-gray-100 dark:border-gray-700 dark:bg-gray-800'
                        : 'text-gray-400 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400'
                    }`
                  }
                >
                  Status Logs
                </Tab>
              </Tab.List>
              <Tab.Panels>
                {/* Refund Logs Tab */}
                {(refundsPendingCount > 0 ||
                  refundsSuccessCount > 0 ||
                  refundsSubmittedCount > 0) && (
                  <Tab.Panel>
                    <div className="p-6 space-y-4">
                      {isRefundsLoading ? (
                        <div className="text-center text-gray-400">
                          Loading refund logs...
                        </div>
                      ) : refunds.length === 0 ? (
                        <div className="text-center text-gray-400">
                          No refund logs
                        </div>
                      ) : (
                        <ul className="relative">
                          {refunds.map((log, idx) => (
                            <li
                              key={log.id}
                              className="relative pl-8 mb-3 last:mb-0"
                            >
                              {/* 圆点 */}
                              <span
                                className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full z-10`}
                                style={{
                                  background:
                                    log.status === 'pending'
                                      ? '#facc15'
                                      : log.status === 'success'
                                        ? '#4ade80'
                                        : log.status === 'submitted'
                                          ? '#3b82f6'
                                          : '#f87171',
                                }}
                              />
                              {/* 竖线（不是最后一个才显示） */}
                              {idx < refunds.length - 1 && (
                                <span
                                  className="absolute left-1 top-6 w-px bg-gray-300 dark:bg-gray-700"
                                  style={{
                                    height: 'calc(100% - 1rem)',
                                  }}
                                />
                              )}
                              {/* 内容 */}
                              <div className="flex items-center justify-between w-full">
                                <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                  <span className="capitalize">
                                    {log.amount} {log.currency_code}
                                  </span>
                                  <TransactionStatusBadge
                                    status={log.status}
                                    isSmallSize={true}
                                  />
                                </div>
                                <button
                                  className="ml-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                  title="Update Refund Status"
                                  onClick={() => {
                                    setCurrentRefund(log);
                                    setRefundUpdateStatus(''); // 默认空，modal 内会根据 oldStatus 生成可选项
                                    setRefundUpdateReason('');
                                    setRefundUpdateSendNotification(true);
                                    setIsUpdateRefundStatusOpen(true);
                                  }}
                                >
                                  <PencilIcon className="h-4 w-4 text-sky-500" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-500">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">
                                      {maskedLongID(log.id)}
                                    </span>
                                    <CopyButton
                                      value={log.id}
                                      copied={copiedId === log.id}
                                      onCopied={() => {
                                        setCopiedId(log.id);
                                        setTimeout(
                                          () => setCopiedId(null),
                                          2000
                                        );
                                      }}
                                      title="Copy Refund ID"
                                    />
                                  </div>
                                </span>
                                <span className="flex items-center space-x-1 text-xs text-gray-400">
                                  <ClockIcon className="h-4 w-4" />
                                  <span>
                                    {formatDateByUser(
                                      log.updated_at,
                                      user?.metadata?.data_time_format
                                    )}
                                  </span>
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Tab.Panel>
                )}
                <Tab.Panel>
                  <div className="p-6 space-y-4">
                    {isLogsLoading ? (
                      <div className="text-center text-gray-400">
                        Loading logs...
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="text-center text-gray-400">No logs</div>
                    ) : (
                      <ul className="relative">
                        {logs.map((log, idx) => (
                          <li
                            key={log.id}
                            className="relative pl-8 mb-3 last:mb-0"
                          >
                            {/* 圆点 */}
                            <span
                              className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full z-10`}
                              style={{
                                background:
                                  log.status_code >= 200 &&
                                  log.status_code < 300
                                    ? '#4ade80' // green-400
                                    : log.status_code >= 300 &&
                                        log.status_code < 400
                                      ? '#A3E635' // yellow-400
                                      : '#f87171', // red-400
                              }}
                            />
                            {/* 竖线（不是最后一个才显示） */}
                            {idx < logs.length - 1 && (
                              <span
                                className="absolute left-1 top-6 w-px bg-gray-300 dark:bg-gray-700"
                                style={{
                                  height: 'calc(100% - 1rem)',
                                }}
                              />
                            )}
                            {/* 内容 */}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {t(`TransactionLogMethod.${log.method}`)}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-500">
                                  Status: {log.status_code}
                                </span>
                                <span className="flex items-center space-x-1 text-xs text-gray-400">
                                  <ClockIcon className="h-4 w-4" />
                                  <span>
                                    {formatDateByUser(
                                      log.created_at,
                                      user?.metadata?.data_time_format
                                    )}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Tab.Panel>
                <Tab.Panel>
                  <div className="p-6 space-y-4">
                    {isStatusLogsLoading ? (
                      <div className="text-center text-gray-400">
                        Loading status logs...
                      </div>
                    ) : statusLogs.length === 0 ? (
                      <div className="text-center text-gray-400">
                        No status logs
                      </div>
                    ) : (
                      <ul className="relative">
                        {statusLogs.map((log, idx) => (
                          <li
                            key={log.id}
                            className="relative pl-8 mb-3 last:mb-0"
                          >
                            {/* 圆点 */}
                            <span
                              className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full z-10`}
                              style={{
                                background:
                                  log.changed_by === 'system'
                                    ? '#60a5fa'
                                    : '#facc15', // sky-400 for system, yellow-400 for others
                              }}
                            />
                            {/* 竖线（不是最后一个才显示） */}
                            {idx < statusLogs.length - 1 && (
                              <span
                                className="absolute left-1 top-6 w-px bg-gray-300 dark:bg-gray-700"
                                style={{
                                  height: 'calc(100% - 1rem)',
                                }}
                              />
                            )}
                            {/* 内容 */}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <span className="capitalize">
                                  {log.old_status ?? (
                                    <span className="text-gray-400">
                                      Created
                                    </span>
                                  )}
                                </span>
                                <ArrowRightIcon className="h-4 w-4" />
                                <span className="capitalize">
                                  {log.new_status}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-500">
                                  {log.changed_by}
                                </span>
                                <span className="flex items-center space-x-1 text-xs text-gray-400">
                                  <ClockIcon className="h-4 w-4" />
                                  <span>
                                    {formatDateByUser(
                                      log.created_at,
                                      user?.metadata?.data_time_format
                                    )}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        </div>
      </div>

      <UpdateTransactionStatusModal
        type={TRANSACTION_TYPE.PAYMENT}
        isOpen={isUpdateStatusOpen}
        oldStatus={payment.status}
        newStatus={updateStatus}
        reason={updateReason}
        sendNotification={updateSendNotification}
        isLoading={isUpdatingStatus}
        onChangeStatus={setUpdateStatus}
        onChangeReason={setUpdateReason}
        onChangeSendNotification={setUpdateSendNotification}
        onCancel={() => setIsUpdateStatusOpen(false)}
        onSubmit={handleUpdateStatus}
      />
      {/* Refund 状态更新弹窗 */}
      <UpdateTransactionStatusModal
        type="refund"
        isOpen={isUpdateRefundStatusOpen}
        oldStatus={currentRefund?.status || ''}
        newStatus={refundUpdateStatus}
        reason={refundUpdateReason}
        sendNotification={refundUpdateSendNotification}
        isLoading={isUpdatingRefundStatus}
        onChangeStatus={setRefundUpdateStatus}
        onChangeReason={setRefundUpdateReason}
        onChangeSendNotification={setRefundUpdateSendNotification}
        onCancel={() => setIsUpdateRefundStatusOpen(false)}
        onSubmit={handleUpdateRefundStatus}
      />
    </div>
  );
};

export default PaymentDetail;
