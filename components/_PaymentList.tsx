'use client';

import {
  CheckCircleIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
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
import {
  CONFIG,
  ENUM_CONFIG,
  PAYMENT_STATUS,
  DEFAULT_PAGE_SIZE,
} from '../constants/config';
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
import { TransactionStatusBadge } from './Common';

// Interface for a single payment record
export interface ApiPayment {
  id: string;
  order_id: string;
  bank_tx_id: string | null;
  merchant_id: string;
  merchant_name: string;
  bank_id: string;
  bank_name: string;
  amount: string;
  currency_code: string;
  method_id: string;
  method_name: string;
  // channel: string | null;
  status: string;
  created_at: string;
  // updated_at: string;
}

// New Props for the self-contained PaymentList component
interface PaymentListProps {
  listTitle?: string;
  initialItemsPerPage?: number;
  enablePagination?: boolean;
  showSearchBar?: boolean;
  onClear?: (value: string) => void;
  onViewDetail?: (
    paymentId: string,
    sourceType: string,
    sourceView: string
  ) => void; // Allow passing full payment data
  baseApiParams?: Record<string, string | number | boolean>;
  searchPlaceholder?: string;
  defaultSortColumn?: string;
  defaultSortOrder?: ENUM_CONFIG.ASC | ENUM_CONFIG.DESC;
  displayLimit?: number; // Kept for dashboard-like scenarios where pagination is off but limit is desired
  onRefresh?: () => void; // 新增
  externalRefreshKey?: any; // 新增
  showCheckboxColumn?: boolean; // 新增: 控制是否显示复选框列
}

const PaymentList = ({
  listTitle = '',
  initialItemsPerPage = DEFAULT_PAGE_SIZE,
  enablePagination = false,
  showSearchBar = false,
  onClear,
  onViewDetail,
  baseApiParams,
  searchPlaceholder = 'Search by Payment ID or Order ID...',
  defaultSortColumn = 'created_at',
  defaultSortOrder = ENUM_CONFIG.DESC,
  displayLimit, // If enablePagination is false, this can be used to limit items shown
  onRefresh, // 新增
  externalRefreshKey, // 新增
  showCheckboxColumn = false, // 新增: 默认显示复选框
}: PaymentListProps) => {
  const { logout, user } = useAuth();
  const { checkUserAccess, accessibleMerchantIds } = useMerchantAccess();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get('view');

  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState(new Set<string>()); // 新增: 用于跟踪选中的行

  const [sortColumn, setSortColumn] = useState<string>(defaultSortColumn);
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(defaultSortOrder);

  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const [searchTerm, setSearchTerm] = useState('');

  // 新增：4个筛选状态
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // 新增：缓存所有选项
  const [allMerchants, setAllMerchants] = useState<any[]>([]);
  const [allBanks, setAllBanks] = useState<any[]>([]);
  const [allCurrencies, setAllCurrencies] = useState<any[]>([]);
  const [allMethods, setAllMethods] = useState<any[]>([]);
  const [allStatuses, setAllStatuses] = useState<any[]>([]);
  // const [selectedDateRange, setSelectedDateRange] = useState<RangeValue<CalendarDate>>();
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
      // 使用缓存的基础数据
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
            '?enabled=true&type=payment'
        ),
      ]);

      setAllMerchants(merchants);
      setAllBanks(banks);
      setAllCurrencies(currencies);
      setAllMethods(methods);

      const resStatuses = Object.values(PAYMENT_STATUS).map(status => ({
        id: status,
        name: status.charAt(0).toUpperCase() + status.slice(1), // 自动格式化 label
      }));
      setAllStatuses(resStatuses);
    } catch (e) {
      // 可以根据需要添加错误处理
      console.error('Error fetching basic data:', e);
    }
  }, []);

  // 初始化获取基础数据
  useEffect(() => {
    fetchAllOptions();
  }, [pathname, view, externalRefreshKey, fetchAllOptions]);

  // 监听全局刷新事件
  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchAllOptions();
    };

    window.addEventListener('refreshBasicData', handleGlobalRefresh);

    return () => {
      window.removeEventListener('refreshBasicData', handleGlobalRefresh);
    };
  }, [fetchAllOptions]);

  // Update itemsPerPage if initialItemsPerPage prop changes (e.g. for different list instances)
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
    // 清空搜索条件
    setSearchTerm('');
    // 重置排序
    setSortColumn(defaultSortColumn);
    setSortOrder(defaultSortOrder);
    // 重置分页
    if (enablePagination) {
      setCurrentPage(1);
    }
    // 调用刷新
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

  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    if (enablePagination) setCurrentPage(1);
  };

  const handleExport = () => {
    console.log(
      'Export functionality triggered for payments with current filters:',
      {
        searchTerm,
        sortColumn,
        sortOrder,
        baseApiParams,
        accessibleMerchantIds,
      }
    );
    // Actual export logic to be implemented
  };

  const internalOnPaymentSelect = (payment: ApiPayment) => {
    if (onViewDetail) {
      onViewDetail(payment.id, 'payment', 'payment-list');
    } else {
      // Default action if no specific handler is provided (e.g., copy ID)
      handleCopyId(payment.id);
      console.log('Payment selected (default action: copied ID):', payment.id);
    }
  };

  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
    setRefreshKey(k => k + 1);
  };

  useEffect(() => {
    const fetchPayments = async () => {
      setIsLoading(true);
      setError(null);

      // 检查用户权限
      const accessCheck = checkUserAccess();
      if (!accessCheck.shouldProceed) {
        setError(accessCheck.error);
        setPayments([]);
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
          // Use displayLimit if pagination is off but a limit is set
          params.append('page', '1'); // Always page 1 if not paginating
          params.append('limit', displayLimit.toString());
        } else {
          params.append('page', '1');
          params.append('limit', initialItemsPerPage.toString());
        }
        params.append('orderBy', sortColumn);
        params.append('orderDirection', sortOrder.toUpperCase());
        if (searchTerm.trim()) {
          params.append('payment_id', searchTerm.trim());
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
          CONFIG.API_BASE_URL + API_ROUTES.PAYMENTS + `?${params.toString()}`;
        const response = await authFetch(apiUrl);
        if (!response) return;
        let result: any;
        try {
          result = await response.json();
        } catch {
          result = { message: 'Failed to fetch payments' };
        }
        if (!response.ok) {
          throw new Error(
            result.message || `HTTP error! status: ${response.status}`
          );
        }
        setPayments(result.data || []);
        if (enablePagination) {
          setTotalItems(result.total || 0);
        } else {
          setTotalItems(result.data?.length || 0);
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
        setPayments([]);
        setTotalItems(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
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

  // Effect to reset selections if the core payment data changes (e.g., after fetch, sort, filter, page change)
  useEffect(() => {
    setSelectedIds(new Set<string>());
  }, [payments]); // Listen to changes in the raw 'payments' data

  const paymentsToDisplay = useMemo(() => {
    return !enablePagination && displayLimit && payments.length > displayLimit
      ? payments.slice(0, displayLimit)
      : payments;
  }, [payments, enablePagination, displayLimit]);

  // Define actions for the ActionsDropdown AFTER paymentsToDisplay is defined
  const paymentListActions: ActionItem[] = [
    {
      label: 'Refresh',
      icon: <ArrowPathIcon className={isLoading ? 'animate-spin' : ''} />,
      onClick: handleRefresh,
      disabled: isLoading,
    },
  ];

  if (enablePagination) {
    paymentListActions.push({
      label: 'Export',
      icon: <ArrowUpOnSquareIcon />,
      onClick: handleExport,
      disabled: isLoading || paymentsToDisplay.length === 0, // Now safe to use paymentsToDisplay
    });
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paymentsToDisplay.map(item => item.id)));
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
      paymentsToDisplay.length > 0 &&
      paymentsToDisplay.every(p => selectedIds.has(p.id))
    );
  }, [paymentsToDisplay, selectedIds]);

  // 新增：部分选中时横线
  const isIndeterminate = useMemo(() => {
    return selectedIds.size > 0 && !isAllOnPageSelected;
  }, [selectedIds, isAllOnPageSelected]);

  // 表格列定义
  const columns: ListColumn<ApiPayment>[] = [
    {
      key: 'payment_id',
      title: 'Payment ID',
      sortable: showSearchBar,
      render: (v: string, row: ApiPayment) => (
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => internalOnPaymentSelect(row)}
            className="text-sky-600 dark:text-sky-400 font-medium hover:underline cursor-pointer"
            title={row.id}
          >
            {maskedLongID(row.id)}
          </button>
          <CopyButton
            value={row.id}
            copied={copiedId === row.id}
            onCopied={() => {
              setCopiedId(row.id);
              setTimeout(() => setCopiedId(null), 2000);
            }}
            title="Copy full ID"
          />
        </div>
      ),
    },
    {
      key: 'order_id',
      title: 'Order ID',
      sortable: showSearchBar,
      render: (v: string, row: ApiPayment) => (
        <div className="flex items-center space-x-1.5">
          {maskedLongID(row.order_id)}
          <CopyButton
            value={row.order_id}
            copied={copiedId === row.order_id}
            onCopied={() => {
              setCopiedId(row.order_id);
              setTimeout(() => setCopiedId(null), 2000);
            }}
            title="Copy Order ID"
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
    { key: 'method_name', title: 'Method', sortable: showSearchBar },
    {
      key: 'status',
      title: 'Status',
      sortable: showSearchBar,
      render: (v: string, row: ApiPayment) => (
        <TransactionStatusBadge status={row.status} />
      ),
    },
    {
      key: 'created_at',
      title: 'Created At',
      sortable: showSearchBar,
      render: (v: string) => formatDateByUserLocal(v),
    },
  ];

  // 修改所有CommonSelect的onChange，使其在更新筛选状态的同时setCurrentPage(1)
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

  // 在filters中使用这些handleXxxChange
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
      data={paymentsToDisplay}
      totalItems={totalItems}
      isLoading={isLoading}
      error={error}
      searchTerm={searchTerm}
      onSearchTermChange={handleSearchTermChange}
      searchPlaceholder={searchPlaceholder}
      filters={filters}
      actions={paymentListActions}
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

export default PaymentList;
