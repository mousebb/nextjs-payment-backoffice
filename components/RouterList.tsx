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
  COLOR_BADGE_LIST,
  WEB_ACTION_METHODS,
  ACCESS_LOG_TYPE,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import EditRouterModal from './EditRouterModal';
import { usePermission } from '@/hooks/usePermission';
import Can from './Can';
import ConfirmationModal from './ConfirmationModal';
import ToastNotify from './ToastNotify';
import { useBasicData } from '@/hooks/useBasicData';

interface RouterBank {
  bank_id: string;
  bank_name: string;
  priority: number;
}

interface ApiRouter {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  banks: RouterBank[];
  created_at: string;
  updated_at: string;
}

const RouterList: React.FC = () => {
  const { logout, userRole, user } = useAuth();
  const { can } = usePermission();
  const [routers, setRouters] = useState<ApiRouter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.ASC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<ApiRouter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiRouter | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 刷新按钮
  const handleRefresh = () => setRefreshKey(k => k + 1);

  // Add 按钮
  const handleAdd = () => {
    setEditData(null);
    setIsModalOpen(true);
  };

  // Edit 按钮
  const handleEdit = (router: ApiRouter) => {
    setEditData(router);
    setIsModalOpen(true);
  };

  // Modal success callback
  const handleModalSuccess = () => {
    setRefreshKey(k => k + 1);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditData(null);
  };

  // 删除按钮点击
  const handleDelete = (router: ApiRouter) => {
    setDeleteTarget(router);
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
        CONFIG.API_BASE_URL + API_ROUTES.ROUTERS + `/${deleteTarget.id}`;
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
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      ToastNotify.error(err.message || 'Delete failed');
    } finally {
      await recordAccessLog({
        path: '/routers',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({
          name: deleteTarget.name,
          id: deleteTarget.id,
        }),
        response: JSON.stringify(res),
        duration_ms: Date.now() - startTime,
      });
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchRouters = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = CONFIG.API_BASE_URL + API_ROUTES.ROUTERS;
        const response = await authFetch(apiUrl);
        if (!response) {
          logout();
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch routers' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result: ApiRouter[] = await response.json();
        setRouters(result || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setRouters([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRouters();
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
  const columns: ListColumn<ApiRouter>[] = [
    { key: 'name', title: 'Name' },
    { key: 'description', title: 'Description' },
    {
      key: 'banks',
      title: 'Banks',
      render: (v, row) => {
        return row.banks && row.banks.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.banks.slice(0, 3).map(b => (
              <span
                key={b.bank_id}
                className="inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 text-xs border-none dark:bg-indigo-700 dark:bg-opacity-25 dark:text-indigo-300"
              >
                {b.bank_name}
              </span>
            ))}
            {row.banks.length > 3 && (
              <span
                className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-400 text-xs dark:bg-indigo-900 dark:bg-opacity-25 dark:text-indigo-500 border-none"
                title={row.banks.map(b => b.bank_name).join(', ')}
              >
                +{row.banks.length - 3}
              </span>
            )}
          </div>
        ) : (
          '-'
        );
      },
    },
    { key: 'enabled', title: 'Enabled' },
    // 只有有编辑或删除权限时才显示 Actions 列
    ...(can('router', 'edit') || can('router', 'delete')
      ? [
          {
            key: 'actions',
            title: 'Actions',
            align: 'center' as const,
            render: (v: any, row: ApiRouter) => (
              <>
                {can('router', 'edit') && (
                  <button
                    onClick={() => handleEdit(row)}
                    className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition-colors"
                    title="Edit Router"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                )}
                {can('router', 'delete') && (
                  <button
                    onClick={() => handleDelete(row)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Delete Router"
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

  // 搜索支持 name、banks[].bank_name
  const routerFilter = (item: ApiRouter, search: string) => {
    const s = search.trim().toLowerCase();
    return (
      (item.name?.toLowerCase() || '').includes(s) ||
      (item.description?.toLowerCase() || '').includes(s) ||
      (item.banks &&
        item.banks.some(b => (b.bank_name?.toLowerCase() || '').includes(s)))
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={routers}
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
          can('router', 'create')
            ? { label: 'Add Router', onClick: handleAdd }
            : undefined
        }
        actions={actions}
        searchPlaceholder="Search by Name, Bank..."
        filterFunction={routerFilter}
      />

      <EditRouterModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        editData={editData}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        confirmText="Delete"
        confirmButtonColor="bg-red-600 hover:bg-red-700"
        title="Delete Router"
        message="Are you sure you want to delete this router? This action cannot be undone."
        customContent={
          <div>
            Router:{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {deleteTarget?.name}
            </span>
          </div>
        }
      />
    </>
  );
};

export default RouterList;
