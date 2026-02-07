'use client';
import { ArrowPathIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  CONFIG,
  ENUM_CONFIG,
  DEFAULT_PAGE_SIZE,
  COLOR_BADGE_LIST,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch } from '@/lib/utils';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import EditBankModal from './EditBankModal';
import { getBasicData } from '@/lib/basic-data.service';
import { useBasicData } from '@/hooks/useBasicData';

interface ApiBank {
  id: string;
  gateway_id: string;
  gateway_name: string;
  router_name: string | null;
  name: string;
  metadata: any;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  methods: BankMethod[];
  currencies: string[];
}

interface BankMethod {
  method_id: string;
  name: string;
  code: string;
}

const BankList: React.FC = () => {
  const { logout, userRole } = useAuth();
  const [banks, setBanks] = useState<ApiBank[]>([]);
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
  const [editingBank, setEditingBank] = useState<ApiBank | null>(null);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // Refresh button
  const handleRefresh = () => setRefreshKey(k => k + 1);
  // Add button
  const handleAdd = () => {
    setEditingBank(null);
    setEditModalOpen(true);
  };

  // Edit button
  const handleEdit = (bank: ApiBank) => {
    setEditingBank(bank);
    setEditModalOpen(true);
  };

  useEffect(() => {
    const fetchBanks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = CONFIG.API_BASE_URL + API_ROUTES.BANKS;
        const response = await authFetch(apiUrl);
        if (!response) {
          logout();
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch banks' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result: ApiBank[] = await response.json();
        setBanks(result || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setBanks([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBanks();
  }, [logout, userRole, refreshKey]);

  // columns config
  const columns: ListColumn<ApiBank>[] = [
    { key: 'name', title: 'Name' },
    { key: 'gateway_name', title: 'Gateway' },
    { key: 'router_name', title: 'Router' },
    {
      key: 'methods',
      title: 'Methods',
      render: (v, row) => {
        return row.methods && row.methods.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.methods.slice(0, 3).map((m, idx) => {
              return (
                <span
                  key={m.method_id}
                  className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-600 text-xs border-none dark:bg-amber-800 dark:bg-opacity-25 dark:text-amber-400"
                >
                  {m.name}
                </span>
              );
            })}
            {row.methods.length > 3 && (
              <span
                className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-400 text-xs dark:bg-amber-900 dark:bg-opacity-25 dark:text-amber-500 border-none"
                title={row.methods.map(m => m.name).join(', ')}
              >
                +{row.methods.length - 3}
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
    {
      key: 'actions',
      title: 'Actions',
      align: 'center',
      render: (v, row) => (
        <button
          onClick={() => handleEdit(row)}
          className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition-colors"
          title="Edit Bank"
        >
          <PencilSquareIcon className="h-4 w-4" />
        </button>
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

  // Custom filter function: supports name, gateway_name, methods[].name, currencies
  const bankFilter = (item: ApiBank, search: string) => {
    const s = search.trim().toLowerCase();
    return (
      (item.name?.toLowerCase() || '').includes(s) ||
      (item.gateway_name?.toLowerCase() || '').includes(s) ||
      (item.router_name?.toLowerCase() || '').includes(s) ||
      (item.methods &&
        item.methods.some(m => (m.name?.toLowerCase() || '').includes(s))) ||
      (item.currencies &&
        item.currencies.some(c => (c?.toLowerCase() || '').includes(s)))
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={banks}
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
        addButton={{ label: 'Add Bank', onClick: handleAdd }}
        actions={actions}
        searchPlaceholder="Search by Name, Gateway, Method, Currency..."
        filterFunction={bankFilter}
      />
      <EditBankModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          handleRefresh();
        }}
        editData={editingBank}
      />
    </>
  );
};

export default BankList;
