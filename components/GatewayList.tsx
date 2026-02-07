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
  COLOR_BADGE_LIST,
  WEB_ACTION_METHODS,
  ACCESS_LOG_TYPE,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import EditGatewayModal from './EditGatewayModal';
import { usePermission } from '@/hooks/usePermission';
import ToastNotify from './ToastNotify';
import { useBasicData } from '@/hooks/useBasicData';

interface ApiGateway {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  methods: GatewayMethod[];
  banks: GatewayBank[];
  object?: string;
  account?: string;
  secret?: string;
  api?: string;
  metadata?: any;
  currencies?: string[];
}

interface GatewayMethod {
  id: string;
  name: string;
  code: string;
}

interface GatewayBank {
  id: string;
  name: string;
  enabled: boolean;
}

interface GatewayFormData {
  id: string;
  name: string;
  type: string;
  object: string;
  account: string;
  secret: string;
  api: string;
  metadata: string;
  enabled: boolean;
  methods: string[];
  currencies: string[];
}

const GatewayList: React.FC = () => {
  const { can } = usePermission();
  const { logout, userRole, user } = useAuth();
  const [gateways, setGateways] = useState<ApiGateway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.ASC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<GatewayFormData | null>(
    null
  );
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingGateway, setDeletingGateway] = useState<ApiGateway | null>(
    null
  );
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();
  // Refresh button
  const handleRefresh = () => setRefreshKey(k => k + 1);
  // Add button
  const handleAdd = () => {
    setAddModalOpen(true);
  };

  const handleEdit = (row: ApiGateway) => {
    setEditingGateway({
      id: row.id,
      name: row.name,
      type: row.type,
      object: row.object || '',
      account: row.account || '',
      secret: row.secret || '',
      api: row.api || '',
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? row.metadata
          : JSON.stringify(row.metadata, null, 2)
        : '',
      enabled: row.enabled,
      methods: row.methods ? row.methods.map((m: any) => m.id) : [],
      currencies: row.currencies || [],
    });
  };

  const handleDelete = (row: ApiGateway) => {
    setDeletingGateway(row);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingGateway) return;
    const startTime = Date.now();
    let res: Response | null = null;
    try {
      res = await authFetch(
        `${CONFIG.API_BASE_URL + API_ROUTES.GATEWAYS}/${deletingGateway.id}`,
        {
          method: 'DELETE',
        }
      );
      if (res && res.ok) {
        ToastNotify.success('Deleted successfully');
        handleRefresh();
      } else {
        const err = await res?.json().catch(() => ({}));
        alert(err.message || 'Failed to delete');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    } finally {
      await recordAccessLog({
        path: `/gateways`,
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({
          name: deletingGateway.name,
          id: deletingGateway.id,
        }),
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });
      setDeleteConfirmOpen(false);
      setDeletingGateway(null);
    }
  };

  useEffect(() => {
    const fetchGateways = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = CONFIG.API_BASE_URL + API_ROUTES.GATEWAYS;
        const response = await authFetch(apiUrl);
        if (!response) {
          logout();
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch gateways' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result: ApiGateway[] = await response.json();
        setGateways(result || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setGateways([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGateways();
  }, [logout, userRole, refreshKey]);

  // columns config
  const columns: ListColumn<ApiGateway>[] = [
    { key: 'name', title: 'Name' },
    { key: 'type', title: 'Type' },
    {
      key: 'methods',
      title: 'Methods',
      render: (v, row) => {
        return row.methods && row.methods.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.methods.slice(0, 2).map(b => (
              <span
                key={b.id}
                className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-600 text-xs border-none dark:bg-amber-700 dark:bg-opacity-25 dark:text-amber-300"
              >
                {b.name}
              </span>
            ))}
            {row.methods.length > 3 && (
              <span
                className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-400 text-xs dark:bg-amber-900 dark:bg-opacity-25 dark:text-amber-400 border-none"
                title={row.methods.map(b => b.name).join(', ')}
              >
                +{row.methods.length - 2}
              </span>
            )}
          </div>
        ) : (
          '-'
        );
      },
    },
    {
      key: 'banks',
      title: 'Banks',
      render: (v, row) => {
        return row.banks && row.banks.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.banks.slice(0, 2).map(b => (
              <span
                key={b.id}
                className="inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 text-xs border-none dark:bg-indigo-700 dark:bg-opacity-25 dark:text-indigo-300"
              >
                {b.name}
              </span>
            ))}
            {row.banks.length > 3 && (
              <span
                className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-400 text-xs dark:bg-indigo-900 dark:bg-opacity-25 dark:text-indigo-400 border-none"
                title={row.banks.map(b => b.name).join(', ')}
              >
                +{row.banks.length - 2}
              </span>
            )}
          </div>
        ) : (
          '-'
        );
      },
    },
    {
      key: 'currencies',
      title: 'Currencies',
      render: (v, row) =>
        row.currencies && row.currencies.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.currencies.slice(0, 3).map((c, idx) => (
              <span
                key={c}
                className="inline-block px-2 py-0.5 rounded bg-sky-100 text-sky-600 text-xs border-none dark:bg-sky-800 dark:bg-opacity-25 dark:text-sky-400"
              >
                {c}
              </span>
            ))}
            {row.currencies.length > 3 && (
              <span
                className="inline-block px-2 py-0.5 rounded bg-sky-50 text-sky-400 text-xs dark:bg-sky-900 dark:bg-opacity-25 dark:text-sky-500 border-none"
                title={row.currencies.join(', ')}
              >
                +{row.currencies.length - 3}
              </span>
            )}
          </div>
        ) : (
          '-'
        ),
    },
    { key: 'enabled', title: 'Enabled' },
    ...(can('gateway', 'edit')
      ? [
          {
            key: 'actions',
            title: 'Actions',
            align: 'center' as const,
            render: (v: any, row: ApiGateway) => (
              <div className="flex items-center justify-center space-x-1">
                <button
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleEdit(row)}
                  title="Edit"
                >
                  <PencilSquareIcon className="h-4 w-4 text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400" />
                </button>
                <button
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleDelete(row)}
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                </button>
              </div>
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

  // Custom filter function: supports name, type, methods[].name, banks[].name
  const gatewayFilter = (item: ApiGateway, search: string) => {
    const s = search.trim().toLowerCase();
    return (
      (item.name?.toLowerCase() || '').includes(s) ||
      (item.type?.toLowerCase() || '').includes(s) ||
      (item.methods &&
        item.methods.some(m => (m.name?.toLowerCase() || '').includes(s))) ||
      (item.banks &&
        item.banks.some(b => (b.name?.toLowerCase() || '').includes(s)))
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={gateways}
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
          can('gateway', 'create')
            ? { label: 'Add Gateway', onClick: handleAdd }
            : undefined
        }
        actions={actions}
        searchPlaceholder="Search by Name, Type, Bank..."
        filterFunction={gatewayFilter}
      />
      <EditGatewayModal
        isOpen={isAddModalOpen || !!editingGateway}
        onClose={() => {
          setAddModalOpen(false);
          setEditingGateway(null);
        }}
        onSuccess={() => {
          setAddModalOpen(false);
          setEditingGateway(null);
          handleRefresh();
        }}
        editData={editingGateway || undefined}
      />
      {isDeleteConfirmOpen && (
        <div
          onClick={() => setDeleteConfirmOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Delete Gateway
              </h2>
            </div>
            <div className="p-6">
              <p>
                Are you sure you want to delete gateway{' '}
                <b>{deletingGateway?.name}</b>?
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center space-x-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GatewayList;
