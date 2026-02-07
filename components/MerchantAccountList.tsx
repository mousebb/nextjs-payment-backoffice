'use client';
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CheckIcon,
  PencilSquareIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  CONFIG,
  ENUM_CONFIG,
  DEFAULT_PAGE_SIZE,
  ACTIVE_STATUS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch } from '@/lib/utils';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import EditMerchantAccountModal from './EditMerchantAccountModal';
import AddMerchantAccountAdjustmentModal from './AddMerchantAccountAdjustmentModal';
import { useBasicData } from '@/hooks/useBasicData';

interface ApiMerchantAccount {
  id: string;
  merchant_id: string;
  merchant_name: string;
  currency_code: string;
  balance: string;
  reserved_balance: string;
  is_default: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

const MerchantAccountList: React.FC = () => {
  const { logout, userRole } = useAuth();
  const [accounts, setAccounts] = useState<ApiMerchantAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('merchant_name');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.ASC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<ApiMerchantAccount | null>(null);
  const [isAdjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingAccount, setAdjustingAccount] =
    useState<ApiMerchantAccount | null>(null);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  const handleRefresh = () => setRefreshKey(k => k + 1);
  const handleAdd = () => {
    setAddModalOpen(true);
  };

  const handleEdit = (account: ApiMerchantAccount) => {
    console.log('Edit account:', account);
    setEditingAccount(account);
    setEditModalOpen(true);
  };

  const handleAdjust = (account: ApiMerchantAccount) => {
    setAdjustingAccount(account);
    setAdjustModalOpen(true);
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setEditingAccount(null);
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setEditingAccount(null);
    handleRefresh();
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = CONFIG.API_BASE_URL + API_ROUTES.MERCHANT_ACCOUNTS;
        const response = await authFetch(apiUrl);
        if (!response) {
          logout();
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch merchant accounts' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result: ApiMerchantAccount[] = await response.json();
        setAccounts(result || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, [logout, userRole, refreshKey]);

  const columns: ListColumn<ApiMerchantAccount>[] = [
    { key: 'merchant_name', title: 'Merchant Name' },
    { key: 'currency_code', title: 'Currency Code' },
    { key: 'balance', title: 'Balance' },
    { key: 'reserved_balance', title: 'Reserved Balance' },
    {
      key: 'is_default',
      title: 'Is Default',
      render: v =>
        v ? <CheckIcon className="h-5 w-5 text-green-500 inline" /> : null,
    },
    {
      key: 'status',
      title: 'Status',
      render: value => {
        const status = value?.toLowerCase();
        let bgColor = '';
        let textColor = '';
        let displayText = value;

        switch (status) {
          case ACTIVE_STATUS.ACTIVE:
            bgColor = 'bg-green-100 dark:bg-green-700 dark:bg-opacity-25';
            textColor = 'text-green-700 dark:text-green-400';
            break;
          case ACTIVE_STATUS.INACTIVE:
            bgColor = 'bg-gray-100 dark:bg-gray-700 dark:bg-opacity-25';
            textColor = 'text-gray-700 dark:text-gray-300';
            break;
          case ACTIVE_STATUS.FROZEN:
            bgColor = 'bg-red-100 dark:bg-red-700 dark:bg-opacity-25';
            textColor = 'text-red-700 dark:text-red-300';
            break;
          case ACTIVE_STATUS.CLOSED:
            bgColor = 'bg-orange-100 dark:bg-orange-700 dark:bg-opacity-25';
            textColor = 'text-orange-700 dark:text-orange-300';
            break;
          default:
            bgColor = 'bg-gray-100 dark:bg-gray-700 dark:bg-opacity-25';
            textColor = 'text-gray-700 dark:text-gray-300';
            break;
        }

        return (
          <span
            className={`capitalize inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
          >
            {displayText}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right',
      render: (_, account) => (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handleEdit(account)}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Edit Account"
          >
            <PencilSquareIcon className="h-4 w-4 text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400" />
          </button>
          <button
            onClick={() => handleAdjust(account)}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Account Adjustments"
          >
            <ArrowsRightLeftIcon className="h-4 w-4 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400" />
          </button>
        </div>
      ),
    },
  ];

  const actions: ActionDropdownItem[] = [
    {
      label: 'Refresh',
      icon: <ArrowPathIcon className="h-4 w-4" />,
      onClick: handleRefresh,
      disabled: isLoading,
    },
  ];

  const filter = (item: ApiMerchantAccount, search: string) => {
    const s = search.trim().toLowerCase();
    return (
      (item.merchant_name?.toLowerCase() || '').includes(s) ||
      (item.currency_code?.toLowerCase() || '').includes(s) ||
      (item.balance?.toLowerCase() || '').includes(s) ||
      (item.reserved_balance?.toLowerCase() || '').includes(s) ||
      (item.is_default ? 'default' : '').includes(s) ||
      (item.status?.toLowerCase() || '').includes(s)
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={accounts}
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
        addButton={{ label: 'Add Merchant Account', onClick: handleAdd }}
        actions={actions}
        searchPlaceholder="Search by Merchant Name, Currency, Status..."
        filterFunction={filter}
      />

      <EditMerchantAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          setAddModalOpen(false);
          handleRefresh();
        }}
      />

      <EditMerchantAccountModal
        isOpen={isEditModalOpen}
        onClose={handleEditClose}
        onSuccess={handleEditSuccess}
        editData={editingAccount || undefined}
      />

      <AddMerchantAccountAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setAdjustModalOpen(false);
          setAdjustingAccount(null);
        }}
        onSuccess={() => {
          setAdjustModalOpen(false);
          setAdjustingAccount(null);
          handleRefresh();
        }}
        merchantAccount={adjustingAccount}
      />
    </>
  );
};

export default MerchantAccountList;
