'use client';

import {
  CheckCircleIcon,
  ArrowPathIcon,
  XCircleIcon,
  InformationCircleIcon,
  ArrowUpOnSquareIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { ActionItem } from './ActionsDropdown';
import { CONFIG, ENUM_CONFIG, DEFAULT_PAGE_SIZE } from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import CopyButton from './CopyButton';
import {
  authFetch,
  maskedLongID,
  getUtcDate,
  formatDateByUser,
} from '@/lib/utils';
import { getBasicData } from '@/lib/basic-data.service';
import CommonSelect from './CommonSelect';
import CustomDateRangePicker from './CustomDateRangePicker';
import { CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@react-types/shared';
import RemotePagingList from './RemotePagingList';
import { ListColumn } from '../types/list';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useMerchantAccess } from '@/hooks/useMerchantAccess';

// Interface for a single refund record
export interface ApiRefund {
  id: string;
  payment_id: string;
  merchant_id: string;
  merchant_name: string;
  bank_id: string;
  bank_name: string;
  amount: string;
  currency_code: string;
  method_id: string;
  method_name: string;
  status: string;
  created_at: string;
}

// Refund Status Badge
export const RefundStatusBadge = ({ status }: { status: string }) => {
  let colorClasses = '';
  let text = status.charAt(0).toUpperCase() + status.slice(1);
  let IconComponent = null;

  switch (status.toLowerCase()) {
    case 'success':
      colorClasses =
        'bg-green-100 text-green-700 dark:bg-green-700 dark:bg-opacity-25 dark:text-green-400';
      IconComponent = <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />;
      break;
    case 'pending':
      colorClasses =
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:bg-opacity-25 dark:text-yellow-400';
      IconComponent = (
        <ClockIcon className="h-3.5 w-3.5 mr-1 animate-spin-slow" />
      );
      break;
    case 'failed':
      colorClasses =
        'bg-red-100 text-red-700 dark:bg-red-700 dark:bg-opacity-25 dark:text-red-400';
      IconComponent = <XCircleIcon className="h-3.5 w-3.5 mr-1" />;
      break;
    default:
      colorClasses =
        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400';
      IconComponent = <InformationCircleIcon className="h-3.5 w-3.5 mr-1" />;
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}
    >
      {IconComponent}
      {text}
    </span>
  );
};

interface RefundListProps {
  listTitle?: string;
  initialItemsPerPage?: number;
  enablePagination?: boolean;
  showSearchBar?: boolean;
  onClear?: (value: string) => void;
  onViewDetail?: (
    refundId: string,
    sourceType: string,
    sourceView: string
  ) => void;
  baseApiParams?: Record<string, string | number | boolean>;
  searchPlaceholder?: string;
  defaultSortColumn?: string;
  defaultSortOrder?: ENUM_CONFIG.ASC | ENUM_CONFIG.DESC;
  displayLimit?: number;
  onRefresh?: () => void;
  externalRefreshKey?: any;
  showCheckboxColumn?: boolean;
}

