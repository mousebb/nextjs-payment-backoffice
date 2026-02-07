import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from './AuthContext';
import { CONFIG, ENUM_CONFIG, DEFAULT_PAGE_SIZE } from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import {
  authFetch,
  formatDateByUser,
  getUtcDate,
  maskedLongID,
} from '@/lib/utils';
import RemotePagingList from './RemotePagingList';
import { ListColumn } from '../types/list';
import CommonSelect from './CommonSelect';
import CustomDateRangePicker from './CustomDateRangePicker';
import CopyButton from './CopyButton';
import type { RangeValue } from '@react-types/shared';
import { CalendarDate } from '@internationalized/date';
import { usePermission } from '@/hooks/usePermission';
import { useBasicData } from '@/hooks/useBasicData';

interface CommissionLog {
  id: string;
  agent_user_id: string;
  agent_username: string;
  merchant_id: string;
  merchant_name: string;
  transaction_type: string;
  transaction_id: string;
  currency_code: string;
  original_amount: string;
  commission_amount: string;
  rate: string | null;
  note: string;
  is_settled: boolean;
  settled_at: string | null;
  settlement_id: string | null;
  settlement_status: string | null;
  created_at: string;
  fixed: string;
}

interface AgentMerchantData {
  username: string;
  merchants: {
    merchant_id: string;
    merchant_name: string;
  }[];
}

interface MerchantsByAgentResponse {
  [agentId: string]: AgentMerchantData;
}

