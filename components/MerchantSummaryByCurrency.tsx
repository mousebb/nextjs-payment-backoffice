'use client';

import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import ActionsDropdown, { ActionItem } from './ActionsDropdown';
import {
  getUtcDayRange,
  authFetch,
  getUtcMonthRange,
  getSummaryPeriodRange,
} from '@/lib/utils';
import { startOfWeek, endOfWeek } from 'date-fns';
import { CONFIG, ROLES_ENUM } from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { useMerchantAccess } from '@/hooks/useMerchantAccess';
import CustomStackedBar from './CustomStackedBar';

// Interfaces based on the provided API response
interface MerchantStatusSummary {
  count: string;
  amount: string;
  rate: string;
}

interface MerchantCurrencyItem {
  merchant_id: string;
  merchant_name: string;
  payment: {
    pending?: MerchantStatusSummary;
    success?: MerchantStatusSummary;
    failed?: MerchantStatusSummary;
    // 其它状态如有
  };
  withdrawal: {
    success?: MerchantStatusSummary;
    failed?: MerchantStatusSummary;
    submitted?: MerchantStatusSummary;
    // 其它状态如有
  };
}

interface CurrencySummaryData {
  merchants: MerchantCurrencyItem[];
  payment_success_total: string;
  payment_failed_total: string;
}

interface MerchantSummariesByCurrencyResponse {
  [currencyCode: string]: CurrencySummaryData;
}

// Export SelectedMerchantInfo for use in DashboardContent
export interface SelectedMerchantInfo {
  merchantId: string;
  merchantName: string;
  currency: string;
  status?: 'pending' | 'success' | 'failed';
  start?: string;
  end?: string;
}

export interface MerchantSummaryByCurrencyProps {
  onRefresh?: () => void;
  externalRefreshKey?: any;
  onShowMerchantTransactions?: (
    filters: SelectedMerchantInfo,
    type: 'payment' | 'withdrawal'
  ) => void;
  period: 'daily' | 'weekly' | 'monthly';
  setPeriod: (p: 'daily' | 'weekly' | 'monthly') => void;
}

