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
  WEB_ACTION_METHODS,
  ACCESS_LOG_TYPE,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, formatDateByUser, recordAccessLog } from '@/lib/utils';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import ToastNotify from './ToastNotify';
import EditTransactionMethodModal from './EditTransactionMethodModal';
import ConfirmationModal from './ConfirmationModal';
import { usePermission } from '@/hooks/usePermission';
import { useTranslations } from 'next-intl';
import { useBasicData } from '@/hooks/useBasicData';

interface ApiTransactionMethod {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const TransactionMethodList: React.FC = () => {
  const { can } = usePermission();
  const { logout, userRole, user } = useAuth();
  const [transactionMethods, setTransactionMethods] = useState<
    ApiTransactionMethod[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.ASC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingTransactionMethod, setEditingTransactionMethod] =
    useState<ApiTransactionMethod | null>(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingTransactionMethod, setDeletingTransactionMethod] =
    useState<ApiTransactionMethod | null>(null);
  const t = useTranslations();
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();
  // Refresh button
  const handleRefresh = () => setRefreshKey(k => k + 1);

  // Add button
  const handleAdd = () => {
    setEditingTransactionMethod(null);
    setEditModalOpen(true);
  };

  // Edit button
  const handleEdit = (transactionMethod: ApiTransactionMethod) => {
    setEditingTransactionMethod(transactionMethod);
    setEditModalOpen(true);
  };

  // Delete button
  const handleDelete = (transactionMethod: ApiTransactionMethod) => {
    setDeletingTransactionMethod(transactionMethod);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingTransactionMethod) return;
    const startTime = Date.now();
    let res: Response | null = null;
    setDeleteModalOpen(false);
    setIsLoading(true);
    try {
      res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.TRANSACTION_METHODS}/${deletingTransactionMethod.id}`,
        {
          method: 'DELETE',
        }
      );
      if (res && res.ok) {
        ToastNotify.success('Transaction method deleted successfully');
        handleRefresh();
      } else {
        const errorData = await res
          ?.json()
          .catch(() => ({ message: 'Failed to delete transaction method' }));
        throw new Error(
          errorData.message || `HTTP error! status: ${res?.status}`
        );
      }
    } catch (err: any) {
      ToastNotify.error(err.message || 'Failed to delete transaction method');
    } finally {
      await recordAccessLog({
        path: '/transaction-methods',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({
          name: deletingTransactionMethod.name,
          id: deletingTransactionMethod.id,
        }),
        response: JSON.stringify(res),
        duration_ms: Date.now() - startTime,
      });
      setIsLoading(false);
      setDeletingTransactionMethod(null);
    }
  };

  useEffect(() => {
    const fetchTransactionMethods = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = CONFIG.API_BASE_URL + API_ROUTES.TRANSACTION_METHODS;
        const response = await authFetch(apiUrl);
        if (!response) {
          logout();
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch transaction methods' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result: ApiTransactionMethod[] = await response.json();
        setTransactionMethods(result || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setTransactionMethods([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactionMethods();
  }, [logout, userRole, refreshKey]);

  // columns config
  const columns: ListColumn<ApiTransactionMethod>[] = [
    { key: 'code', title: 'Code' },
    { key: 'name', title: 'Name' },
    {
      key: 'type',
      title: 'Type',
      render: v => (v ? t('TransactionType.' + v) : '-'),
    },
    { key: 'description', title: 'Description', render: v => v || '-' },
    { key: 'enabled', title: 'Enabled' },
    {
      key: 'created_at',
      title: 'Created At',
      render: v => formatDateByUser(v, user?.metadata?.data_time_format),
    },
    {
      key: 'updated_at',
      title: 'Updated At',
      render: v => formatDateByUser(v, user?.metadata?.data_time_format),
    },
    ...(can('transaction_method', 'edit')
      ? [
          {
            key: 'actions',
            title: 'Actions',
            align: 'center' as const,
            render: (v: any, row: ApiTransactionMethod) => (
              <>
                <div className="flex items-center justify-center space-x-1">
                  <button
                    onClick={() => handleEdit(row)}
                    className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition-colors"
                    title="Edit Transaction Method"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(row)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Delete Transaction Method"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </>
            ),
          },
        ]
      : []),
  ];

  // ActionDropdown config
  const actions: ActionDropdownItem[] = [
    {
      label: 'Refresh',
      icon: <ArrowPathIcon className="h-4 w-4" />,
      onClick: handleRefresh,
      disabled: isLoading,
    },
  ];

  // Custom filter function: supports code, name, description
  const transactionMethodFilter = (
    item: ApiTransactionMethod,
    search: string
  ) => {
    const s = search.trim().toLowerCase();
    return (
      (item.code?.toLowerCase() || '').includes(s) ||
      (item.name?.toLowerCase() || '').includes(s) ||
      (item.type?.toLowerCase() || '').includes(s) ||
      (item.description?.toLowerCase() || '').includes(s)
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={transactionMethods}
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
        actions={actions}
        addButton={
          can('transaction_method', 'create')
            ? { label: 'Add Transaction Method', onClick: handleAdd }
            : undefined
        }
        searchPlaceholder="Search by Code, Name, Description..."
        filterFunction={transactionMethodFilter}
        onRefresh={handleRefresh}
      />
      <EditTransactionMethodModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          handleRefresh();
        }}
        editData={
          editingTransactionMethod
            ? {
                id: editingTransactionMethod.id,
                code: editingTransactionMethod.code,
                name: editingTransactionMethod.name,
                type: editingTransactionMethod.type,
                description: editingTransactionMethod.description || '',
                enabled: editingTransactionMethod.enabled,
              }
            : null
        }
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Transaction Method"
        message={`Are you sure you want to delete "${deletingTransactionMethod?.code} - ${deletingTransactionMethod?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="bg-red-600 hover:bg-red-700 focus-visible:outline-red-500"
      />
    </>
  );
};

export default TransactionMethodList;