const CommissionLogsList: React.FC = () => {
  const { logout, user } = useAuth();
  const { can } = usePermission();
  const [logs, setLogs] = useState<CommissionLog[]>([]);
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
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [selectedSettlementStatus, setSelectedSettlementStatus] = useState('');
  const [selectedSettlementStatusDetail, setSelectedSettlementStatusDetail] = useState('');
  const [selectedTransactionType, setSelectedTransactionType] = useState('');
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

  // 下拉选项
  const [agentOptions, setAgentOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [merchantOptions, setMerchantOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [merchantsByAgent, setMerchantsByAgent] =
    useState<MerchantsByAgentResponse>({});

  const settlementStatusOptions = [
    { id: 'true', name: 'Settled' },
    { id: 'false', name: 'Not Settled' },
  ];

  const settlementStatusDetailOptions = [
    { id: 'pending', name: 'Pending' },
    { id: 'approved', name: 'Approved' },
    { id: 'completed', name: 'Completed' },
    { id: 'rejected', name: 'Rejected' },
    { id: 'null', name: '-' },
  ];

  const transactionTypeOptions = [
    { id: 'payment', name: 'Payment' },
    { id: 'withdrawal', name: 'Withdrawal' },
  ];

  useEffect(() => {
    // 获取 agents 和 merchants 数据
    const fetchAgentsAndMerchants = async () => {
      try {
        const response = await authFetch(
          CONFIG.API_BASE_URL + API_ROUTES.MERCHANTS_BY_AGENT
        );
        if (response && response.ok) {
          const data: MerchantsByAgentResponse = await response.json();
          setMerchantsByAgent(data);

          // 构建 agent 选项
          const agents = Object.entries(data).map(([agentId, agentData]) => ({
            id: agentId,
            name: agentData.username,
          }));
          setAgentOptions(agents);

          // 构建所有 merchants 选项
          const allMerchants = new Map<string, string>();
          Object.values(data).forEach(agentData => {
            agentData.merchants.forEach(merchant => {
              allMerchants.set(merchant.merchant_id, merchant.merchant_name);
            });
          });

          const merchants = Array.from(allMerchants.entries()).map(
            ([id, name]) => ({
              id,
              name,
            })
          );
          setMerchantOptions(merchants);
        } else {
          console.error('Failed to fetch agents and merchants data');
        }
      } catch (error) {
        console.error('Error fetching agents and merchants data:', error);
      }
    };

    if (can('commission_log', 'view')) {
      fetchAgentsAndMerchants();
    }
  }, [can]);

  // 当选择的 agent 改变时，更新 merchant 选项
  useEffect(() => {
    if (selectedAgent && merchantsByAgent[selectedAgent]) {
      const agentMerchants = merchantsByAgent[selectedAgent].merchants.map(
        merchant => ({
          id: merchant.merchant_id,
          name: merchant.merchant_name,
        })
      );
      setMerchantOptions(agentMerchants);

      // 如果当前选择的 merchant 不在新的选项中，清空选择
      if (
        selectedMerchant &&
        !agentMerchants.some(m => m.id === selectedMerchant)
      ) {
        setSelectedMerchant('');
      }
    } else {
      // 如果没有选择 agent，显示所有 merchants
      const allMerchants = new Map<string, string>();
      Object.values(merchantsByAgent).forEach(agentData => {
        agentData.merchants.forEach(merchant => {
          allMerchants.set(merchant.merchant_id, merchant.merchant_name);
        });
      });

      const merchants = Array.from(allMerchants.entries()).map(
        ([id, name]) => ({
          id,
          name,
        })
      );
      setMerchantOptions(merchants);
    }
  }, [selectedAgent, merchantsByAgent, selectedMerchant]);

  const handleAgentChange = (v: string) => {
    setSelectedAgent(v);
    setCurrentPage(1);
  };
  const handleMerchantChange = (v: string) => {
    setSelectedMerchant(v);
    setCurrentPage(1);
  };
  const handleSettlementStatusChange = (v: string) => {
    setSelectedSettlementStatus(v);
    setCurrentPage(1);
  };
  const handleSettlementStatusDetailChange = (v: string) => {
    setSelectedSettlementStatusDetail(v);
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
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', DEFAULT_PAGE_SIZE.toString());
        params.append('orderBy', sortColumn);
        params.append('orderDirection', sortOrder);

        // 搜索条件
        if (searchTerm.trim()) {
          params.append('transaction_id', searchTerm.trim());
        }
        if (selectedAgent) params.append('agent_user_id', selectedAgent);
        if (selectedMerchant) params.append('merchant_id', selectedMerchant);
        if (selectedSettlementStatus)
          params.append('is_settled', selectedSettlementStatus);
        if (selectedSettlementStatusDetail) {
          if (selectedSettlementStatusDetail === 'null') {
            params.append('settlement_status', 'null');
          } else {
            params.append('settlement_status', selectedSettlementStatusDetail);
          }
        }
        if (selectedTransactionType)
          params.append('transaction_type', selectedTransactionType);
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
          API_ROUTES.COMMISSION_LOGS +
          `?${params.toString()}`;
        const response = await authFetch(apiUrl);
        if (!response) {
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch commission logs' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result = await response.json();
        setLogs(result.data || []);
        setTotalItems(result.total || 0);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [
    refreshKey,
    currentPage,
    sortColumn,
    sortOrder,
    searchTerm,
    selectedAgent,
    selectedMerchant,
    selectedSettlementStatus,
    selectedSettlementStatusDetail,
    selectedTransactionType,
    selectedDateRange,
  ]);

  const SettlementStatusBadge = ({ isSettled }: { isSettled: boolean }) => {
    const colorClasses = isSettled
      ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:bg-opacity-25 dark:text-green-400'
      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:bg-opacity-25 dark:text-yellow-400';

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}
      >
        {isSettled ? 'Settled' : 'Not Settled'}
      </span>
    );
  };

  const SettlementStatusDetailBadge = ({ status }: { status: string | null }) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
          -
        </span>
      );
    }

    let colorClasses = '';
    switch (status.toLowerCase()) {
      case 'pending':
        colorClasses = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:bg-opacity-25 dark:text-yellow-400';
        break;
      case 'approved':
        colorClasses = 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400';
        break;
      case 'completed':
        colorClasses = 'bg-green-100 text-green-700 dark:bg-green-700 dark:bg-opacity-25 dark:text-green-400';
        break;
      case 'rejected':
        colorClasses = 'bg-red-100 text-red-700 dark:bg-red-700 dark:bg-opacity-25 dark:text-red-400';
        break;
      default:
        colorClasses = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400';
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const TransactionTypeBadge = ({ type }: { type: string }) => {
    let colorClasses = '';
    switch (type.toLowerCase()) {
      case 'payment':
        colorClasses =
          'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400';
        break;
      case 'refund':
        colorClasses =
          'bg-orange-100 text-orange-700 dark:bg-orange-700 dark:bg-opacity-25 dark:text-orange-400';
        break;
      case 'withdrawal':
        colorClasses =
          'bg-purple-100 text-purple-700 dark:bg-purple-700 dark:bg-opacity-25 dark:text-purple-400';
        break;
      default:
        colorClasses =
          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400';
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}
      >
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const columns: ListColumn<CommissionLog>[] = [
    ...(can('user', 'view')
      ? [{ key: 'agent_username', title: 'Agent', sortable: true }]
      : []),
    { key: 'merchant_name', title: 'Merchant', sortable: true },
    {
      key: 'transaction_id',
      title: 'Transaction ID',
      sortable: true,
      render: (v: string, row: CommissionLog) => (
        <div className="flex items-center space-x-1.5">
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            {maskedLongID(row.transaction_id)}
          </span>
          <CopyButton
            value={row.transaction_id}
            copied={copiedId === row.transaction_id}
            onCopied={() => {
              setCopiedId(row.transaction_id);
              setTimeout(() => setCopiedId(null), 2000);
            }}
            title="Copy Transaction ID"
          />
        </div>
      ),
    },
    {
      key: 'transaction_type',
      title: 'Type',
      sortable: true,
      render: (v: string) => <TransactionTypeBadge type={v} />,
    },
    {
      key: 'original_amount',
      title: 'Original Amount',
      sortable: true,
      align: 'right' as const,
    },
    { key: 'currency_code', title: 'Currency', sortable: true },
    {
      key: 'commission_amount',
      title: 'Commission',
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'rate',
      title: 'Rate %',
      sortable: true,
      align: 'right' as const,
      render: (v: string | null) =>
        v ? `${(parseFloat(v) * 100).toFixed(2)}%` : '-',
    },
    { key: 'fixed', title: 'Fixed', sortable: true, align: 'right' as const },
    {
      key: 'is_settled',
      title: 'Settlement',
      sortable: true,
      render: (v: boolean) => <SettlementStatusBadge isSettled={v} />,
    },
    {
      key: 'settlement_status',
      title: 'Settlement Status',
      sortable: true,
      render: (v: string | null) => <SettlementStatusDetailBadge status={v} />,
    },
    {
      key: 'created_at',
      title: 'Created At',
      sortable: true,
      render: (v: string) =>
        formatDateByUser(v, user?.metadata?.data_time_format),
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

  // 过滤条件
  const filters = (
    <>
      {can('user', 'view') && (
        <CommonSelect
          value={selectedAgent}
          onChange={handleAgentChange}
          options={agentOptions}
          placeholder="Agent"
        />
      )}
      <CommonSelect
        value={selectedMerchant}
        onChange={handleMerchantChange}
        options={merchantOptions}
        placeholder="Merchant"
      />
      <CommonSelect
        value={selectedSettlementStatus}
        onChange={handleSettlementStatusChange}
        options={settlementStatusOptions}
        placeholder="Settlement Status"
      />
      <CommonSelect
        value={selectedSettlementStatusDetail}
        onChange={handleSettlementStatusDetailChange}
        options={settlementStatusDetailOptions}
        placeholder="Settlement Status Detail"
      />
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
      listTitle="Commission Logs"
      showSearchBar={true}
      columns={columns}
      data={logs}
      totalItems={totalItems}
      isLoading={isLoading}
      error={error}
      searchTerm={searchTerm}
      onSearchTermChange={handleSearchTermChange}
      searchPlaceholder="Search by transaction ID..."
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

export default CommissionLogsList;
