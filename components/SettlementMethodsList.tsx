'use client';

import {
  ArrowPathIcon,
  PencilSquareIcon,
  CheckIcon,
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
  SETTLEMENT_CYCLE,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import { getBasicData } from '@/lib/basic-data.service';
import { useBasicData } from '@/hooks/useBasicData';
import EditSettlementMethodModal from './EditSettlementMethodModal';
import ConfirmationModal from './ConfirmationModal';
import { usePermission } from '@/hooks/usePermission';

interface ApiSettlementMethod {
  id: string;
  user_id: string;
  user_type: string;
  type: string;
  payee_name: string;
  account_number: string;
  bank_name: string | null;
  currency_code: string;
  is_default: boolean;
  metadata: any;
  status: string;
  settlement_cycle: SETTLEMENT_CYCLE;
  auto_settlement: boolean;
  min_settlement_amount: string;
  created_at: string;
  username: string;
}

const SettlementMethodsList: React.FC = () => {
  const { logout, userRole, user } = useAuth();
  const { can } = usePermission();
  const [settlementMethods, setSettlementMethods] = useState<
    ApiSettlementMethod[]
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
  const [editingSettlementMethod, setEditingSettlementMethod] =
    useState<ApiSettlementMethod | null>(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingSettlementMethod, setDeletingSettlementMethod] =
    useState<ApiSettlementMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // Refresh button
  const handleRefresh = () => setRefreshKey(k => k + 1);

  // Add button
  const handleAdd = () => {
    setEditingSettlementMethod(null);
    setEditModalOpen(true);
  };

  // Edit button
  const handleEdit = (settlementMethod: ApiSettlementMethod) => {
    setEditingSettlementMethod(settlementMethod);
    setEditModalOpen(true);
  };

  // Delete button
  const handleDelete = (settlementMethod: ApiSettlementMethod) => {
    setDeletingSettlementMethod(settlementMethod);
    setDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingSettlementMethod) return;

    const startTime = Date.now();
    let res: Response | null = null;
    setIsDeleting(true);
    try {
      const deleteUrl =
        CONFIG.API_BASE_URL +
        API_ROUTES.SETTLEMENT_METHODS_DETAILS.replace(
          ':id',
          deletingSettlementMethod.id
        );
      res = await authFetch(deleteUrl, {
        method: 'DELETE',
      });

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

      // Refresh the list
      handleRefresh();
      setDeleteModalOpen(false);
      setDeletingSettlementMethod(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      // You might want to show a toast notification here
    } finally {
      await recordAccessLog({
        path: '/settlement-methods',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({
          name: deletingSettlementMethod.payee_name,
          id: deletingSettlementMethod.id,
        }),
        response: JSON.stringify(res),
        duration_ms: Date.now() - startTime,
      });
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchSettlementMethods = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = CONFIG.API_BASE_URL + API_ROUTES.SETTLEMENT_METHODS;
        const response = await authFetch(apiUrl);
        if (!response) {
          logout();
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch settlement methods' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result: ApiSettlementMethod[] = await response.json();
        setSettlementMethods(result || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setSettlementMethods([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettlementMethods();
  }, [logout, userRole, refreshKey]);

  // columns config
  const columns: ListColumn<ApiSettlementMethod>[] = [
    ...(can('user', 'view') ? [{ key: 'username', title: 'Username' }] : []),
    {
      key: 'user_type',
      title: 'User Type',
      render: (v, row) => {
        const userTypeColors = {
          merchant:
            'bg-amber-100 text-amber-600 dark:bg-amber-800 dark:bg-opacity-25 dark:text-amber-400',
          agent:
            'bg-indigo-100 text-indigo-600 dark:bg-indigo-800 dark:bg-opacity-25 dark:text-indigo-400',
        };
        const colorClass =
          userTypeColors[v as keyof typeof userTypeColors] ||
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:bg-opacity-25 dark:text-gray-400';
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${colorClass}`}
          >
            {v}
          </span>
        );
      },
    },
    {
      key: 'type',
      title: 'Type',
      render: (v, row) => {
        const typeColors = {
          bank: 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:bg-opacity-25 dark:text-blue-400',
          crypto:
            'bg-purple-100 text-purple-600 dark:bg-purple-800 dark:bg-opacity-25 dark:text-purple-400',
        };
        const colorClass =
          typeColors[v as keyof typeof typeColors] ||
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:bg-opacity-25 dark:text-gray-400';
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${colorClass}`}
          >
            {v}
          </span>
        );
      },
    },
    { key: 'payee_name', title: 'Payee' },
    {
      key: 'account_number',
      title: 'Account Number',
      render: (v, row) => {
        // Truncate long account numbers for better display
        const displayValue =
          v.length > 20
            ? `${v.substring(0, 10)}...${v.substring(v.length - 10)}`
            : v;
        return (
          <span className="font-mono text-sm" title={v}>
            {displayValue}
          </span>
        );
      },
    },
    {
      key: 'currency_code',
      title: 'Currency',
      render: (v, row) => (
        <span className="font-mono text-sm" title={v}>
          {v}
        </span>
      ),
    },
    ...(can('user', 'view')
      ? [
          {
            key: 'settlement_cycle',
            title: 'Cycle',
            render: (v: SETTLEMENT_CYCLE, row: ApiSettlementMethod) => {
              const cycleColors = {
                [SETTLEMENT_CYCLE.MANUAL]:
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:bg-opacity-25 dark:text-gray-400',
                [SETTLEMENT_CYCLE.T0]:
                  'bg-green-100 text-green-600 dark:bg-green-800 dark:bg-opacity-25 dark:text-green-400',
                [SETTLEMENT_CYCLE.D0]:
                  'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:bg-opacity-25 dark:text-blue-400',
                [SETTLEMENT_CYCLE.T1]:
                  'bg-yellow-100 text-yellow-600 dark:bg-yellow-800 dark:bg-opacity-25 dark:text-yellow-400',
                [SETTLEMENT_CYCLE.T15]:
                  'bg-purple-100 text-purple-600 dark:bg-purple-800 dark:bg-opacity-25 dark:text-purple-400',
                [SETTLEMENT_CYCLE.MONTHLY]:
                  'bg-orange-100 text-orange-600 dark:bg-orange-800 dark:bg-opacity-25 dark:text-orange-400',
              };
              const colorClass =
                cycleColors[v as keyof typeof cycleColors] ||
                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:bg-opacity-25 dark:text-gray-400';
              return (
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
                >
                  {v}
                </span>
              );
            },
          },
        ]
      : []),
    ...(can('user', 'view')
      ? [
          {
            key: 'min_settlement_amount',
            title: 'Min Amount',
            render: (v: string, row: ApiSettlementMethod) => {
              const amount = parseFloat(v || '0');
              return amount > 0 ? (
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                  {amount}
                </span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">-</span>
              );
            },
          },
        ]
      : []),
    {
      key: 'is_default',
      title: 'Is Default',
      render: v =>
        v ? <CheckIcon className="h-5 w-5 text-green-500 inline" /> : null,
    },
    {
      key: 'status',
      title: 'Status',
      render: (v, row) => {
        const statusColors = {
          active:
            'bg-green-100 text-green-700 dark:bg-green-700 dark:bg-opacity-25 dark:text-green-500',
          inactive:
            'bg-red-100 text-red-700 dark:bg-red-700 dark:bg-opacity-25 dark:text-red-400',
        };
        const colorClass =
          statusColors[v as keyof typeof statusColors] ||
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:bg-opacity-25 dark:text-gray-400';
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${colorClass}`}
          >
            {v}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'center',
      render: (v, row) => (
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition-colors"
            title="Edit Settlement Method"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          {can('settlement_method', 'delete') && (
            <button
              onClick={() => handleDelete(row)}
              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
              title="Delete Settlement Method"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
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

  // Custom filter function: supports name, type, account_number, bank_name, currency_code, user_type, username, settlement_cycle, auto_settlement, min_settlement_amount
  const settlementMethodFilter = (
    item: ApiSettlementMethod,
    search: string
  ) => {
    const s = search.trim().toLowerCase();
    return (
      (item.payee_name?.toLowerCase() || '').includes(s) ||
      (item.type?.toLowerCase() || '').includes(s) ||
      (item.account_number?.toLowerCase() || '').includes(s) ||
      (item.bank_name?.toLowerCase() || '').includes(s) ||
      (item.currency_code?.toLowerCase() || '').includes(s) ||
      (item.user_type?.toLowerCase() || '').includes(s) ||
      (item.username?.toLowerCase() || '').includes(s) ||
      (item.settlement_cycle?.toLowerCase() || '').includes(s) ||
      (item.auto_settlement ? 'yes' : 'no').includes(s) ||
      (item.min_settlement_amount?.toLowerCase() || '').includes(s)
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={settlementMethods}
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
        addButton={{ label: 'Add Settlement Method', onClick: handleAdd }}
        actions={actions}
        searchPlaceholder="Search by Name, Username, User Type, Type, Account, Bank, Currency, Settlement Cycle..."
        filterFunction={settlementMethodFilter}
      />
      <EditSettlementMethodModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          handleRefresh();
        }}
        editData={editingSettlementMethod}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingSettlementMethod(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Settlement Method"
        message="Are you sure you want to delete this settlement method? This action cannot be undone."
        confirmText="Delete"
        confirmButtonColor="bg-red-600 hover:bg-red-700"
        customContent={
          <div>
            Settlement Method:{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {deletingSettlementMethod?.payee_name}
            </span>
          </div>
        }
      />
    </>
  );
};

export default SettlementMethodsList;
