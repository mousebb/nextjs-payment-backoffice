import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from './AuthContext';
import {
  CONFIG,
  ENUM_CONFIG,
  DEFAULT_PAGE_SIZE,
  TRANSACTION_SOURCE_TYPE,
  SOURCE_ACTION,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import {
  authFetch,
  getUtcDate,
  maskedLongID,
  formatDateByUser,
} from '@/lib/utils';
import { getBasicData } from '@/lib/basic-data.service';
import RemotePagingList from './RemotePagingList';
import { ListColumn } from '../types/list';
import CommonSelect from './CommonSelect';
import CustomDateRangePicker from './CustomDateRangePicker';
import CopyButton from './CopyButton';
import type { RangeValue } from '@react-types/shared';
import { CalendarDate } from '@internationalized/date';
import { usePermission } from '@/hooks/usePermission';
import { useTranslations } from 'next-intl';
import { AmountStyleBadge, TransactionTypeBadge } from './Common';
import { useBasicData } from '@/hooks/useBasicData';

interface AccountTransaction {
  id: string;
  merchant_account_id: string;
  merchant_name: string;
  currency_code: string;
  source_type: string;
  amount: string;
  balance_before: string;
  balance_after: string;
  description: string;
  source_id: string;
  created_at: string;
  source_action: string;
}

// 新增：Props 接口
interface AccountTransactionsListProps {
  onSourceIdSelect?: (
    sourceId: string,
    sourceType: string,
    sourceView: string
  ) => void;
}

const AccountTransactionsList: React.FC<AccountTransactionsListProps> = ({
  onSourceIdSelect,
}) => {
  const { logout, user } = useAuth();
  const { can } = usePermission();
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.DESC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / DEFAULT_PAGE_SIZE);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // 筛选项
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [selectedTransactionType, setSelectedTransactionType] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<
    RangeValue<CalendarDate>
  >(() => {
    const today = new CalendarDate(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate()
    );
    return { start: today.add({ days: -6 }), end: today };
  });

  // 下拉选项
  const [merchantOptions, setMerchantOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [currencyOptions, setCurrencyOptions] = useState<
    { id: string; name: string }[]
  >([]);

  const t = useTranslations();
  const transactionSourceTypeObj = t.raw
    ? t.raw('TransactionSourceType') // next-intl v4 支持 t.raw
    : {}; // 兼容性处理

  const transactionTypeOptions = useMemo(
    () =>
      Object.keys(transactionSourceTypeObj).map(key => ({
        id: key,
        name: t(`TransactionSourceType.${key}`),
      })),
    [t, transactionSourceTypeObj]
  );

  useEffect(() => {
    // 使用缓存的基础数据获取商户和货币
    const fetchBasicData = async () => {
      try {
        const [merchants, currencies] = await Promise.all([
          getBasicData(
            'merchants',
            CONFIG.API_BASE_URL + API_ROUTES.MERCHANTS_ACCESSIBLE
          ),
          getBasicData(
            'currencies',
            CONFIG.API_BASE_URL + API_ROUTES.CURRENCIES
          ),
        ]);

        setMerchantOptions(
          Array.isArray(merchants)
            ? merchants.map(m => ({ id: m.id, name: m.name }))
            : []
        );
        setCurrencyOptions(
          Array.isArray(currencies)
            ? currencies.map(c => ({ id: c.code, name: c.code }))
            : []
        );
      } catch (error) {
        console.error('Error fetching basic data:', error);
      }
    };

    if (
      can('merchant_account_transaction', 'view') &&
      can('currency', 'view')
    ) {
      fetchBasicData();
    }
  }, [can]);

  const handleMerchantChange = (v: string) => {
    setSelectedMerchant(v);
    setCurrentPage(1);
  };
  const handleCurrencyChange = (v: string) => {
    setSelectedCurrency(v);
    setCurrentPage(1);
  };
  const handleTransactionTypeChange = (v: string) => {
    setSelectedTransactionType(v);
    setCurrentPage(1);
  };
  const handleDateRangeChange = (v: RangeValue<CalendarDate>) => {
    setSelectedDateRange(v);
    setCurrentPage(1);
  };
  const handleRefresh = () => setRefreshKey(k => k + 1);
  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
    setRefreshKey(k => k + 1);
  };
  const handleSort = useCallback(
    (columnName: string) => {
      if (sortColumn === columnName) {
        setSortOrder(prev =>
          prev === ENUM_CONFIG.ASC ? ENUM_CONFIG.DESC : ENUM_CONFIG.ASC
        );
      } else {
        setSortColumn(columnName);
        setSortOrder(ENUM_CONFIG.ASC);
      }
      setCurrentPage(1);
    },
    [sortColumn]
  );

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', DEFAULT_PAGE_SIZE.toString());
        params.append('orderBy', sortColumn);
        params.append('orderDirection', sortOrder);
        // 搜索支持Source_id+transaction_type
        if (searchTerm.trim()) {
          params.append('source_id', searchTerm.trim());
        }
        if (selectedMerchant) params.append('merchant_id', selectedMerchant);
        if (selectedCurrency) params.append('currency_code', selectedCurrency);
        if (selectedTransactionType)
          params.append('source_type', selectedTransactionType);
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
        const apiUrl =
          CONFIG.API_BASE_URL +
          API_ROUTES.MERCHANT_ACCOUNTS_TRANSACTIONS +
          `?${params.toString()}`;
        const response = await authFetch(apiUrl);
        if (!response) {
          // authFetch 返回 null 表示 CSRF token 过期，已经自动跳转到登录页面
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch account transactions' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result = await response.json();
        setTransactions(result.data || []);
        setTotalItems(result.total || 0);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, [
    refreshKey,
    currentPage,
    sortColumn,
    sortOrder,
    searchTerm,
    selectedMerchant,
    selectedCurrency,
    selectedTransactionType,
    selectedDateRange,
  ]);

  const columns: ListColumn<AccountTransaction>[] = [
    { key: 'merchant_name', title: 'Merchant', sortable: true },
    {
      key: 'source_type',
      title: 'Type',
      sortable: true,
      render: (v: string) => <TransactionTypeBadge type={v} />,
    },
    { key: 'source_action', title: 'Action', sortable: true },
    {
      key: 'source_id',
      title: 'Source ID',
      sortable: false,
      render: (v: string, row: AccountTransaction) => {
        if (!row.source_id) {
          return <span className="text-gray-400">-</span>;
        }

        let shouldBeClickable = true;
        let detailSourceType = '';
        if (
          row.source_type === 'payment' ||
          row.description?.toLowerCase().includes('payment')
        ) {
          detailSourceType = 'payment';
        } else if (
          row.source_type === 'refund' ||
          row.description?.toLowerCase().includes('refund')
        ) {
          detailSourceType = 'refund';
        } else if (
          row.source_type === 'chargeback' ||
          row.description?.toLowerCase().includes('chargeback')
        ) {
          detailSourceType = 'chargeback';
        } else if (
          row.source_type === 'withdrawal' ||
          row.description?.toLowerCase().includes('withdrawal')
        ) {
          detailSourceType = 'withdrawal';
        } else {
          shouldBeClickable = false;
        }

        if (shouldBeClickable && onSourceIdSelect) {
          return (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() =>
                  onSourceIdSelect(
                    row.source_id,
                    detailSourceType,
                    'account-transactions'
                  )
                }
                className="text-sky-600 dark:text-sky-400 font-medium hover:underline cursor-pointer"
                title={row.source_id}
              >
                {maskedLongID(row.source_id)}
              </button>
              <CopyButton
                value={row.source_id}
                copied={copiedId === row.source_id}
                onCopied={() => {
                  setCopiedId(row.source_id);
                  setTimeout(() => setCopiedId(null), 2000);
                }}
                title="Copy Source ID"
              />
            </div>
          );
        }

        // 不可点击的情况
        return (
          <div className="flex items-center space-x-1.5">
            {maskedLongID(row.source_id)}
            <CopyButton
              value={row.source_id}
              copied={copiedId === row.source_id}
              onCopied={() => {
                setCopiedId(row.source_id);
                setTimeout(() => setCopiedId(null), 2000);
              }}
              title="Copy Source ID"
            />
          </div>
        );
      },
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      align: 'right' as const,
      render: (v: string, row: AccountTransaction) => (
        <AmountStyleBadge content={v} action={row.source_action} />
      ),
    },
    { key: 'currency_code', title: 'Curr.', sortable: false },
    {
      key: 'balance_before',
      title: 'Bal. Bef.',
      sortable: true,
      align: 'right' as const,
      titleTooltip: 'Balance before',
    },
    {
      key: 'balance_after',
      title: 'Bal. Aft.',
      sortable: true,
      align: 'right' as const,
      titleTooltip: 'Balance after',
    },
    {
      key: 'reserved_balance_before',
      title: 'Res. Bal. Bef.',
      sortable: true,
      align: 'right' as const,
      titleTooltip: 'Reserved balance before',
    },
    {
      key: 'reserved_balance_after',
      title: 'Res. Bal. Aft.',
      sortable: true,
      align: 'right' as const,
      titleTooltip: 'Reserved balance after',
    },
    {
      key: 'created_at',
      title: 'Created At',
      sortable: true,
      render: (v: string) =>
        v ? formatDateByUser(v, user?.metadata?.data_time_format) : '-',
    },
  ];

  const actions = [
    {
      label: 'Refresh',
      icon: <ArrowPathIcon className="h-4 w-4" />,
      onClick: handleRefresh,
      disabled: isLoading,
    },
  ];

  // 搜索输入框和filters
  const filters = (
    <>
      {merchantOptions.length > 1 && (
        <CommonSelect
          value={selectedMerchant}
          onChange={handleMerchantChange}
          options={merchantOptions}
          placeholder="Merchant"
        />
      )}
      {can('currency', 'view') && (
        <CommonSelect
          value={selectedCurrency}
          onChange={handleCurrencyChange}
          options={currencyOptions}
          placeholder="Currency"
        />
      )}
      <CommonSelect
        value={selectedTransactionType}
        onChange={handleTransactionTypeChange}
        options={transactionTypeOptions}
        placeholder="Transaction Type"
      />
      <CustomDateRangePicker
        value={selectedDateRange}
        onChange={handleDateRangeChange}
      />
    </>
  );

  return (
    <RemotePagingList
      showSearchBar={true}
      columns={columns}
      data={transactions}
      totalItems={totalItems}
      isLoading={isLoading}
      error={error}
      searchTerm={searchTerm}
      onSearchTermChange={handleSearchTermChange}
      searchPlaceholder="Search by Source ID with transaction type..."
      filters={filters}
      actions={actions}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
      sortColumn={sortColumn}
      sortOrder={sortOrder}
      onSort={handleSort}
      showCheckboxColumn={false}
      onRefresh={handleRefresh}
    />
  );
};

export default AccountTransactionsList;
