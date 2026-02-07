import React, { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from './AuthContext';
import {
  CONFIG,
  ENUM_CONFIG,
  DEFAULT_PAGE_SIZE,
  WEB_ACTION_METHODS,
  ACCESS_LOG_TYPE,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, formatDateByUser, recordAccessLog } from '@/lib/utils';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import { usePermission } from '@/hooks/usePermission';
import ConfirmationModal from './ConfirmationModal';
import ToastNotify from './ToastNotify';
import EditRuleModal from './EditRuleModal';
import { useBasicData } from '@/hooks/useBasicData';

interface ApiRule {
  id: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const RuleList: React.FC = () => {
  const { logout, userRole, user } = useAuth();
  const { can } = usePermission();
  const [rules, setRules] = useState<ApiRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('code');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.ASC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal state
  const [deleteTarget, setDeleteTarget] = useState<ApiRule | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<ApiRule | null>(null);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // 刷新按钮
  const handleRefresh = () => setRefreshKey(k => k + 1);

  // Add 按钮
  const handleAdd = () => {
    setEditData(null);
    setIsEditModalOpen(true);
  };

  // Edit 按钮
  const handleEdit = (rule: ApiRule) => {
    setEditData(rule);
    setIsEditModalOpen(true);
  };

  // 删除按钮点击
  const handleDelete = (rule: ApiRule) => {
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
        CONFIG.API_BASE_URL + API_ROUTES.RULES + `/${deleteTarget.id}`;
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
      ToastNotify.success('Rule deleted successfully');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      ToastNotify.error(err.message || 'Delete failed');
    } finally {
      await recordAccessLog({
        path: '/rules',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({
          code: deleteTarget.code,
          id: deleteTarget.id,
        }),
        response: JSON.stringify(res),
        duration_ms: Date.now() - startTime,
      });
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchRules = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = CONFIG.API_BASE_URL + API_ROUTES.RULES;
        const response = await authFetch(apiUrl);
        if (!response) {
          logout();
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch rules' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result: ApiRule[] = await response.json();
        setRules(result || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch rules');
        setRules([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRules();
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

  // columns 配置
  const columns: ListColumn<ApiRule>[] = [
    { key: 'code', title: 'Code' },
    { key: 'description', title: 'Description' },
    {
      key: 'created_at',
      title: 'Created At',
      render: v => formatDateByUser(v, user?.metadata?.data_time_format),
    },
    // { key: 'updated_at', title: 'Updated At', render: (v) => formatDateByUser(v, user?.metadata?.data_time_format) },
    // 只有有编辑或删除权限时才显示 Actions 列
    ...(can('rule', 'edit') || can('rule', 'delete')
      ? [
          {
            key: 'actions',
            title: 'Actions',
            align: 'center' as const,
            render: (v: any, row: ApiRule) => (
              <>
                {can('rule', 'edit') && (
                  <button
                    onClick={() => handleEdit(row)}
                    className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition-colors"
                    title="Edit Rule"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                )}
                {can('rule', 'delete') && (
                  <button
                    onClick={() => handleDelete(row)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Delete Rule"
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

  // 搜索支持 code、description
  const ruleFilter = (item: ApiRule, search: string) => {
    const s = search.trim().toLowerCase();
    return (
      (item.code?.toLowerCase() || '').includes(s) ||
      (item.description?.toLowerCase() || '').includes(s)
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={rules}
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
          can('rule', 'create')
            ? { label: 'Add Rule', onClick: handleAdd }
            : undefined
        }
        actions={actions}
        searchPlaceholder="Search by Code, Description..."
        filterFunction={ruleFilter}
        onRefresh={handleRefresh}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        confirmText="Delete"
        confirmButtonColor="bg-red-600 hover:bg-red-700"
        title="Delete Rule"
        message="Are you sure you want to delete this rule? This action cannot be undone."
        customContent={
          <div>
            Rule:{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {deleteTarget?.code}
            </span>
          </div>
        }
      />
      <EditRuleModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleRefresh}
        editData={editData}
      />
    </>
  );
};

export default RuleList;
