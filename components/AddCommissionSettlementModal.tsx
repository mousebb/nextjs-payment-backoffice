'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CONFIG, DEFAULT_PAGE_SIZE, ENUM_CONFIG } from '@/constants/config';
import { API_ROUTES } from '@/constants/apiRoutes';
import { authFetch, formatDateByUser } from '@/lib/utils';
import { useAuth } from './AuthContext';
import ToastNotify from './ToastNotify';
import LocalPagingList from './LocalPagingList';
import CommonSelect from './CommonSelect';
import { ListColumn } from '@/types/list';

interface AddCommissionSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AgentUserOption {
  id: string;
  username: string;
}

interface SettlementMethodOption {
  id: string;
  user_id: string;
  user_type: string;
  type: string;
  payee_name: string;
  currency_code: string;
  settlement_cycle?: string;
  status: string;
  min_settlement_amount?: string;
}

interface CommissionLogItem {
  id: string;
  merchant_id?: string;
  merchant_name?: string;
  amount: string;
  currency_code: string;
  created_at: string;
  status?: string;
  [key: string]: any;
}

const AddCommissionSettlementModal: React.FC<
  AddCommissionSettlementModalProps
> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const isAgentUser = !!user?.roles?.includes('agent');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedSettlementMethodId, setSelectedSettlementMethodId] =
    useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.DESC);

  // Data
  const [agents, setAgents] = useState<AgentUserOption[]>([]);
  const [settlementMethods, setSettlementMethods] = useState<
    SettlementMethodOption[]
  >([]);
  const [logs, setLogs] = useState<CommissionLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Derived
  const currentUserTimeFormat = user?.metadata?.data_time_format;

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedSettlementMethodId('');
      if (isAgentUser) {
        setSelectedAgentId(user?.id || '');
      } else {
        setSelectedAgentId('');
      }
      setSearch('');
      setCurrentPage(1);
      setSortColumn('created_at');
      setSortOrder(ENUM_CONFIG.DESC);
      setError(null);
      // Clear data when modal opens
      setLogs([]);
      setSettlementMethods([]);
    }
  }, [isOpen, isAgentUser, user?.id]);

  // Fetch agents for non-agent users
  useEffect(() => {
    const fetchAgents = async () => {
      if (!isOpen || isAgentUser) return;
      try {
        setIsLoading(true);
        const res = await authFetch(CONFIG.API_BASE_URL + API_ROUTES.AGENTS);
        if (res && res.ok) {
          const data = await res.json();
          const mapped: AgentUserOption[] = Array.isArray(data)
            ? data.map((a: any) => ({ id: a.id, username: a.username }))
            : [];
          setAgents(mapped);
        }
      } catch (e) {
        console.error('Failed to fetch agents', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAgents();
  }, [isOpen, isAgentUser]);

  // Fetch settlement methods and logs when agent changes
  useEffect(() => {
    const fetchForAgent = async () => {
      if (!isOpen || !selectedAgentId) return;
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all settlement methods and filter by agent
        const [smRes, logsRes] = await Promise.all([
          authFetch(CONFIG.API_BASE_URL + API_ROUTES.SETTLEMENT_METHODS),
          // Fetch available commission logs for this agent; backend should support agent_user_id filter
          (async () => {
            const params = new URLSearchParams();
            // Backend requires both params
            params.append('all', 'true');
            params.append('agent_user_id', selectedAgentId);
            params.append('is_settled', 'false');
            // Add filter for settlement_id being null/empty
            params.append('settlement_id', 'null');
            return authFetch(
              `${CONFIG.API_BASE_URL + API_ROUTES.COMMISSION_LOGS}?${params.toString()}`
            );
          })(),
        ]);

        if (smRes && smRes.ok) {
          const smData: SettlementMethodOption[] = await smRes.json();
          const filtered = (smData || []).filter(
            (m: any) =>
              m.user_type === 'agent' &&
              m.user_id === selectedAgentId &&
              m.status === 'active'
          );
          setSettlementMethods(filtered);
          // If only one method, preselect it
          if (filtered.length === 1)
            setSelectedSettlementMethodId(filtered[0].id);
        } else {
          setSettlementMethods([]);
        }

        if (logsRes && logsRes.ok) {
          const json: any = await logsRes.json();
          const items: CommissionLogItem[] = Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
              ? json.data
              : [];
          setLogs(items);
        } else {
          const err = await logsRes?.json().catch(() => ({}) as any);
          setError(err?.message || 'Failed to fetch commission logs');
          setLogs([]);
        }
      } catch (e) {
        console.error('Failed to fetch agent related data', e);
        setSettlementMethods([]);
        setLogs([]);
        setError((e as any)?.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchForAgent();
  }, [isOpen, selectedAgentId]);

  // 基础过滤：仅未结算且未分配 settlement_id
  const unsettledLogs = useMemo(
    () => logs.filter((l: any) => 
      l?.is_settled === false && 
      (!l?.settlement_id || l?.settlement_id === null || l?.settlement_id === '')
    ),
    [logs]
  );

  // 仅按 settlement method 的 currency 过滤（提交使用此集合，不受搜索影响）
  const methodFilteredLogs = useMemo(() => {
    // 如果没有选择agent，返回空数组
    if (!selectedAgentId) return [];

    const method = settlementMethods.find(
      m => m.id === selectedSettlementMethodId
    );
    if (!method) return unsettledLogs;
    return unsettledLogs.filter(l => l.currency_code === method.currency_code);
  }, [
    selectedAgentId,
    unsettledLogs,
    settlementMethods,
    selectedSettlementMethodId,
  ]);

  // 提供给 LocalPagingList 的搜索/排序/分页数据：在 method 过滤基础上再做搜索
  const listData = useMemo(() => {
    const lower = (search || '').trim().toLowerCase();
    const base = methodFilteredLogs;
    if (!lower) return base;
    return base.filter(item => {
      const fields = [
        item.merchant_name,
        item.transaction_type,
        item.currency_code,
        String((item as any)?.commission_amount ?? (item as any)?.amount ?? ''),
      ];
      return fields.some(v =>
        (v ?? '').toString().toLowerCase().includes(lower)
      );
    });
  }, [methodFilteredLogs, search]);

  // 统计信息
  const totalCommissionAmount = useMemo(() => {
    return methodFilteredLogs.reduce((sum, item) => {
      const amount = parseFloat(
        String((item as any)?.commission_amount ?? (item as any)?.amount ?? '0')
      );
      return sum + amount;
    }, 0);
  }, [methodFilteredLogs]);

  const totalRecordCount = useMemo(
    () => methodFilteredLogs.length,
    [methodFilteredLogs]
  );

  // 获取当前选择的结算方法
  const selectedSettlementMethod = useMemo(() => {
    return settlementMethods.find(m => m.id === selectedSettlementMethodId);
  }, [settlementMethods, selectedSettlementMethodId]);

  // 计算最小结算金额
  const minSettlementAmount = useMemo(() => {
    return selectedSettlementMethod?.min_settlement_amount 
      ? parseFloat(selectedSettlementMethod.min_settlement_amount) 
      : 0;
  }, [selectedSettlementMethod]);

  // 检查是否满足最小结算金额要求
  const meetsMinSettlementAmount = useMemo(() => {
    return totalCommissionAmount >= minSettlementAmount;
  }, [totalCommissionAmount, minSettlementAmount]);

  // Columns for list
  const columns: ListColumn<CommissionLogItem>[] = useMemo(
    () => [
      { key: 'merchant_name', title: 'Merchant', sortable: true },
      {
        key: 'transaction_type',
        title: 'Type',
        sortable: true,
        render: (v: string, row: CommissionLogItem) =>
          row?.transaction_type || '-',
      },
      {
        key: 'commission_amount',
        title: 'Commission Amount',
        sortable: true,
        align: 'right',
        render: (v: string, row: CommissionLogItem) => {
          const val =
            (row as any)?.commission_amount ?? (row as any)?.amount ?? '0';
          return (
            <span className="font-mono">
              {parseFloat(String(val) || '0').toFixed(2)}
            </span>
          );
        },
      },
      { key: 'currency_code', title: 'Currency', sortable: true },
      {
        key: 'created_at',
        title: 'Created At',
        sortable: true,
        render: (v: string) => formatDateByUser(v, currentUserTimeFormat),
      },
    ],
    [currentUserTimeFormat]
  );

  const handleSubmit = async () => {
    if (!selectedAgentId) {
      ToastNotify.error('Please select an agent');
      return;
    }
    if (!selectedSettlementMethodId) {
      ToastNotify.error('Please select a settlement method');
      return;
    }
    // Use all method-filtered and unsettled logs for settlement
    const logIds = methodFilteredLogs
      .map((l: CommissionLogItem) => l.id)
      .filter(Boolean);
    if (logIds.length === 0) {
      ToastNotify.error('No records available for this method');
      return;
    }
    
    // Check minimum settlement amount
    if (!meetsMinSettlementAmount) {
      ToastNotify.error(
        `Total commission amount (${totalCommissionAmount.toFixed(2)}) is less than minimum settlement amount (${minSettlementAmount.toFixed(2)})`
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const body: any = {
        agent_user_id: selectedAgentId,
        settlement_method_id: selectedSettlementMethodId,
        commission_log_ids: logIds,
      };
      const res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.COMMISSION_SETTLEMENTS,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (res && res.ok) {
        ToastNotify.success('Settlement created');
        onSuccess();
        onClose();
      } else {
        const err = await res?.json().catch(() => ({}));
        ToastNotify.error(err?.message || 'Failed to create settlement');
      }
    } catch (e: any) {
      ToastNotify.error(e?.message || 'Failed to create settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        className="bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[86vh] mx-4 transform transition-all overflow-hidden flex flex-col"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Add Commission Settlement
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <LocalPagingList
            columns={columns}
            rawData={selectedAgentId ? listData : []}
            searchTerm={search}
            onSearchTermChange={v => {
              setSearch(v);
              setCurrentPage(1);
            }}
            sortColumn={sortColumn}
            sortOrder={sortOrder}
            onSort={col => {
              if (sortColumn === col)
                setSortOrder(prev =>
                  prev === ENUM_CONFIG.ASC ? ENUM_CONFIG.DESC : ENUM_CONFIG.ASC
                );
              else {
                setSortColumn(col);
                setSortOrder(ENUM_CONFIG.ASC);
              }
              setCurrentPage(1);
            }}
            rowPadding="py-1.5"
            itemsPerPage={DEFAULT_PAGE_SIZE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            isLoading={isLoading}
            error={error}
            showSearchBar={true}
            filters={
              <>
                {!isAgentUser && (
                  <CommonSelect
                    value={selectedAgentId}
                    onChange={v => {
                      setSelectedAgentId(v);
                      setSelectedSettlementMethodId('');
                      setCurrentPage(1);
                      setSearch('');
                      setSortColumn('created_at');
                      setSortOrder(ENUM_CONFIG.DESC);
                    }}
                    options={agents.map(a => ({ id: a.id, name: a.username }))}
                    placeholder="Agent"
                  />
                )}
                <CommonSelect
                  value={selectedSettlementMethodId}
                  onChange={v => {
                    setSelectedSettlementMethodId(v);
                    setCurrentPage(1);
                    setSearch('');
                    setSortColumn('created_at');
                    setSortOrder(ENUM_CONFIG.DESC);
                  }}
                  options={settlementMethods.map(m => ({
                    id: m.id,
                    name: `${m.type} / ${m.currency_code} / ${m.settlement_cycle || '-'}`,
                  }))}
                  placeholder="Settlement Method"
                />
              </>
            }
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {/* 统计信息 */}
          {methodFilteredLogs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-6">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Total Records:{' '}
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {totalRecordCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Total Commission Amount:{' '}
                    </span>
                    {selectedSettlementMethodId ? (
                      <>
                        <span className={`font-mono font-semibold ${
                          meetsMinSettlementAmount 
                            ? 'text-gray-800 dark:text-gray-200' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {totalCommissionAmount.toFixed(2)}
                        </span>
                        {selectedSettlementMethod?.currency_code && (
                          <span className="text-gray-600 dark:text-gray-400 ml-1">
                            {selectedSettlementMethod.currency_code}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="font-semibold text-gray-500 dark:text-gray-400">
                        -
                      </span>
                    )}
                  </div>
                  {selectedSettlementMethodId && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Min Settlement Amount:{' '}
                      </span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                        {minSettlementAmount.toFixed(2)}
                      </span>
                      {selectedSettlementMethod?.currency_code && (
                        <span className="text-gray-600 dark:text-gray-400 ml-1">
                          {selectedSettlementMethod.currency_code}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !selectedAgentId ||
                !selectedSettlementMethodId ||
                methodFilteredLogs.length === 0 ||
                !meetsMinSettlementAmount
              }
              className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Settlement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCommissionSettlementModal;