const RefundList = ({
  listTitle = '',
  initialItemsPerPage = DEFAULT_PAGE_SIZE,
  enablePagination = true,
  showSearchBar = true,
  onClear,
  onViewDetail,
  baseApiParams,
  searchPlaceholder = 'Search by Refund ID or Order ID...',
  defaultSortColumn = 'created_at',
  defaultSortOrder = ENUM_CONFIG.DESC,
  displayLimit,
  onRefresh,
  externalRefreshKey,
  showCheckboxColumn = false,
}: RefundListProps) => {
  const { logout, user } = useAuth();
  const { checkUserAccess, accessibleMerchantIds } = useMerchantAccess();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get('view');

  const [refunds, setRefunds] = useState<ApiRefund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState(new Set<string>());

  const [sortColumn, setSortColumn] = useState<string>(defaultSortColumn);
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(defaultSortOrder);

  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [allMerchants, setAllMerchants] = useState<any[]>([]);
  const [allBanks, setAllBanks] = useState<any[]>([]);
  const [allCurrencies, setAllCurrencies] = useState<any[]>([]);
  const [allMethods, setAllMethods] = useState<any[]>([]);
  const [allStatuses, setAllStatuses] = useState<any[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<
    RangeValue<CalendarDate>
  >(() => {
    const today = new CalendarDate(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate()
    );
    return { start: today.subtract({ days: 6 }), end: today };
  });

  // 获取基础数据
  const fetchAllOptions = useCallback(async () => {
    try {
      const [merchants, banks, currencies, methods] = await Promise.all([
        getBasicData(
          'merchants',
          CONFIG.API_BASE_URL + API_ROUTES.MERCHANTS_ACCESSIBLE
        ),
        getBasicData(
          'banks',
          CONFIG.API_BASE_URL + API_ROUTES.BANKS_ACCESSIBLE
        ),
        getBasicData('currencies', CONFIG.API_BASE_URL + API_ROUTES.CURRENCIES),
        getBasicData(
          'methods',
          CONFIG.API_BASE_URL +
            API_ROUTES.TRANSACTION_METHODS +
            '?enabled=true&type=refund'
        ),
      ]);
      setAllMerchants(merchants);
      setAllBanks(banks);
      setAllCurrencies(currencies);
      setAllMethods(methods);
      setAllStatuses([
        { id: 'pending', name: 'Pending' },
        { id: 'success', name: 'Success' },
        { id: 'failed', name: 'Failed' },
      ]);
    } catch (e) {
      console.error('Error fetching basic data:', e);
    }
  }, []);

  useEffect(() => {
    fetchAllOptions();
  }, [pathname, view, externalRefreshKey, fetchAllOptions]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchAllOptions();
    };
    window.addEventListener('refreshBasicData', handleGlobalRefresh);
    return () => {
      window.removeEventListener('refreshBasicData', handleGlobalRefresh);
    };
  }, [fetchAllOptions]);

  useEffect(() => {
    setItemsPerPage(initialItemsPerPage);
  }, [initialItemsPerPage]);

  const formatDateByUserLocal = (dateString: string) =>
    formatDateByUser(dateString, user?.metadata?.data_time_format);

  const handleSort = useCallback(
    (columnName: string) => {
      if (sortColumn === columnName) {
        setSortOrder(prevOrder =>
          prevOrder === ENUM_CONFIG.ASC ? ENUM_CONFIG.DESC : ENUM_CONFIG.ASC
        );
      } else {
        setSortColumn(columnName);
        setSortOrder(ENUM_CONFIG.ASC);
      }
      if (enablePagination) setCurrentPage(1);
    },
    [sortColumn, enablePagination]
  );

  const handleRefresh = () => {
    setSearchTerm('');
    setSortColumn(defaultSortColumn);
    setSortOrder(defaultSortOrder);
    if (enablePagination) {
      setCurrentPage(1);
    }
    if (onRefresh) {
      onRefresh();
    } else {
      setRefreshKey(prevKey => prevKey + 1);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy ID: ', err);
      });
  };

  const handlePageChange = (newPage: number) => {
    if (enablePagination && newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleExport = () => {
    // TODO: 实现导出功能
    console.log('Export refunds', {
      searchTerm,
      sortColumn,
      sortOrder,
      baseApiParams,
      accessibleMerchantIds,
    });
  };

  const internalOnRefundSelect = (refund: ApiRefund) => {
    if (onViewDetail) {
      onViewDetail(refund.payment_id, 'payment', 'refund-list');
    } else {
      handleCopyId(refund.id);
      console.log('Refund selected (default action: copied ID):', refund.id);
    }
  };

  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
    setRefreshKey(k => k + 1);
  };

  useEffect(() => {
    const fetchRefunds = async () => {
      setIsLoading(true);
      setError(null);
      const accessCheck = checkUserAccess();
      if (!accessCheck.shouldProceed) {
        setError(accessCheck.error);
        setRefunds([]);
        setTotalItems(0);
        setIsLoading(false);
        return;
      }
      try {
        const params = new URLSearchParams();
        if (enablePagination) {
          params.append('page', currentPage.toString());
          params.append('limit', itemsPerPage.toString());
        } else if (displayLimit) {
          params.append('page', '1');
          params.append('limit', displayLimit.toString());
        } else {
          params.append('page', '1');
          params.append('limit', initialItemsPerPage.toString());
        }
        params.append('orderBy', sortColumn);
        params.append('orderDirection', sortOrder.toUpperCase());
        if (searchTerm.trim()) {
          params.append('refund_id', searchTerm.trim());
          params.append('order_id', searchTerm.trim());
        }
        if (baseApiParams) {
          for (const key in baseApiParams) {
            if (Object.prototype.hasOwnProperty.call(baseApiParams, key)) {
              params.append(key, String(baseApiParams[key]));
            }
          }
        } else {
          if (selectedMerchant) {
            params.append('merchant_id', selectedMerchant);
          } else if (accessibleMerchantIds) {
            let merchantIdParamValue: string | null = null;
            if (Array.isArray(accessibleMerchantIds)) {
              if (accessibleMerchantIds.length > 0) {
                merchantIdParamValue = accessibleMerchantIds.join(',');
              }
            } else if (typeof accessibleMerchantIds === 'string') {
              merchantIdParamValue = accessibleMerchantIds;
            }
            if (merchantIdParamValue) {
              params.append('merchant_id', merchantIdParamValue);
            }
          }
          if (selectedBank) params.append('bank_id', selectedBank);
          if (selectedCurrency) params.append('currency', selectedCurrency);
          if (selectedMethod) params.append('method_id', selectedMethod);
          if (selectedStatus) params.append('status', selectedStatus);
          if (selectedDateRange) {
            if (selectedDateRange.start) {
              params.append(
                'start',
                `${getUtcDate(selectedDateRange.start.toString(), true).toISOString()}`
              );
            }
            if (selectedDateRange.end) {
              params.append(
                'end',
                `${getUtcDate(selectedDateRange.end.toString(), false).toISOString()}`
              );
            }
          }
        }
        const apiUrl =
          CONFIG.API_BASE_URL + API_ROUTES.REFUNDS + `?${params.toString()}`;
        const response = await authFetch(apiUrl);
        if (!response) return;
        let result: any;
        try {
          result = await response.json();
        } catch {
          result = { message: 'Failed to fetch refunds' };
        }
        if (!response.ok) {
          throw new Error(
            result.message || `HTTP error! status: ${response.status}`
          );
        }
        setRefunds(result.data || []);
        if (enablePagination) {
          setTotalItems(result.total || 0);
        } else {
          setTotalItems(result.data?.length || 0);
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
        setRefunds([]);
        setTotalItems(0);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRefunds();
  }, [
    logout,
    accessibleMerchantIds,
    refreshKey,
    currentPage,
    itemsPerPage,
    sortColumn,
    sortOrder,
    searchTerm,
    baseApiParams,
    enablePagination,
    displayLimit,
    initialItemsPerPage,
    externalRefreshKey,
    selectedMerchant,
    selectedBank,
    selectedCurrency,
    selectedMethod,
    selectedStatus,
    selectedDateRange,
  ]);

  useEffect(() => {
    setSelectedIds(new Set<string>());
  }, [refunds]);

  const refundsToDisplay = useMemo(() => {
    return !enablePagination && displayLimit && refunds.length > displayLimit
      ? refunds.slice(0, displayLimit)
      : refunds;
  }, [refunds, enablePagination, displayLimit]);

  const refundListActions: ActionItem[] = [
    {
      label: 'Refresh',
      icon: <ArrowPathIcon className={isLoading ? 'animate-spin' : ''} />,
      onClick: handleRefresh,
      disabled: isLoading,
    },
  ];
  if (enablePagination) {
    refundListActions.push({
      label: 'Export',
      icon: <ArrowUpOnSquareIcon />,
      onClick: handleExport,
      disabled: isLoading || refundsToDisplay.length === 0,
    });
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(refundsToDisplay.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllOnPageSelected = useMemo(() => {
    return (
      refundsToDisplay.length > 0 &&
      refundsToDisplay.every(w => selectedIds.has(w.id))
    );
  }, [refundsToDisplay, selectedIds]);

  const isIndeterminate = useMemo(() => {
    return selectedIds.size > 0 && !isAllOnPageSelected;
  }, [selectedIds, isAllOnPageSelected]);

  // 表格列定义
  const columns: ListColumn<ApiRefund>[] = [
    // { key: 'refund_id', title: 'Refund ID', sortable: showSearchBar, render: (v: string, row: ApiRefund) => (
    //   <div className="flex items-center space-x-1.5">
    //       {maskedLongID(row.id)}
    //     <CopyButton
    //       value={row.id}
    //       copied={copiedId === row.id}
    //       onCopied={() => {
    //         setCopiedId(row.id);
    //         setTimeout(() => setCopiedId(null), 2000);
    //       }}
    //       title="Copy full ID"
    //     />
    //   </div>
    // ) },
    {
      key: 'payment_id',
      title: 'Payment ID',
      sortable: showSearchBar,
      render: (v: string, row: ApiRefund) => (
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => internalOnRefundSelect(row)}
            className="text-sky-600 dark:text-sky-400 font-medium hover:underline cursor-pointer"
            title={row.payment_id}
          >
            {row.payment_id ? maskedLongID(row.payment_id) : '-'}
          </button>
          <CopyButton
            value={row.payment_id}
            copied={copiedId === row.payment_id}
            onCopied={() => {
              setCopiedId(row.payment_id);
              setTimeout(() => setCopiedId(null), 2000);
            }}
            title="Copy Payment ID"
          />
        </div>
      ),
    },
    { key: 'merchant_name', title: 'Merchant', sortable: showSearchBar },
    { key: 'bank_name', title: 'Bank', sortable: showSearchBar },
    {
      key: 'amount',
      title: 'Amount',
      sortable: showSearchBar,
      align: 'right' as const,
    },
    { key: 'currency_code', title: 'Currency', sortable: showSearchBar },
    { key: 'type', title: 'Type', sortable: showSearchBar },
    {
      key: 'status',
      title: 'Status',
      sortable: showSearchBar,
      render: (v: string, row: ApiRefund) => (
        <RefundStatusBadge status={row.status} />
      ),
    },
    {
      key: 'created_at',
      title: 'Created At',
      sortable: showSearchBar,
      render: (v: string) => formatDateByUserLocal(v),
    },
  ];

  const handleMerchantChange = (v: string) => {
    setSelectedMerchant(v);
    setCurrentPage(1);
  };
  const handleBankChange = (v: string) => {
    setSelectedBank(v);
    setCurrentPage(1);
  };
  const handleCurrencyChange = (v: string) => {
    setSelectedCurrency(v);
    setCurrentPage(1);
  };
  const handleMethodChange = (v: string) => {
    setSelectedMethod(v);
    setCurrentPage(1);
  };
  const handleStatusChange = (v: string) => {
    setSelectedStatus(v);
    setCurrentPage(1);
  };

  const filters = (
    <>
      {allMerchants.length > 1 && (
        <CommonSelect
          value={selectedMerchant}
          onChange={handleMerchantChange}
          options={allMerchants}
          placeholder="Merchant"
        />
      )}
      <CommonSelect
        value={selectedBank}
        onChange={handleBankChange}
        options={allBanks}
        placeholder="Bank"
      />
      <CommonSelect
        value={selectedCurrency}
        onChange={handleCurrencyChange}
        valueKey="code"
        labelKey="code"
        options={allCurrencies}
        placeholder="Currency"
      />
      <CommonSelect
        value={selectedMethod}
        onChange={handleMethodChange}
        options={allMethods}
        placeholder="Method"
      />
      <CommonSelect
        value={selectedStatus}
        onChange={handleStatusChange}
        options={allStatuses}
        placeholder="Status"
      />
      <CustomDateRangePicker
        value={selectedDateRange}
        onChange={setSelectedDateRange}
      />
    </>
  );

  return (
    <RemotePagingList
      listTitle={listTitle}
      showSearchBar={showSearchBar}
      columns={columns}
      data={refundsToDisplay}
      totalItems={totalItems}
      isLoading={isLoading}
      error={error}
      searchTerm={searchTerm}
      onSearchTermChange={handleSearchTermChange}
      searchPlaceholder={searchPlaceholder}
      filters={filters}
      actions={refundListActions}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      sortColumn={sortColumn}
      sortOrder={sortOrder}
      onSort={handleSort}
      showCheckboxColumn={showCheckboxColumn}
      selectedIds={selectedIds}
      onSelectAll={handleSelectAll}
      onSelectRow={handleSelectItem}
      isAllOnPageSelected={isAllOnPageSelected}
      isIndeterminate={isIndeterminate}
      onRefresh={handleRefresh}
    />
  );
};

export default RefundList;
