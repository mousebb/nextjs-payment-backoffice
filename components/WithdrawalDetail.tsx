'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { CONFIG, TRANSACTION_TYPE } from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ClockIcon,
  ClipboardDocumentIcon,
  CheckIcon as ClipboardCheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { authFetch, formatDateByUser, maskedLongID } from '@/lib/utils';
import { AmountStyleBadge } from '@/components/Common';
import { Tab } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import UpdateTransactionStatusModal from './UpdateTransactionStatusModal';
import ActionsDropdown, { ActionItem } from './ActionsDropdown';
import { usePermission } from '@/hooks/usePermission';
import ToastNotify from './ToastNotify';
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
  } else if (typeof data === 'object' && data !== null) {
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
  } else {
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

interface WithdrawalDetailData {
  id: string;
  order_id: string;
  bank_id: string;
  bank_name: string;
  merchant_id: string;
  merchant_name: string;
  amount: string;
  currency_code: string;
  method_id: string;
  method_name: string;
  method_code: string;
  channel: string | null;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface WithdrawalDetailProps {
  withdrawalId: string;
  onBack: () => void;
}

const WithdrawalStatusBadge = ({ status }: { status: string }) => {
  let colorClasses = '';
  let text = status.charAt(0).toUpperCase() + status.slice(1);
  let IconComponent = null;

  switch (status.toLowerCase()) {
    case 'success':
      colorClasses =
        'bg-green-100 text-green-700 dark:bg-green-700 dark:bg-opacity-25 dark:text-green-400';
      IconComponent = <CheckCircleIcon className="h-4 w-4 mr-1" />;
      break;
    case 'pending':
      colorClasses =
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:bg-opacity-25 dark:text-yellow-400';
      IconComponent = <ClockIcon className="h-4 w-4 mr-1 animate-spin-slow" />;
      break;
    case 'failed':
      colorClasses =
        'bg-red-100 text-red-700 dark:bg-red-700 dark:bg-opacity-25 dark:text-red-400';
      IconComponent = <XCircleIcon className="h-4 w-4 mr-1" />;
      break;
    case 'submitted':
      colorClasses =
        'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400';
      IconComponent = <ClockIcon className="h-4 w-4 mr-1" />;
      break;
    default:
      colorClasses =
        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400';
      IconComponent = <InformationCircleIcon className="h-4 w-4 mr-1" />;
  }
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClasses}`}
    >
      {IconComponent}
      {text}
    </span>
  );
};

// General log type
interface WithdrawalLog {
  id: string;
  direction: string;
  method: string;
  status_code: number;
  created_at: string;
}
// Status log type
interface StatusLog {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  created_at: string;
}

const WithdrawalDetail = ({ withdrawalId, onBack }: WithdrawalDetailProps) => {
  const { logout, user } = useAuth();
  const { can } = usePermission();
  const [withdrawal, setWithdrawal] = useState<WithdrawalDetailData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<WithdrawalLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [isStatusLogsLoading, setIsStatusLogsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'status'>('general');
  const t = useTranslations();
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateReason, setUpdateReason] = useState('');
  const [updateSendNotification, setUpdateSendNotification] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleCopy = async (textToCopy: string, source: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(source);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const fetchWithdrawalDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.WITHDRAWALS + `/${withdrawalId}`
      );
      if (!response) {
        logout();
        return;
      }
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to fetch withdrawal details' }));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }
      const result = await response.json();
      setWithdrawal(result);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch general logs
  const fetchLogs = async () => {
    setIsLogsLoading(true);
    try {
      // '/withdrawal/logs' is used directly because API_ROUTES.WITHDRAWAL_LOGS does not exist
      const res = await authFetch(
        CONFIG.API_BASE_URL +
          API_ROUTES.GENERAL_LOGS.replace(
            ':source_type',
            TRANSACTION_TYPE.WITHDRAWAL
          ).replace(':source_id', withdrawalId)
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
  // Fetch status logs
  const fetchStatusLogs = async () => {
    setIsStatusLogsLoading(true);
    try {
      const params = new URLSearchParams({
        source_type: 'withdrawal',
        source_id: withdrawalId,
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

  // 更新提现状态
  const handleUpdateStatus = async () => {
    if (!updateStatus) return;
    setIsUpdatingStatus(true);
    try {
      const res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.WITHDRAWAL_STATUS_UPDATE, // 你需要有这个 API 路径
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            withdrawal_id: withdrawalId,
            new_status: updateStatus,
            reason: updateReason,
            send_notification: updateSendNotification,
          }),
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
      setIsUpdatingStatus(false);
    }
  };

  // 刷新本页所有数据
  const handleRefresh = async () => {
    await fetchWithdrawalDetail();
    await fetchLogs();
    await fetchStatusLogs();
  };

  useEffect(() => {
    fetchWithdrawalDetail();
  }, [withdrawalId, logout]);
  useEffect(() => {
    fetchLogs();
    fetchStatusLogs();
  }, [withdrawalId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-sky-600 dark:text-sky-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">
            Loading withdrawal details...
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

  if (!withdrawal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <InformationCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">
            Withdrawal not found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* <button
            onClick={onBack}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 focus:outline-none"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button> */}
          <div className="flex items-center md:space-x-2 md:pl-2">
            <h1 className="hidden md:inline text-2xl text-gray-500 dark:text-gray-400">
              Withdrawal #{withdrawal.id}
            </h1>
            <span className="block md:hidden">
              #{maskedLongID(withdrawal.id)}
            </span>
            <button
              onClick={() => handleCopy(withdrawal.id, 'header-withdrawal-id')}
              className="text-gray-400 dark:text-gray-500 hover:text-sky-600 dark:hover:text-sky-400"
            >
              {copiedId === 'header-withdrawal-id' ? (
                <ClipboardCheckIcon className="h-4 w-4 text-green-500" />
              ) : (
                <ClipboardDocumentIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          <WithdrawalStatusBadge status={withdrawal.status} />
        </div>
        <ActionsDropdown
          actions={
            [
              {
                label: 'Refresh',
                icon: <ArrowPathIcon className="h-4 w-4" />,
                onClick: handleRefresh,
              },
              can('withdrawal_status', 'edit') || can('withdrawal', 'edit')
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
        {/* Left Column - Withdrawal Details + Account Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Withdrawal Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Withdrawal Details
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Order ID
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {withdrawal.order_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Amount
                  </label>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {withdrawal.amount} {withdrawal.currency_code}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Method
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {withdrawal.method_name}
                    <span className="text-gray-600 dark:text-gray-300 text-sm">
                      {withdrawal.channel ? ` - ${withdrawal.channel}` : ''}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Merchant Name
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 ">
                    {withdrawal.merchant_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Bank Name
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 ">
                    {withdrawal.bank_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Merchant ID
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">
                    {withdrawal.merchant_id}
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
                        withdrawal.created_at,
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
                        withdrawal.updated_at,
                        user?.metadata?.data_time_format
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Account Details */}
          <AccountDetails sourceId={withdrawal.id} sourceType="withdrawal" />
        </div>
        {/* Right Column - Metadata + Logs Tabs */}
        <div className="space-y-6">
          {/* Metadata */}
          {withdrawal.metadata &&
            Object.keys(withdrawal.metadata).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Metadata
                  </h2>
                </div>
                <div className="p-6">
                  <div className="max-h-40 scrollbar overflow-y-auto space-y-3">
                    <MetadataDisplay data={withdrawal.metadata} />
                  </div>
                </div>
              </div>
            )}
          {/* Logs Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <Tab.Group
              selectedIndex={activeTab === 'general' ? 0 : 1}
              onChange={i => setActiveTab(i === 0 ? 'general' : 'status')}
            >
              <Tab.List className="flex border-b border-gray-200 dark:border-gray-700 rounded-tl-2xl">
                <Tab
                  className={({ selected }) =>
                    `px-6 py-4 text-lg font-semibold focus:outline-none transition-colors rounded-tl-2xl ${
                      selected
                        ? 'text-gray-900 border-b-2 border-gray-200 dark:text-gray-100 dark:border-gray-700 dark:bg-gray-800'
                        : 'text-gray-400 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400'
                    }`
                  }
                >
                  Withdrawal Logs
                </Tab>
                <Tab
                  className={({ selected }) =>
                    `px-6 py-4 text-lg font-semibold focus:outline-none transition-colors ${
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
                            {/* Dot */}
                            <span
                              className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full z-10`}
                              style={{
                                background:
                                  log.status_code >= 200 &&
                                  log.status_code < 300
                                    ? '#4ade80'
                                    : log.status_code >= 300 &&
                                        log.status_code < 400
                                      ? '#A3E635'
                                      : '#f87171',
                              }}
                            />
                            {/* Line */}
                            {idx < logs.length - 1 && (
                              <span
                                className="absolute left-1 top-6 w-px bg-gray-300 dark:bg-gray-700"
                                style={{
                                  height: 'calc(100% - 1rem)',
                                }}
                              />
                            )}
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
                            <span
                              className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full z-10`}
                              style={{
                                background:
                                  log.changed_by === 'system'
                                    ? '#60a5fa'
                                    : '#facc15',
                              }}
                            />
                            {idx < statusLogs.length - 1 && (
                              <span
                                className="absolute left-1 top-6 w-px bg-gray-300 dark:bg-gray-700"
                                style={{
                                  height: 'calc(100% - 1rem)',
                                }}
                              />
                            )}
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
        type={TRANSACTION_TYPE.WITHDRAWAL}
        isOpen={isUpdateStatusOpen}
        oldStatus={withdrawal.status}
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
    </div>
  );
};

export default WithdrawalDetail;
