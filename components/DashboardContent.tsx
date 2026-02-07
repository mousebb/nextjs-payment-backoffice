'use client'; // Ensure client component

import {
  CheckCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  XCircleIcon,
  ArrowLeftIcon, // For back button
  ClockIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
// import Image from 'next/image'; // Image component no longer explicitly used here
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import PaymentList, { ApiPayment } from './_PaymentList'; // Import ApiPayment along with PaymentList
import MerchantSummaryByCurrency, {
  SelectedMerchantInfo as MerchantPaymentFiltersType,
  MerchantSummaryByCurrencyProps,
} from './MerchantSummaryByCurrency'; // 新增导入
import {
  getUtcDayRange,
  authFetch,
  getUtcMonthRange,
  getSummaryPeriodRange,
} from '@/lib/utils';
import { CONFIG, DEFAULT_PAGE_SIZE } from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import AccessDenied from './AccessDenied';
import { useMerchantAccess } from '@/hooks/useMerchantAccess';
import TransactionSummary from './TransactionSummary';
import SummaryPolarChart from './SummaryPolarChart';
import { useSummaryData } from '@/hooks/useSummaryData';
import { startOfWeek, endOfWeek } from 'date-fns';
import WithdrawalList from './_WithdrawalList';
import TransactionList from './TransactionList';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';

interface DashboardContentProps {
  onViewTransactionDetail: (
    transactionId: string,
    sourceType: 'payment' | 'withdrawal',
    sourceView: string
  ) => void;
  period: 'daily' | 'weekly' | 'monthly';
  setPeriod: React.Dispatch<
    React.SetStateAction<'daily' | 'weekly' | 'monthly'>
  >;
}

interface ApiResponse {
  data: ApiPayment[];
  total: number;
  page: number;
  limit: number;
}

interface PaymentSummaryItem {
  count: string;
  amount: string;
  rate?: string;
}

interface PaymentSummaryResponse {
  [key: string]: PaymentSummaryItem;
  pending: PaymentSummaryItem;
  success: PaymentSummaryItem;
  failed: PaymentSummaryItem;
  // cancelled: PaymentSummaryItem;
  // submitted: PaymentSummaryItem;
}

type ViewMode = 'dashboard' | 'payment' | 'withdrawal';

const DashboardContent: React.FC<DashboardContentProps> = ({
  onViewTransactionDetail,
  period,
  setPeriod,
}) => {
  const { logout } = useAuth();
  const { can } = usePermission();
  const { checkUserAccess, accessibleMerchantIds } = useMerchantAccess();
  const [refreshKey, setRefreshKey] = useState(0); // 触发刷新
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [merchantPaymentFilters, setMerchantPaymentFilters] =
    useState<MerchantPaymentFiltersType | null>(null);

  // --- period 状态与 URL 联动逻辑移除，全部交由父组件管理 ---
  // const router = useRouter();
  // const searchParams = useSearchParams();
  // const pathname = usePathname();
  // const urlPeriod = searchParams.get('period');
  // const [summaryPeriod, setSummaryPeriod] = useState<'daily' | 'weekly' | 'monthly'>(
  //   urlPeriod === 'weekly' || urlPeriod === 'monthly' ? urlPeriod : 'daily'
  // );
  // useEffect(() => { ... }, [summaryPeriod]);
  // useEffect(() => { ... }, [searchParams]);

  // Recent Payments 只获取当天数据
  const { utcStart: todayStart, utcEnd: todayEnd } = getUtcDayRange(new Date());
  // 根据 summaryPeriod 动态计算 summaryTimeParams

  const { start: summaryStart, end: summaryEnd } =
    getSummaryPeriodRange(period);
  const summaryTimeParams = `start=${encodeURIComponent(summaryStart)}&end=${encodeURIComponent(summaryEnd)}`;

  // 适配 checkUserAccess 返回类型，保证 error 字段为 string | undefined
  const checkUserAccessForSummary = () => {
    const result = checkUserAccess();
    return {
      shouldProceed: result.shouldProceed,
      error: result.error === null ? undefined : result.error,
    };
  };

  // 适配 authFetch 类型（去掉 retry 参数），保证返回 Response
  const authFetchForSummary = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => {
    // @ts-ignore
    const res = await authFetch(input, init);
    if (!res) throw new Error('No response');
    return res;
  };

  // 使用 useSummaryData hook
  const {
    summary: paymentSummary,
    loading: summaryIsLoading,
    error: summaryError,
    fetchSummary: fetchPaymentSummary,
    setSummary: setPaymentSummary,
    setError: setSummaryError,
    setLoading: setSummaryIsLoading,
  } = useSummaryData({
    apiRoute: API_ROUTES.PAYMENT_SUMMARY,
    accessibleMerchantIds,
    summaryTimeParams,
    authFetch: authFetchForSummary,
    checkUserAccess: checkUserAccessForSummary,
  });

  const {
    summary: withdrawalSummary,
    loading: withdrawalSummaryLoading,
    error: withdrawalSummaryError,
    fetchSummary: fetchWithdrawalSummary,
    setSummary: setWithdrawalSummary,
    setError: setWithdrawalSummaryError,
    setLoading: setWithdrawalSummaryLoading,
  } = useSummaryData({
    apiRoute: API_ROUTES.WITHDRAWAL_SUMMARY,
    accessibleMerchantIds,
    summaryTimeParams,
    authFetch: authFetchForSummary,
    checkUserAccess: checkUserAccessForSummary,
  });

  const handleRefreshAll = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  const handleShowMerchantTransactions = (
    filters: MerchantPaymentFiltersType,
    type: 'payment' | 'withdrawal'
  ) => {
    setMerchantPaymentFilters(filters);
    setViewMode(type as ViewMode);
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setMerchantPaymentFilters(null);
  };

  // Helper function to format rate for stat cards
  const formatRateForStatCard = (rate?: string): string => {
    if (rate === undefined || rate === null) return '(--)';
    const num = parseFloat(rate);
    if (isNaN(num)) return '(--)';
    return `(${num.toFixed(2)}%)`;
  };

  // 统一刷新 summary 数据
  useEffect(() => {
    if (viewMode === 'dashboard') {
      can('payment', 'view') && fetchPaymentSummary();
      can('withdrawal', 'view') && fetchWithdrawalSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logout, accessibleMerchantIds, refreshKey, viewMode, period]);

  function renderMerchantTransactionList(
    type: 'payment' | 'withdrawal',
    merchantPaymentFilters: MerchantPaymentFiltersType
  ) {
    if (!merchantPaymentFilters) return null;
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <button
            onClick={handleBackToDashboard}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            aria-label="Back to Dashboard"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-2xl text-gray-500 dark:text-gray-400">
            {merchantPaymentFilters.merchantName} (
            {merchantPaymentFilters.currency})
            {merchantPaymentFilters.status
              ? ` - ${merchantPaymentFilters.status.charAt(0).toUpperCase() + merchantPaymentFilters.status.slice(1)}`
              : ''}
          </h1>
        </div>
        <TransactionList
          type={type}
          key={`${merchantPaymentFilters.merchantId}-${merchantPaymentFilters.currency}-${merchantPaymentFilters.status || ''}`}
          listTitle={type === 'payment' ? 'Payment List' : 'Withdrawal List'}
          baseApiParams={{
            merchant_id: merchantPaymentFilters.merchantId,
            currency: merchantPaymentFilters.currency,
            start: merchantPaymentFilters.start || '',
            end: merchantPaymentFilters.end || '',
            ...(merchantPaymentFilters.status
              ? { status: merchantPaymentFilters.status }
              : {}),
          }}
          enablePagination={true}
          showSearchBar={false}
          showCheckboxColumn={true}
          initialItemsPerPage={DEFAULT_PAGE_SIZE}
          onViewTransactionDetail={(id: string) =>
            onViewTransactionDetail(id, type, 'dashboard')
          }
          onRefresh={handleRefreshAll}
          externalRefreshKey={refreshKey}
        />
      </div>
    );
  }

  if (
    (viewMode === 'payment' || viewMode === 'withdrawal') &&
    merchantPaymentFilters
  ) {
    return renderMerchantTransactionList(viewMode, merchantPaymentFilters);
  }

  if (summaryIsLoading && !paymentSummary && viewMode === 'dashboard') {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-300">
        Loading dashboard...
      </div>
    );
  }

  if (summaryError && !paymentSummary && viewMode === 'dashboard') {
    return (
      <AccessDenied
        onBack={() => {}}
        title="Error Loading Payment Summary"
        message={summaryError}
      />
    );
  }

  const paymentTypeLabels = {
    pending: 'Pending',
    success: 'Success',
    failed: 'Failed',
    // cancelled: 'Cancelled',
    // submitted: 'Submitted',
  };
  const withdrawalTypeLabels = {
    submitted: 'WD Submitted',
    success: 'WD Success',
    failed: 'WD Failed',
  };

  return (
    <div className="space-y-6">
      {can('payment', 'view') && (
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1">
            <TransactionSummary
              blocks={[
                {
                  title: 'Payment Summary',
                  summaryData: paymentSummary ?? {},
                  typeLabels: paymentTypeLabels,
                  loading: summaryIsLoading,
                },
                {
                  title: 'Withdrawal Summary',
                  summaryData: withdrawalSummary ?? {},
                  typeLabels: withdrawalTypeLabels,
                  loading: withdrawalSummaryLoading,
                },
              ]}
              formatRateForStatCard={formatRateForStatCard}
              period={period}
            />
          </div>
          {/* Chart placeholder */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow w-full xl:w-[450px]  flex items-center justify-center">
            <SummaryPolarChart
              paymentSummary={paymentSummary ?? {}}
              withdrawalSummary={withdrawalSummary ?? {}}
            />
          </div>
        </div>
      )}

      {can('merchant_summary', 'view') && (
        <MerchantSummaryByCurrency
          externalRefreshKey={refreshKey}
          onRefresh={handleRefreshAll}
          onShowMerchantTransactions={handleShowMerchantTransactions}
          period={period}
          setPeriod={setPeriod}
        />
      )}

      {can('payment', 'view') && (
        <TransactionList
          type="payment"
          listTitle="Recent Payments"
          enablePagination={false}
          displayLimit={10}
          showSearchBar={false}
          onViewTransactionDetail={(paymentId: string) =>
            onViewTransactionDetail(paymentId, 'payment', 'dashboard')
          }
          onRefresh={handleRefreshAll}
          externalRefreshKey={refreshKey}
          showCheckboxColumn={false}
        />
      )}
    </div>
  );
};

export default DashboardContent;
