'use client';
import {
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  NoSymbolIcon,
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
import { authFetch, recordAccessLog } from '@/lib/utils';
import { getBasicData, clearBasicDataCache } from '@/lib/basic-data.service';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import EditCurrencyModal from './EditCurrencyModal';
import ConfirmationModal from './ConfirmationModal';
import ToastNotify from './ToastNotify';
import { usePermission } from '@/hooks/usePermission';
import { useBasicData } from '@/hooks/useBasicData';

interface ApiCurrency {
  code: string;
  name: string;
  symbol: string;
  precision: number;
  is_crypto: boolean;
  created_at: string;
  updated_at: string;
}

const CurrencyList: React.FC = () => {
  const { can } = usePermission();
  const { logout, userRole } = useAuth();
  const [currencies, setCurrencies] = useState<ApiCurrency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('code');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.ASC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<ApiCurrency | null>(
    null
  );
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCurrency, setDeletingCurrency] = useState<ApiCurrency | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // Refresh button
  const handleRefresh = () => setRefreshKey(k => k + 1);
  // Add button
  const handleAdd = () => {
    setEditingCurrency(null);
    setEditModalOpen(true);
  };

  // Edit button
  const handleEdit = (currency: ApiCurrency) => {
    setEditingCurrency(currency);
    setEditModalOpen(true);
  };

  // Delete button
  const handleDelete = (currency: ApiCurrency) => {
    setDeletingCurrency(currency);
    setDeleteModalOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deletingCurrency) return;

    setIsDeleting(true);
    const startTime = Date.now();
    let res: Response | null = null;
    try {
      res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.CURRENCIES}/${deletingCurrency.code}`,
        {
          method: 'DELETE',
        }
      );

      if (res && res.ok) {
        ToastNotify.success('Currency deleted successfully');
        // 清除基础数据缓存
        clearBasicDataCache(['currencies']);
        // 刷新列表
        handleRefresh();
      } else {
        const errorData = await res
          ?.json()
          .catch(() => ({ message: 'Failed to delete currency' }));
        throw new Error(errorData.message || 'Failed to delete currency');
      }
    } catch (error: any) {
      ToastNotify.error(error?.message?.[0] || 'Failed to delete currency');
    } finally {
      await recordAccessLog({
        path: `/currencies`,
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({
          name: deletingCurrency.name,
          id: deletingCurrency.code,
        }),
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });

      setIsDeleting(false);
      setDeleteModalOpen(false);
      setDeletingCurrency(null);
    }
  };

  useEffect(() => {
    const fetchCurrencies = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 使用缓存的基础数据
        const data = await getBasicData(
          'currencies',
          CONFIG.API_BASE_URL + API_ROUTES.CURRENCIES
        );
        setCurrencies(data || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setCurrencies([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCurrencies();
  }, [logout, userRole, refreshKey]);

  // columns config
  const columns: ListColumn<ApiCurrency>[] = [
    { key: 'code', title: 'Code' },
    { key: 'name', title: 'Name' },
    { key: 'symbol', title: 'Symbol' },
    { key: 'precision', title: 'Precision' },
    {
      key: 'is_crypto',
      title: 'Type',
      render: (v, row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.is_crypto
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:bg-opacity-25 dark:text-indigo-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:bg-opacity-25 dark:text-emerald-400'
          }`}
        >
          {row.is_crypto ? 'Crypto' : 'Fiat'}
        </span>
      ),
    },
    ...(can('currency', 'edit')
      ? [
          {
            key: 'actions',
            title: 'Actions',
            align: 'center' as const,
            render: (v: any, row: ApiCurrency) => (
              <>
                <button
                  onClick={() => handleEdit(row)}
                  className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition-colors"
                  title="Edit Currency"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(row)}
                  className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Delete Currency"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
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

  // Custom filter function: supports code, name, symbol
  const currencyFilter = (item: ApiCurrency, search: string) => {
    const s = search.trim().toLowerCase();
    return (
      (item.code && item.code.toLowerCase().includes(s)) ||
      (item.name && item.name.toLowerCase().includes(s)) ||
      (item.symbol && item.symbol.toLowerCase().includes(s))
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={currencies}
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
          can('currency', 'create')
            ? { label: 'Add Currency', onClick: handleAdd }
            : undefined
        }
        actions={actions}
        searchPlaceholder="Search by Code, Name, Symbol..."
        filterFunction={currencyFilter as any}
        onRefresh={handleRefresh}
      />
      <EditCurrencyModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          handleRefresh();
        }}
        editData={editingCurrency || undefined}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingCurrency(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Currency"
        message={`Are you sure you want to delete currency "${deletingCurrency?.code} - ${deletingCurrency?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="bg-red-600 hover:bg-red-700 focus-visible:outline-red-500"
      />
    </>
  );
};

export default CurrencyList;
