'use client';

import {
  CheckIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import {
  CONFIG,
  ENUM_CONFIG,
  DEFAULT_PAGE_SIZE,
  WEB_ACTION_METHODS,
  ACCESS_LOG_TYPE,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, maskedLongID, recordAccessLog } from '@/lib/utils';
import { getBasicData } from '@/lib/basic-data.service';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import ToastNotify from './ToastNotify';
import { useBasicData } from '@/hooks/useBasicData';

interface ApiMerchant {
  id: string;
  name: string;
  secret_key: string;
  enabled: boolean;
  created_at: string;
  router_name: string;
  balance: string;
  currency: string;
}

interface MerchantApiResponse {
  data: ApiMerchant[];
  total: number;
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: string;
}

// New interface for props
interface MerchantListProps {
  onViewDetail: (merchantId: string, merchantName: string) => void;
}

const MerchantList = ({ onViewDetail }: MerchantListProps) => {
  const { logoutSync, userRole, user } = useAuth();
  const router = useRouter();
  const [rawMerchants, setRawMerchants] = useState<ApiMerchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.DESC);
  const [currentPage, setCurrentPage] = useState(1);

  // Add Merchant Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [routers, setRouters] = useState<any[]>([]);
  const [isLoadingRouters, setIsLoadingRouters] = useState(false);
  const [newMerchantData, setNewMerchantData] = useState({
    name: '',
    router_id: '',
    enabled: true,
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleAddMerchant = () => {
    setIsAddModalOpen(true);
    fetchRouters();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  };

  const formatBalance = (balance: string | null | undefined) => {
    if (
      balance === null ||
      balance === undefined ||
      balance === '' ||
      isNaN(Number(balance))
    )
      return '---';
    const num = parseFloat(balance);
    if (isNaN(num)) return '---';
    return num.toFixed(2);
  };

  const handleRefresh = () => setRefreshKey(k => k + 1);

  const handleCopyId = (id: string) => {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(err => console.error('Failed to copy ID: ', err));
  };

  const fetchRouters = async () => {
    setIsLoadingRouters(true);
    try {
      const routersData = await getBasicData(
        'routers',
        CONFIG.API_BASE_URL + API_ROUTES.ROUTERS
      );
      console.log('Routers data:', routersData);
      setRouters(routersData || []);
    } catch (err: any) {
      console.error('Error fetching routers:', err);
      ToastNotify.error(err.message || 'Failed to fetch routers');
    } finally {
      setIsLoadingRouters(false);
    }
  };

  const handleCreateMerchant = async () => {
    if (!newMerchantData.name.trim()) {
      ToastNotify.error('Merchant name is required');
      return;
    }

    setIsCreating(true);
    const startTime = Date.now();
    let res: Response | null = null;
    let requestBody: Record<string, any> = {};
    try {
      requestBody = {
        name: newMerchantData.name.trim(),
        enabled: newMerchantData.enabled,
      };

      if (newMerchantData.router_id) {
        requestBody.router_id = newMerchantData.router_id;
      }

      res = await authFetch(`${CONFIG.API_BASE_URL}${API_ROUTES.MERCHANTS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (res && res.ok) {
        const data = await res.json();
        console.log('Create merchant response:', data);
        ToastNotify.success('Merchant created successfully');
        setIsAddModalOpen(false);
        setNewMerchantData({ name: '', router_id: '', enabled: true });

        // 直接跳转到新创建的商户详情页面
        if (data.id) {
          onViewDetail(data.id, data.name);
        } else {
          // 如果没有返回ID，刷新列表
          handleRefresh();
        }
      } else {
        const errorData = await res?.json();
        console.error('API error response:', errorData);
        const errorMessage =
          errorData?.message ||
          errorData?.error ||
          `Failed to create merchant: ${res?.status || 'unknown'} ${res?.statusText || 'unknown error'}`;
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('Error creating merchant:', err);
      ToastNotify.error(err.message || 'Failed to create merchant');
    } finally {
      await recordAccessLog({
        path: '/merchant-list',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.CREATE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify(requestBody),
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setIsAddModalOpen(false);
    setNewMerchantData({ name: '', router_id: '', enabled: true });
  };

  useEffect(() => {
    const fetchMerchants = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = CONFIG.API_BASE_URL + API_ROUTES.MERCHANTS;
        const response = await authFetch(apiUrl);
        if (!response) {
          logoutSync();
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch merchants' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result: MerchantApiResponse = await response.json();
        setRawMerchants(result.data || []);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
        setRawMerchants([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMerchants();
  }, [logoutSync, refreshKey, userRole, router]);

  // columns配置
  const columns: ListColumn<ApiMerchant>[] = [
    {
      key: 'name',
      title: 'Merchant Name',
      render: (v, row) => (
        <button
          onClick={e => {
            e.stopPropagation();
            onViewDetail(row.id, row.name);
          }}
          className="text-sky-600 dark:text-sky-400 font-medium hover:underline cursor-pointer"
          title={`View details for ${row.name}`}
        >
          {row.name}
        </button>
      ),
    },
    {
      key: 'id',
      title: 'Merchant ID',
      render: (v, row) => (
        <div className="flex items-center space-x-1.5">
          <span className="font-medium" title={row.id}>
            {maskedLongID(row.id)}
          </span>
          <button
            onClick={e => {
              e.stopPropagation();
              handleCopyId(row.id);
            }}
            title="Copy full ID"
            className="text-gray-400 dark:text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 focus:outline-none"
          >
            {copiedId === row.id ? (
              <CheckIcon className="h-4 w-4 text-green-500" />
            ) : (
              <ClipboardDocumentIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      ),
    },
    { key: 'router_name', title: 'Router Name' },
    {
      key: 'balance',
      title: 'Balance',
      align: 'right',
      render: (v, row) => {
        const amount =
          row.balance === null ||
          row.balance === undefined ||
          row.balance === '' ||
          isNaN(Number(row.balance))
            ? '0'
            : parseFloat(row.balance).toFixed(2);
        const currency = row.currency || '';
        return `${amount} ${currency}`;
      },
    },
    { key: 'enabled', title: 'Status' },
    // {
    //   key: 'created_at',
    //   title: 'Created At',
    //   render: (v, row) => formatDate(row.created_at),
    // },
  ];

  // ActionDropdown配置
  const actions: ActionDropdownItem[] = [
    {
      label: 'Refresh',
      icon: (
        <ArrowPathIcon
          className={isLoading ? 'animate-spin h-4 w-4' : 'h-4 w-4'}
        />
      ),
      onClick: handleRefresh,
      disabled: isLoading,
    },
  ];

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={rawMerchants}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
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
        addButton={{ label: 'Add Merchant', onClick: handleAddMerchant }}
        actions={actions}
        searchPlaceholder="Search by Name, ID, Router Name, Currency..."
        onRowClick={row => onViewDetail(row.id, row.name)}
      />

      {/* Add Merchant Modal */}
      {isAddModalOpen && (
        <div
          onMouseDown={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Add New Merchant
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <FloatingLabelInput
                id="merchantName"
                name="merchantName"
                label="Merchant Name"
                value={newMerchantData.name}
                onChange={e =>
                  setNewMerchantData({
                    ...newMerchantData,
                    name: e.target.value,
                  })
                }
                inputClassName="bg-transparent"
                labelClassName="bg-white dark:bg-gray-800"
              />

              <FloatingLabelSelect
                id="routerSelect"
                name="routerSelect"
                label="Router (Optional)"
                value={newMerchantData.router_id}
                onChange={e =>
                  setNewMerchantData({
                    ...newMerchantData,
                    router_id: e.target.value,
                  })
                }
                selectClassName="bg-transparent"
                labelClassName="bg-white dark:bg-gray-800"
              >
                <option value="">No Router</option>
                {routers.map(router => (
                  <option key={router.id} value={router.id}>
                    {router.name}
                  </option>
                ))}
              </FloatingLabelSelect>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enabled
                </span>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${newMerchantData.enabled ? 'bg-sky-500' : 'bg-gray-300'}`}
                  onClick={() =>
                    setNewMerchantData({
                      ...newMerchantData,
                      enabled: !newMerchantData.enabled,
                    })
                  }
                  aria-checked={newMerchantData.enabled}
                  role="switch"
                >
                  <span className="sr-only">Toggle Enabled</span>
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${newMerchantData.enabled ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center space-x-3">
              <button
                onClick={handleClose}
                className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMerchant}
                disabled={isCreating || !newMerchantData.name.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Merchant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MerchantList;
