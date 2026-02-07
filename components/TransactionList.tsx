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
  ArrowUpTrayIcon,
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
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// 通用交易类型
export interface Transaction {
  id: string;
  order_id?: string;
  payment_id?: string;
  merchant_id: string;
  merchant_name: string;
  bank_id?: string;
  bank_name?: string;
  amount: string;
  currency_code: string;
  method_id?: string;
  method_name?: string;
  status: string;
  created_at: string;
  // refund 特有
  type?: string;
  has_refund?: boolean;
}

export type TransactionType = 'payment' | 'withdrawal' | 'refund';

interface TransactionListProps {
  type: TransactionType;
  listTitle?: string;
  initialItemsPerPage?: number;
  enablePagination?: boolean;
  showSearchBar?: boolean;
  onClear?: (value: string) => void;
  onViewTransactionDetail?: (
    id: string,
    type: TransactionType,
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

// 状态 Badge 渲染
const StatusBadge = ({
  status,
  type,
}: {
  status: string;
  type: TransactionType;
}) => {
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
    case 'submitted':
      colorClasses =
        'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400';
      IconComponent = <PaperAirplaneIcon className="h-3.5 w-3.5 mr-1" />;
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

const apiRouteMap = {
  payment: API_ROUTES.PAYMENTS,
  withdrawal: API_ROUTES.WITHDRAWALS,
  refund: API_ROUTES.REFUNDS,
};

const TransactionList = ({
  type,
  listTitle = '',
  initialItemsPerPage = DEFAULT_PAGE_SIZE,
  enablePagination = true,
  showSearchBar = true,
  onClear,
  onViewTransactionDetail,
  baseApiParams,
  searchPlaceholder,
  defaultSortColumn = 'created_at',
  defaultSortOrder = ENUM_CONFIG.DESC,
  displayLimit,
  onRefresh,
  externalRefreshKey,
  showCheckboxColumn = false,
}: TransactionListProps) => {
  const { logout, user } = useAuth();
  const { checkUserAccess, accessibleMerchantIds } = useMerchantAccess();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get('view');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
      let methodType = type;
      if (type === 'refund') methodType = 'refund';
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
            `?enabled=true&type=${methodType}`
        ),
      ]);
      setAllMerchants(merchants);
      setAllBanks(banks);
      setAllCurrencies(currencies);
      setAllMethods(methods);
      // 状态枚举
      if (type === 'payment') {
        setAllStatuses(
          Object.values(PAYMENT_STATUS).map(status => ({
            id: status,
            name: status.charAt(0).toUpperCase() + status.slice(1),
          }))
        );
      } else {
        setAllStatuses([
          { id: 'pending', name: 'Pending' },
          { id: 'success', name: 'Success' },
          { id: 'failed', name: 'Failed' },
        ]);
      }
    } catch (e) {
      console.error('Error fetching basic data:', e);
    }
  }, [type]);

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

  const handleExportPDF = async () => {
    try {
      const data = await fetchTransactions({ isExport: true });
      if (!data || data.length === 0) return;

      const doc = new jsPDF({ orientation: 'landscape' });

      // Step 1: 获取所有字段名作为列头
      const columns = Object.keys(data[0]);

      // Step 2: 生成行数据
      const body = data.map((row: any) => columns.map((col: any) => row[col]));

      // Step 3: 导出 PDF
      autoTable(doc, {
        head: [columns],
        body,
        styles: {
          fontSize: 8,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [33, 150, 243],
        },
      });

      doc.save(`${type}s.pdf`);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  const handleExportCSV = async () => {
    try {
      const data = await fetchTransactions({ isExport: true });
      if (!data || !Array.isArray(data) || data.length === 0) {
        alert('No data to export');
        return;
      }
      const csv = Papa.unparse(data);
      const blob = new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8;',
      });
      saveAs(blob, `${type}s.csv`);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  const internalOnTransactionSelect = (id: string) => {
    if (onViewTransactionDetail) {
      onViewTransactionDetail(id, type, `${type}-list`);
    } else {
      handleCopyId(id);
      console.log('Transaction selected (default action: copied ID):', id);
    }
  };

  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
    setRefreshKey(k => k + 1);
  };

  const fetchTransactions = async (extraParams: Record<string, any> = {}) => {
    setIsLoading(true);
    setError(null);
    const accessCheck = checkUserAccess();
    if (!accessCheck.shouldProceed) {
      setError(accessCheck.error);
      setTransactions([]);
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
        if (type === 'payment') {
          params.append('payment_id', searchTerm.trim());
          params.append('order_id', searchTerm.trim());
        } else if (type === 'withdrawal') {
          params.append('withdrawal_id', searchTerm.trim());
          params.append('order_id', searchTerm.trim());
        } else if (type === 'refund') {
          params.append('payment_id', searchTerm.trim());
          params.append('refund_id', searchTerm.trim());
        }
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
      // 添加额外参数
      Object.entries(extraParams).forEach(([key, value]) => {
        params.append(key, String(value));
      });

      const apiUrl =
        CONFIG.API_BASE_URL + apiRouteMap[type] + `?${params.toString()}`;
      const response = await authFetch(apiUrl);
      if (!response) return;
      let result: any;
      try {
        result = await response.json();
      } catch {
        result = { message: 'Failed to fetch transactions' };
      }
      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }
      // 默认行为：设置 state
      if (!extraParams.isExport) {
        setTransactions(result.data || []);
        if (enablePagination) {
          setTotalItems(result.total || 0);
        } else {
          setTotalItems(result.data?.length || 0);
        }
      }
      // 返回数据
      return result.data || [];
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setTransactions([]);
      setTotalItems(0);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
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
    type,
  ]);

  useEffect(() => {
    setSelectedIds(new Set<string>());
  }, [transactions]);

  const transactionsToDisplay = useMemo(() => {
    return !enablePagination &&
      displayLimit &&
      transactions.length > displayLimit
      ? transactions.slice(0, displayLimit)
      : transactions;
  }, [transactions, enablePagination, displayLimit]);

  // 动态表头
  const columns: ListColumn<Transaction>[] = useMemo(() => {
    const base: ListColumn<Transaction>[] = [
      // id 列
      {
        key:
          type === 'refund'
            ? 'payment_id'
            : type === 'withdrawal'
              ? 'id'
              : 'id',
        title:
          type === 'payment'
            ? 'Payment ID'
            : type === 'withdrawal'
              ? 'Withdrawal ID'
              : 'Payment ID',
        sortable: showSearchBar,
        render: (v: string, row: Transaction) => (
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() =>
                internalOnTransactionSelect(
                  type === 'refund' ? row.payment_id || '' : row.id
                )
              }
              className="text-sky-600 dark:text-sky-400 font-medium hover:underline cursor-pointer"
              title={type === 'refund' ? row.payment_id : row.id}
            >
              {type === 'refund'
                ? row.payment_id
                  ? maskedLongID(row.payment_id)
                  : '-'
                : maskedLongID(row.id)}
            </button>
            <CopyButton
              value={type === 'refund' ? row.payment_id || '' : row.id}
              copied={
                copiedId === (type === 'refund' ? row.payment_id || '' : row.id)
              }
              onCopied={() => {
                setCopiedId(type === 'refund' ? row.payment_id || '' : row.id);
                setTimeout(() => setCopiedId(null), 2000);
              }}
              title={type === 'refund' ? 'Copy Payment ID' : 'Copy full ID'}
            />
          </div>
        ),
      },
      {
        key: type === 'refund' ? 'id' : 'order_id',
        title: type === 'refund' ? 'Refund ID' : 'Order ID',
        sortable: showSearchBar,
        render: (v: string, row: Transaction) => (
          <div className="flex items-center space-x-1.5">
            {type === 'refund'
              ? maskedLongID(row.id)
              : row.order_id
                ? maskedLongID(row.order_id)
                : '-'}
            <CopyButton
              value={type === 'refund' ? row.id || '' : row.order_id || ''}
              copied={
                copiedId ===
                (type === 'refund' ? row.id || '' : row.order_id || '')
              }
              onCopied={() => {
                setCopiedId(
                  type === 'refund' ? row.id || '' : row.order_id || ''
                );
                setTimeout(() => setCopiedId(null), 2000);
              }}
              title={type === 'refund' ? 'Copy Refund ID' : 'Copy Order ID'}
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
      ...(type !== 'refund'
        ? [{ key: 'method_name', title: 'Method', sortable: showSearchBar }]
        : []),
      {
        key: 'status',
        title: 'Status',
        sortable: showSearchBar,
        render: (v: string, row: Transaction) => (
          <div className="flex items-center space-x-1.5">
            <StatusBadge status={row.status} type={type} />
            {row.has_refund && (
              <span className="rounded-full px-1 py-1 bg-amber-100 text-amber-700 dark:bg-amber-700 dark:bg-opacity-25 dark:text-amber-400">
                <ArrowUpTrayIcon className="h-3 w-3" title="Has Refund" />{' '}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'created_at',
        title: 'Created At',
        sortable: showSearchBar,
        render: (v: string) => formatDateByUserLocal(v),
      },
    ];
    if (type === 'refund') {
      base.splice(6, 0, {
        key: 'type',
        title: 'Type',
        sortable: showSearchBar,
      });
    }
    return base;
  }, [type, showSearchBar, copiedId]);

  // 动态筛选项
  const filters = (
    <>
      {allMerchants.length > 1 && (
        <CommonSelect
          value={selectedMerchant}
          onChange={v => {
            setSelectedMerchant(v);
            setCurrentPage(1);
          }}
          options={allMerchants}
          placeholder="Merchant"
        />
      )}
      <CommonSelect
        value={selectedBank}
        onChange={v => {
          setSelectedBank(v);
          setCurrentPage(1);
        }}
        options={allBanks}
        placeholder="Bank"
      />
      <CommonSelect
        value={selectedCurrency}
        onChange={v => {
          setSelectedCurrency(v);
          setCurrentPage(1);
        }}
        valueKey="code"
        labelKey="code"
        options={allCurrencies}
        placeholder="Currency"
      />
      <CommonSelect
        value={selectedMethod}
        onChange={v => {
          setSelectedMethod(v);
          setCurrentPage(1);
        }}
        options={allMethods}
        placeholder="Method"
      />
      <CommonSelect
        value={selectedStatus}
        onChange={v => {
          setSelectedStatus(v);
          setCurrentPage(1);
        }}
        options={allStatuses}
        placeholder="Status"
      />
      <CustomDateRangePicker
        value={selectedDateRange}
        onChange={setSelectedDateRange}
      />
    </>
  );

  const actions: ActionItem[] = [
    {
      label: 'Refresh',
      icon: <ArrowPathIcon className={isLoading ? 'animate-spin' : ''} />,
      onClick: handleRefresh,
      disabled: isLoading,
    },
  ];
  if (enablePagination) {
    actions.push(
      {
        label: 'Export CSV',
        icon: <ArrowUpOnSquareIcon />,
        onClick: handleExportCSV,
        disabled: isLoading || transactionsToDisplay.length === 0,
      },
      {
        label: 'Export PDF',
        icon: <ArrowUpOnSquareIcon />,
        onClick: handleExportPDF,
        disabled: isLoading || transactionsToDisplay.length === 0,
      }
    );
  }

  const isAllOnPageSelected = useMemo(() => {
    return (
      transactionsToDisplay.length > 0 &&
      transactionsToDisplay.every(p => selectedIds.has(p.id))
    );
  }, [transactionsToDisplay, selectedIds]);

  const isIndeterminate = useMemo(() => {
    return selectedIds.size > 0 && !isAllOnPageSelected;
  }, [selectedIds, isAllOnPageSelected]);

  return (
    <RemotePagingList
      listTitle={listTitle}
      showSearchBar={showSearchBar}
      columns={columns}
      data={transactionsToDisplay}
      totalItems={totalItems}
      isLoading={isLoading}
      error={error}
      searchTerm={searchTerm}
      onSearchTermChange={handleSearchTermChange}
      searchPlaceholder={searchPlaceholder}
      filters={filters}
      actions={actions}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      sortColumn={sortColumn}
      sortOrder={sortOrder}
      onSort={handleSort}
      showCheckboxColumn={showCheckboxColumn}
      selectedIds={selectedIds}
      onSelectAll={checked => {
        if (checked) {
          setSelectedIds(new Set(transactionsToDisplay.map(item => item.id)));
        } else {
          setSelectedIds(new Set());
        }
      }}
      onSelectRow={(id, checked) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
          newSelected.add(id);
        } else {
          newSelected.delete(id);
        }
        setSelectedIds(newSelected);
      }}
      isAllOnPageSelected={isAllOnPageSelected}
      isIndeterminate={isIndeterminate}
      onRefresh={handleRefresh}
    />
  );
};

export default TransactionList;
