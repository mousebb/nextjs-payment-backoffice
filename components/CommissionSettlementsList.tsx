import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentCheckIcon,
  DocumentPlusIcon,
} from '@heroicons/react/24/outline';
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
import ActionsDropdown from './ActionsDropdown';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelTextarea from './FloatingLabelTextarea';
import type { RangeValue } from '@react-types/shared';
import { CalendarDate } from '@internationalized/date';
import { usePermission } from '@/hooks/usePermission';
import { useBasicData } from '@/hooks/useBasicData';
import ConfirmationModal from './ConfirmationModal';
import AddCommissionSettlementModal from './AddCommissionSettlementModal';
import ToastNotify from './ToastNotify';

interface CommissionSettlement {
  id: string;
  agent_user_id: string;
  agent_username: string;
  settlement_method_id: string;
  total_amount: string;
  currency_code: string;
  record_count: number;
  status: string;
  applied_at: string;
  approved_at: string | null;
  approved_by: string | null;
  settled_at: string | null;
  transfer_reference: string | null;
  remark: string;
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

const CommissionSettlementsList: React.FC = () => {
  const { logout, user } = useAuth();
  const { can } = usePermission();
  const [settlements, setSettlements] = useState<CommissionSettlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('applied_at');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.DESC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / DEFAULT_PAGE_SIZE);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingSettlement, setDeletingSettlement] =
    useState<CommissionSettlement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // 状态更新确认弹窗状态
  const [isStatusUpdateModalOpen, setStatusUpdateModalOpen] = useState(false);
  const [updatingSettlement, setUpdatingSettlement] =
    useState<CommissionSettlement | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [transferReference, setTransferReference] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // 筛选项
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<
    RangeValue<CalendarDate>
  >(() => {
    const today = new CalendarDate(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate()
    );
    return { start: today.subtract({ days: 30 }), end: today };
  });

  // 下拉选项
  const [agentOptions, setAgentOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [merchantsByAgent, setMerchantsByAgent] =
    useState<MerchantsByAgentResponse>({});

  const statusOptions = [
    { id: 'pending', name: 'Pending' },
    { id: 'approved', name: 'Approved' },
    { id: 'settled', name: 'Settled' },
    { id: 'rejected', name: 'Rejected' },
  ];

  const currencyOptions = [
    { id: 'USD', name: 'USD' },
    { id: 'USDT', name: 'USDT' },
    { id: 'EUR', name: 'EUR' },
    { id: 'GBP', name: 'GBP' },
  ];

  useEffect(() => {
    // 获取 agents 数据
    const fetchAgents = async () => {
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
        } else {
          console.error('Failed to fetch agents data');
        }
      } catch (error) {
        console.error('Error fetching agents data:', error);
      }
    };

    if (can('commission_settlement', 'view')) {
      fetchAgents();
    }
  }, [can]);

  const handleAgentChange = (v: string) => {
    setSelectedAgent(v);
    setCurrentPage(1);
  };
  const handleStatusChange = (v: string) => {
    setSelectedStatus(v);
    setCurrentPage(1);
  };
  const handleCurrencyChange = (v: string) => {
    setSelectedCurrency(v);
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

  const handleAddSettlement = () => {
    setIsAddModalOpen(true);
  };

  const handleDeleteSettlement = (settlement: CommissionSettlement) => {
    setDeletingSettlement(settlement);
    setDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingSettlement) return;

    const startTime = Date.now();
    let res: Response | null = null;
    setIsDeleting(true);
    try {
      const deleteUrl =
        CONFIG.API_BASE_URL +
        API_ROUTES.COMMISSION_SETTLEMENTS_DETAILS.replace(
          ':id',
          deletingSettlement.id
        );
      res = await authFetch(deleteUrl, {
        method: 'DELETE',
      });

      if (!res) {
        return;
      }

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: 'Delete failed' }));
        throw new Error(
          errorData.message || `HTTP error! status: ${res.status}`
        );
      }

      // Refresh the list
      handleRefresh();
      setDeleteModalOpen(false);
      setDeletingSettlement(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      // You might want to show a toast notification here
    } finally {
      setIsDeleting(false);
    }
  };

  // Status update handlers
  const handleStatusUpdate = async (
    settlementId: string,
    newStatus: string,
    remark?: string,
    transferReference?: string
  ) => {
    try {
      const updateUrl =
        CONFIG.API_BASE_URL +
        API_ROUTES.COMMISSION_SETTLEMENTS_DETAILS.replace(':id', settlementId);

      // 根据状态准备更新数据
      const updateData: any = { status: newStatus };

      // 如果有备注，添加到更新数据中
      if (remark && remark.trim()) {
        updateData.remark = remark.trim();
      }

      // 如果是 complete 状态且有 transfer_reference，添加到更新数据中
      if (
        newStatus === 'completed' &&
        transferReference &&
        transferReference.trim()
      ) {
        updateData.transfer_reference = transferReference.trim();
      }

      const response = await authFetch(updateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response) {
        ToastNotify.error('Network error');
        return;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to update status' }));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      ToastNotify.success(`Status updated to ${newStatus}`);
      handleRefresh();
    } catch (err: any) {
      ToastNotify.error(err.message || 'Failed to update status');
    }
  };

  const handleApprove = (settlement: CommissionSettlement) => {
    handleStatusUpdate(settlement.id, 'approved');
  };

  const handleReject = (settlement: CommissionSettlement) => {
    setUpdatingSettlement(settlement);
    setNewStatus('rejected');
    setRemark(settlement.remark || '');
    setStatusUpdateModalOpen(true);
  };

  const handleComplete = (settlement: CommissionSettlement) => {
    setUpdatingSettlement(settlement);
    setNewStatus('completed');
    setRemark(settlement.remark || '');
    setTransferReference(settlement.transfer_reference || '');
    setStatusUpdateModalOpen(true);
  };

  // 确认状态更新
  const handleConfirmStatusUpdate = async () => {
    if (!updatingSettlement) return;

    setIsUpdating(true);
    try {
      await handleStatusUpdate(
        updatingSettlement.id,
        newStatus,
        remark,
        transferReference
      );
      // 成功后关闭弹窗并清理状态
      setStatusUpdateModalOpen(false);
      setUpdatingSettlement(null);
      setNewStatus('');
      setRemark('');
      setTransferReference('');
    } catch (err: any) {
      console.error('Status update error:', err);
      // 错误时不关闭弹窗，让用户看到错误信息
    } finally {
      setIsUpdating(false);
    }
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
    const fetchSettlements = async () => {
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
          params.append('settlement_id', searchTerm.trim());
        }
        if (selectedAgent) params.append('agent_user_id', selectedAgent);
        if (selectedStatus) params.append('status', selectedStatus);
        if (selectedCurrency) params.append('currency_code', selectedCurrency);
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
          API_ROUTES.COMMISSION_SETTLEMENTS +
          `?${params.toString()}`;
        const response = await authFetch(apiUrl);
        if (!response) {
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({
              message: 'Failed to fetch commission settlements',
            }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result = await response.json();
        setSettlements(result.data || []);
        setTotalItems(result.total || 0);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setSettlements([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettlements();
  }, [
    refreshKey,
    currentPage,
    sortColumn,
    sortOrder,
    searchTerm,
    selectedAgent,
    selectedStatus,
    selectedCurrency,
    selectedDateRange,
  ]);

  const SettlementStatusBadge = ({ status }: { status: string }) => {
    let colorClasses = '';
    switch (status.toLowerCase()) {
      case 'pending':
        colorClasses =
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:bg-opacity-25 dark:text-yellow-400';
        break;
      case 'approved':
        colorClasses =
          'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400';
        break;
      case 'completed':
        colorClasses =
          'bg-green-100 text-green-700 dark:bg-green-700 dark:bg-opacity-25 dark:text-green-400';
        break;
      case 'rejected':
        colorClasses =
          'bg-red-100 text-red-700 dark:bg-red-700 dark:bg-opacity-25 dark:text-red-400';
        break;
      default:
        colorClasses =
          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400';
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const columns: ListColumn<CommissionSettlement>[] = [
    ...(can('user', 'view')
      ? [{ key: 'agent_username', title: 'Agent', sortable: true }]
      : []),
    {
      key: 'id',
      title: 'Settlement ID',
      sortable: true,
      render: (v: string, row: CommissionSettlement) => (
        <div className="flex items-center space-x-1.5">
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            {maskedLongID(row.id)}
          </span>
          <CopyButton
            value={row.id}
            copied={copiedId === row.id}
            onCopied={() => {
              setCopiedId(row.id);
              setTimeout(() => setCopiedId(null), 2000);
            }}
            title="Copy Settlement ID"
          />
        </div>
      ),
    },
    {
      key: 'total_amount',
      title: 'Total Amount',
      sortable: true,
      align: 'right' as const,
    },
    { key: 'currency_code', title: 'Currency', sortable: true },
    {
      key: 'record_count',
      title: 'Records',
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (v: string) => <SettlementStatusBadge status={v} />,
    },
    {
      key: 'applied_at',
      title: 'Applied At',
      sortable: true,
      render: (v: string) =>
        formatDateByUser(v, user?.metadata?.data_time_format),
    },
    {
      key: 'approved_at',
      title: 'Approved At',
      sortable: true,
      render: (v: string | null) =>
        v ? formatDateByUser(v, user?.metadata?.data_time_format) : '-',
    },
    {
      key: 'settled_at',
      title: 'Settled At',
      sortable: true,
      render: (v: string | null) =>
        v ? formatDateByUser(v, user?.metadata?.data_time_format) : '-',
    },
    ...(can('commission_settlement', 'edit')
      ? [
          {
            key: 'actions',
            title: 'Actions',
            sortable: false,
            align: 'center' as const,
            render: (v: any, row: CommissionSettlement) => {
              const statusActions = [];

              // 根据当前状态决定显示哪些按钮
              if (row.status === 'pending') {
                statusActions.push(
                  {
                    label: 'Approve',
                    onClick: () => handleApprove(row),
                  },
                  {
                    label: 'Reject',
                    onClick: () => handleReject(row),
                  }
                );
              } else if (row.status === 'approved') {
                statusActions.push({
                  label: 'Complete',
                  onClick: () => handleComplete(row),
                });
              }
              return (
                <div className="flex items-center justify-center space-x-2">
                  <ActionsDropdown
                    actions={statusActions}
                    disabled={statusActions.length === 0}
                    triggerIcon={<DocumentCheckIcon className="h-4 w-4" />}
                    buttonClassName="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition-colors"
                    dropdownClassName="bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700 w-auto whitespace-nowrap min-w-[120px]"
                    itemClassName="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {can('commission_settlement', 'delete') && (
                    <button
                      onClick={() => handleDeleteSettlement(row)}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      title="Delete"
                      disabled={!can('commission_settlement', 'delete')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
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
        value={selectedStatus}
        onChange={handleStatusChange}
        options={statusOptions}
        placeholder="Status"
      />
      <CommonSelect
        value={selectedCurrency}
        onChange={handleCurrencyChange}
        options={currencyOptions}
        placeholder="Currency"
      />
      <CustomDateRangePicker
        value={selectedDateRange}
        onChange={handleDateRangeChange}
      />
    </>
  );

  return (
    <>
      <RemotePagingList
        listTitle="Commission Settlements"
        showSearchBar={true}
        columns={columns}
        data={settlements}
        totalItems={totalItems}
        isLoading={isLoading}
        error={error}
        searchTerm={searchTerm}
        onSearchTermChange={handleSearchTermChange}
        searchPlaceholder="Search by settlement ID..."
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
        addButton={
          can('commission_settlement', 'create')
            ? {
                label: 'Create Settlement',
                onClick: handleAddSettlement,
                icon: <DocumentPlusIcon className="h-5 w-5" />,
              }
            : undefined
        }
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingSettlement(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Commission Settlement"
        message="Are you sure you want to delete this commission settlement? This action cannot be undone."
        confirmText="Delete"
        confirmButtonColor="bg-red-600 hover:bg-red-700"
        customContent={
          <div>
            Settlement ID:{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {deletingSettlement?.id}
            </span>
            <br />
            Agent:{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {deletingSettlement?.agent_username}
            </span>
            <br />
            Amount:{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {deletingSettlement?.total_amount}{' '}
              {deletingSettlement?.currency_code}
            </span>
          </div>
        }
      />
      <ConfirmationModal
        isOpen={isStatusUpdateModalOpen}
        onClose={() => {
          setStatusUpdateModalOpen(false);
          setUpdatingSettlement(null);
          setNewStatus('');
          setRemark('');
          setTransferReference('');
        }}
        onConfirm={handleConfirmStatusUpdate}
        title={`Update Status to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`}
        message={`Are you sure you want to update the status to ${newStatus}?`}
        confirmText="Update"
        confirmButtonColor="bg-blue-600 hover:bg-blue-700"
        isLoading={isUpdating}
        customContent={
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Settlement ID:{' '}
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {updatingSettlement?.id}
                </span>
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Agent:{' '}
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {updatingSettlement?.agent_username}
                </span>
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Amount:{' '}
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {updatingSettlement?.total_amount}{' '}
                  {updatingSettlement?.currency_code}
                </span>
              </p>
            </div>
            <div>
              <FloatingLabelTextarea
                id="remark"
                name="remark"
                label="Remark"
                value={remark}
                onChange={e => setRemark(e.target.value)}
                placeholder="Enter a remark for this status update..."
                rows={3}
                disabled={isUpdating}
              />
            </div>
            {newStatus === 'completed' && (
              <div>
                <FloatingLabelInput
                  id="transferReference"
                  name="transferReference"
                  label="Transfer Reference"
                  type="text"
                  value={transferReference}
                  onChange={e => setTransferReference(e.target.value)}
                  placeholder="Enter transfer reference..."
                  disabled={isUpdating}
                />
              </div>
            )}
          </div>
        }
      />
      <AddCommissionSettlementModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          handleRefresh();
        }}
      />
    </>
  );
};

export default CommissionSettlementsList;