const MerchantSummaryByCurrency = ({
  onRefresh,
  externalRefreshKey,
  onShowMerchantTransactions,
  period,
  setPeriod,
}: MerchantSummaryByCurrencyProps) => {
  const { logout, user } = useAuth();
  const { checkUserAccess, accessibleMerchantIds } = useMerchantAccess();
  const [summaryData, setSummaryData] =
    useState<MerchantSummariesByCurrencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取日期范围
  let { start: start, end: end } = getSummaryPeriodRange(period);

  useEffect(() => {
    const fetchMerchantSummary = async () => {
      setIsLoading(true);
      setError(null);

      // 检查用户权限
      const accessCheck = checkUserAccess();
      if (!accessCheck.shouldProceed) {
        setError(accessCheck.error);
        setSummaryData(null);
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        let merchantIdParamValue: string | null = null;

        if (accessibleMerchantIds) {
          if (Array.isArray(accessibleMerchantIds)) {
            if (accessibleMerchantIds.length > 0) {
              merchantIdParamValue = accessibleMerchantIds.join(',');
            }
          } else if (typeof accessibleMerchantIds === 'string') {
            merchantIdParamValue = accessibleMerchantIds;
          }
        }

        if (merchantIdParamValue) {
          params.append('merchant_id', merchantIdParamValue);
        }
        params.append('start', start);
        params.append('end', end);

        const apiUrl =
          CONFIG.API_BASE_URL +
          API_ROUTES.MERCHANT_SUMMARY +
          `?${params.toString()}`;
        const response = await authFetch(apiUrl);

        if (!response) return;
        let result: any;
        try {
          result = await response.json();
        } catch {
          result = { message: 'Failed to fetch merchant summaries' };
        }
        if (!response.ok) {
          throw new Error(
            result.message || `HTTP error! status: ${response.status}`
          );
        }
        setSummaryData(result as MerchantSummariesByCurrencyResponse);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
        setSummaryData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchantSummary();
  }, [logout, accessibleMerchantIds, externalRefreshKey, period]);

  const handleInternalRefresh = () => {
    const fetchAgain = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        let merchantIdParamValue: string | null = null;
        if (accessibleMerchantIds) {
          if (Array.isArray(accessibleMerchantIds)) {
            if (accessibleMerchantIds.length > 0) {
              merchantIdParamValue = accessibleMerchantIds.join(',');
            }
          } else if (typeof accessibleMerchantIds === 'string') {
            merchantIdParamValue = accessibleMerchantIds;
          }
        }
        if (merchantIdParamValue) {
          params.append('merchant_id', merchantIdParamValue);
        }
        params.append('start', start);
        params.append('end', end);
        const apiUrl =
          CONFIG.API_BASE_URL +
          API_ROUTES.MERCHANT_SUMMARY +
          `?${params.toString()}`;
        const response = await authFetch(apiUrl);
        if (!response) return;
        let result: any;
        try {
          result = await response.json();
        } catch {
          result = { message: 'Failed to fetch merchant summaries' };
        }
        if (!response.ok) {
          throw new Error(
            result.message || `HTTP error! status: ${response.status}`
          );
        }
        setSummaryData(result as MerchantSummariesByCurrencyResponse);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
        setSummaryData(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (onRefresh) {
      onRefresh();
    } else {
      fetchAgain();
    }
  };

  const formatNumber = (value: string | number | undefined, precision = 2) => {
    if (value === undefined || value === null) return '-';
    const num = parseFloat(String(value));
    return isNaN(num) ? '-' : num.toFixed(precision);
  };

  const handleMerchantNameClick = (
    merchantId: string,
    merchantName: string,
    currency: string
  ) => {
    if (onShowMerchantTransactions) {
      onShowMerchantTransactions(
        {
          merchantId,
          merchantName,
          currency,
          start,
          end,
        },
        'payment'
      );
    }
  };

  if (isLoading && !summaryData) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-300">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <ArrowPathIcon className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500 animate-spin mb-4" />
          Loading Merchant Summaries by Currency...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-600 dark:text-red-300">
            Error loading merchant summaries
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {error}
          </p>
          <button
            onClick={handleInternalRefresh}
            className="mt-6 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!summaryData || Object.keys(summaryData).length === 0) {
    return (
      <>
        <div className="text-gray-500 dark:text-gray-300">
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
            <div className="text-center overflow-x-auto w-full">
              <span className="text-md">
                No merchant summary data available for the currency groups
                today.
              </span>
            </div>
            <ActionsDropdown
              actions={[
                {
                  type: 'radio-group',
                  label: 'Period',
                  value: period,
                  options: [
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Monthly', value: 'monthly' },
                  ],
                  onChange: val =>
                    setPeriod(val as 'daily' | 'weekly' | 'monthly'),
                },
                {
                  label: 'Refresh',
                  icon: (
                    <ArrowPathIcon
                      className={isLoading ? 'animate-spin' : ''}
                    />
                  ),
                  onClick: handleInternalRefresh,
                  disabled: isLoading,
                },
              ]}
              isLoading={isLoading}
            />
          </div>
        </div>
      </>
    );
  }

  // Helper to render content for a status cell
  const renderStatusCellContent = (
    type: 'payment' | 'withdrawal',
    status: MerchantStatusSummary | undefined,
    currency: string,
    merchantId: string,
    merchantName: string,
    statusType: 'pending' | 'success' | 'failed',
    onShowMerchantTransactions?: (
      filters: SelectedMerchantInfo,
      type: 'payment' | 'withdrawal'
    ) => void,
    _start?: string,
    _end?: string
  ) => {
    const isClickable =
      !!onShowMerchantTransactions &&
      status?.count &&
      Number(status.count) > 0 &&
      !user?.roles.includes(ROLES_ENUM.AGENT);
    return (
      <div className={`flex flex-col items-end`}>
        <div
          onClick={
            isClickable
              ? () =>
                  onShowMerchantTransactions &&
                  onShowMerchantTransactions(
                    {
                      merchantId,
                      merchantName,
                      currency,
                      status: statusType,
                      start,
                      end,
                    },
                    type
                  )
              : undefined
          }
          title={isClickable ? `View ${statusType} details` : undefined}
          tabIndex={isClickable ? 0 : -1}
          role={isClickable ? 'button' : undefined}
        >
          <span
            className={`text-base font-medium 
            ${isClickable ? 'text-sky-600 dark:text-sky-400 focus:outline-none' : 'text-gray-800 dark:text-gray-100 '}`}
          >
            {status?.count}
          </span>
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
            ({formatNumber(status?.rate, 1)}%)
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {status?.amount} {currency}
        </span>
      </div>
    );
  };

  // Define actions for the ActionsDropdown in each card
  const cardActions: ActionItem[] = [
    {
      label: 'Refresh',
      icon: <ArrowPathIcon className={isLoading ? 'animate-spin' : ''} />,
      onClick: handleInternalRefresh,
      disabled: isLoading,
    },
  ];

  return (
    <div className="space-y-6">
      {Object.entries(summaryData).map(([currency, data]) => (
        <div
          key={currency}
          className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {currency}
            </h3>
            <ActionsDropdown
              actions={[
                {
                  type: 'radio-group',
                  label: 'Period',
                  value: period,
                  options: [
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Monthly', value: 'monthly' },
                  ],
                  onChange: val =>
                    setPeriod(val as 'daily' | 'weekly' | 'monthly'),
                },
                ...cardActions,
              ]}
              isLoading={isLoading}
            />
          </div>

          <div className="overflow-x-auto">
            {data.merchants && data.merchants.length > 0 ? (
              <table className="min-w-full w-full">
                <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sticky top-0 z-10">
                  <tr>
                    <th
                      scope="col"
                      className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      Merchant Name
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      Pending
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      Success
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      Failed
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      WD Success
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      WD Failed
                    </th>
                    {/* <th scope="col" className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-[10%]">Cancelled</th> */}
                    <th
                      scope="col"
                      className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      Payment Rate Distribution
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {data.merchants.map(item => (
                    <tr
                      key={item.merchant_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 align-top w-[15%]">
                        {/* <button 
                          onClick={() => handleMerchantNameClick(item.merchant_id, item.merchant_name, currency)}
                          className="text-sky-600 dark:text-sky-400 focus:outline-none font-medium"
                          disabled={!onShowMerchantTransactions}
                        > */}
                        {item.merchant_name}
                        {/* </button> */}
                      </td>
                      <td className="py-2 px-3 text-xs align-top w-[10%]">
                        {renderStatusCellContent(
                          'payment',
                          item.payment?.pending,
                          currency,
                          item.merchant_id,
                          item.merchant_name,
                          'pending',
                          onShowMerchantTransactions,
                          start,
                          end
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs align-top w-[10%]">
                        {renderStatusCellContent(
                          'payment',
                          item.payment?.success,
                          currency,
                          item.merchant_id,
                          item.merchant_name,
                          'success',
                          onShowMerchantTransactions,
                          start,
                          end
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs align-top w-[10%]">
                        {renderStatusCellContent(
                          'payment',
                          item.payment?.failed,
                          currency,
                          item.merchant_id,
                          item.merchant_name,
                          'failed',
                          onShowMerchantTransactions,
                          start,
                          end
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs align-top w-[10%]">
                        {renderStatusCellContent(
                          'withdrawal',
                          item.withdrawal?.success,
                          currency,
                          item.merchant_id,
                          item.merchant_name,
                          'success',
                          onShowMerchantTransactions,
                          start,
                          end
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs align-top w-[10%]">
                        {renderStatusCellContent(
                          'withdrawal',
                          item.withdrawal?.failed,
                          currency,
                          item.merchant_id,
                          item.merchant_name,
                          'failed',
                          onShowMerchantTransactions,
                          start,
                          end
                        )}
                      </td>
                      {/* <td className="py-2 px-3 text-xs align-top w-[12%]">{renderStatusCellContent(item.cancelled, currency)}</td> */}
                      <td className="py-4 px-4 align-middle w-[35%]">
                        <CustomStackedBar
                          segments={[
                            {
                              rate: item.payment?.pending?.rate || '0',
                              color: 'yellow',
                              textColor: 'yellow',
                              label: 'Pending',
                            },
                            {
                              rate: item.payment?.success?.rate || '0',
                              color: 'green',
                              textColor: 'green',
                              label: 'Success',
                            },
                            {
                              rate: item.payment?.failed?.rate || '0',
                              color: 'red',
                              textColor: 'red',
                              label: 'Failed',
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">
                No merchant data for {currency}.
              </p>
            )}
          </div>

          <div className="px-6 py-4 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-600">
            <div className="flex flex-col sm:flex-row justify-end sm:space-x-8 space-y-2 sm:space-y-0">
              <div className="text-right sm:text-left">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Total Success:
                </p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {data.payment_success_total} {currency}
                </p>
              </div>
              <div className="text-right sm:text-left">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Total Failed:
                </p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {data.payment_failed_total} {currency}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MerchantSummaryByCurrency;
