'use client';
import {
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  CONFIG,
  ENUM_CONFIG,
  DEFAULT_PAGE_SIZE,
  ACCESS_LOG_TYPE,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import ConfirmationModal from './ConfirmationModal';
import EditTransactionRuleModal from './EditTransactionRuleModal';
import ToastNotify from './ToastNotify';
import { usePermission } from '@/hooks/usePermission';
import { useBasicData } from '@/hooks/useBasicData';

interface ApiTransactionRule {
  id: string;
  target_name: string;
  target_type: string;
  target_id: string;
  transaction_type: string;
  code: string;
  rule_value: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const TransactionRuleList: React.FC = () => {
  const { logout, userRole, user } = useAuth();
  const { can } = usePermission();
  const [transactionRules, setTransactionRules] = useState<
    ApiTransactionRule[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.ASC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal state
  const [deleteTarget, setDeleteTarget] = useState<ApiTransactionRule | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApiTransactionRule | null>(
    null
  );
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // 刷新按钮
  const handleRefresh = () => setRefreshKey(k => k + 1);

  // Add 按钮
  const handleAdd = () => {
    setEditingRule(null);
    setEditModalOpen(true);
  };

  // Edit 按钮
  const handleEdit = (rule: ApiTransactionRule) => {
    setEditingRule(rule);
    setEditModalOpen(true);
  };

  // 删除按钮点击
  const handleDelete = (rule: ApiTransactionRule) => {
    setDeleteTarget(rule);
    setIsDeleteModalOpen(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const startTime = Date.now();
    let res: Response | null = null;
    setIsDeleting(true);
    try {
      const apiUrl =
        CONFIG.API_BASE_URL +
        API_ROUTES.TRANSACTION_RULES +
        `/${deleteTarget.id}`;
      res = await authFetch(apiUrl, { method: 'DELETE' });
      if (!res) {
        logout();
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
      ToastNotify.success('Transaction rule deleted successfully');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      ToastNotify.error(err.message || 'Delete failed');
    } finally {
      await recordAccessLog({
        path: '/transaction-rules',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({
          name: deleteTarget.target_name,
          id: deleteTarget.id,
        }),
        response: JSON.stringify(res),
        duration_ms: Date.now() - startTime,
      });
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchTransactionRules = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = CONFIG.API_BASE_URL + API_ROUTES.TRANSACTION_RULES;
        const response = await authFetch(apiUrl);
        if (!response) {
          logout();
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch transaction rules' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result: ApiTransactionRule[] = await response.json();
        setTransactionRules(result || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch transaction rules');
        setTransactionRules([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactionRules();
  }, [logout, userRole, refreshKey]);

  // 监听全局刷新事件
  useEffect(() => {
    const handleGlobalRefresh = () => {
      setRefreshKey(k => k + 1);
    };

    window.addEventListener('refreshBasicData', handleGlobalRefresh);

    return () => {
      window.removeEventListener('refreshBasicData', handleGlobalRefresh);
    };
  }, []);

  // Target Type Badge 组件
  const TargetTypeBadge = ({ type }: { type: string }) => {
    if (!type) return <span className="text-gray-400">-</span>;

    let colorClasses = '';

    switch (type.toLowerCase()) {
      case 'merchant':
        colorClasses =
          'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-700 dark:bg-opacity-25 dark:text-fuchsia-400';
        break;
      case 'bank':
        colorClasses =
          'bg-teal-100 text-teal-700 dark:bg-teal-700 dark:bg-opacity-25 dark:text-teal-400';
        break;
      default:
        colorClasses =
          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400';
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}
      >
        {type.toUpperCase()}
      </span>
    );
  };

  // Transaction Type Badge 组件
  const TransactionTypeBadge = ({ type }: { type: string }) => {
    if (!type) return <span className="text-gray-400">-</span>;

    let colorClasses = '';

    switch (type.toLowerCase()) {
      case 'payment':
        colorClasses =
          'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400';
        break;
      case 'refund':
        colorClasses =
          'bg-amber-100 text-amber-700 dark:bg-amber-700 dark:bg-opacity-25 dark:text-amber-400';
        break;
      case 'withdrawal':
        colorClasses =
          'bg-rose-100 text-rose-700 dark:bg-rose-700 dark:bg-opacity-25 dark:text-rose-400';
        break;
      case 'chargeback':
        colorClasses =
          'bg-orange-100 text-orange-700 dark:bg-orange-700 dark:bg-opacity-25 dark:text-orange-400';
        break;
      default:
        colorClasses =
          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400';
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}
      >
        {type.toUpperCase()}
      </span>
    );
  };

  // columns 配置
  const columns: ListColumn<ApiTransactionRule>[] = [
    { key: 'target_name', title: 'Target Name' },
    {
      key: 'target_type',
      title: 'Target Type',
      render: (value: string) => <TargetTypeBadge type={value} />,
    },
    {
      key: 'transaction_type',
      title: 'Transaction Type',
      render: (value: string) => <TransactionTypeBadge type={value} />,
    },
    { key: 'code', title: 'Rule' },
    {
      key: 'rule_value',
      title: 'Value',
      render: (value: any, row: ApiTransactionRule) => {
        // 处理 rule_value 显示
        let displayValue = value;
        if (typeof value === 'object') {
          displayValue = JSON.stringify(value, null, 2);
        } else if (typeof value === 'string') {
          // 尝试解析 JSON 字符串并格式化显示
          try {
            const parsed = JSON.parse(value);
            displayValue = JSON.stringify(parsed, null, 2);
          } catch (e) {
            // 如果不是有效的 JSON，保持原样
            displayValue = value;
          }
        }

        // 如果超过50个字符，进行截断
        let truncatedValue = displayValue;
        if (displayValue && displayValue.length > 50) {
          const front = displayValue.substring(0, 20);
          const back = displayValue.substring(displayValue.length - 20);
          truncatedValue = `${front}.....${back}`;
        }

        return (
          <div className="max-w-xs truncate" title={displayValue}>
            {truncatedValue}
          </div>
        );
      },
    },
    { key: 'enabled', title: 'Enabled' },
    // 只有有编辑或删除权限时才显示 Actions 列
    ...(can('transaction_rule', 'edit') || can('transaction_rule', 'delete')
      ? [
          {
            key: 'actions',
            title: 'Actions',
            align: 'center' as const,
            render: (v: any, row: ApiTransactionRule) => (
              <>
                {can('transaction_rule', 'edit') && (
                  <button
                    onClick={() => handleEdit(row)}
                    className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition-colors"
                    title="Edit Transaction Rule"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                )}
                {can('transaction_rule', 'delete') && (
                  <button
                    onClick={() => handleDelete(row)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Delete Transaction Rule"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </>
            ),
          },
        ]
      : []),
  ];

  // ActionDropdown 配置
  const actions: ActionDropdownItem[] = [
    {
      label: 'Refresh',
      icon: <ArrowPathIcon className="h-4 w-4" />,
      onClick: handleRefresh,
      disabled: isLoading,
    },
  ];

  // 搜索支持 target_name、target_type、transaction_type、code、rule_value
  const transactionRuleFilter = (item: ApiTransactionRule, search: string) => {
    const s = search.trim().toLowerCase();

    // 处理 rule_value 搜索
    let ruleValueStr = '';
    if (typeof item.rule_value === 'object') {
      ruleValueStr = JSON.stringify(item.rule_value).toLowerCase();
    } else if (typeof item.rule_value === 'string') {
      ruleValueStr = item.rule_value.toLowerCase();
    }

    return (
      (item.target_name?.toLowerCase() || '').includes(s) ||
      (item.target_type?.toLowerCase() || '').includes(s) ||
      (item.transaction_type?.toLowerCase() || '').includes(s) ||
      (item.code?.toLowerCase() || '').includes(s) ||
      ruleValueStr.includes(s)
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={transactionRules}
        searchTerm={search}
        onSearchTermChange={setSearch}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSort={col => {
          if (sortColumn === col) {
            setSortOrder(prev =>
              prev === ENUM_CONFIG.ASC ? ENUM_CONFIG.DESC : ENUM_CONFIG.ASC
            );
          } else {
            setSortColumn(col);
            setSortOrder(ENUM_CONFIG.ASC);
          }
          setCurrentPage(1);
        }}
        itemsPerPage={DEFAULT_PAGE_SIZE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isLoading={isLoading}
        error={error}
        addButton={
          can('transaction_rule', 'create')
            ? { label: 'Add Transaction Rule', onClick: handleAdd }
            : undefined
        }
        actions={actions}
        searchPlaceholder="Search by Target Name, Target Type, Transaction Type, Rule, Value..."
        filterFunction={transactionRuleFilter}
        onRefresh={handleRefresh}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        confirmText="Delete"
        confirmButtonColor="bg-red-600 hover:bg-red-700"
        title="Delete Transaction Rule"
        message="Are you sure you want to delete this transaction rule? This action cannot be undone."
        customContent={
          <div className="space-y-2">
            <div>
              Name:{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {deleteTarget?.target_name}
              </span>
            </div>
            <div>
              Type:{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {deleteTarget?.transaction_type}
              </span>
            </div>
            <div>
              Rule:{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {deleteTarget?.code}
              </span>
            </div>
          </div>
        }
      />

      <EditTransactionRuleModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          handleRefresh();
        }}
        editData={editingRule}
      />
    </>
  );
};

export default TransactionRuleList;
