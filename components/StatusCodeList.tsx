'use client';
import {
  ArrowPathIcon,
  CheckIcon,
  NoSymbolIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { CONFIG, ENUM_CONFIG, DEFAULT_PAGE_SIZE } from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch } from '@/lib/utils';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import EditStatusCodeModal from './EditStatusCodeModal';
import { usePermission } from '@/hooks/usePermission';
import Can from './Can';
import { useBasicData } from '@/hooks/useBasicData';

interface ApiStatusCode {
  id: string;
  code: string;
  description: string;
  is_final: boolean;
  created_at: string;
  updated_at: string;
}

const StatusCodeList: React.FC = () => {
  const { logout, userRole } = useAuth();
  const { can } = usePermission();
  const [statusCodes, setStatusCodes] = useState<ApiStatusCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('code');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.ASC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<ApiStatusCode | null>(null);

  // Refresh button
  const handleRefresh = () => setRefreshKey(k => k + 1);

  // Add button
  const handleAdd = () => {
    setEditData(null);
    setIsModalOpen(true);
  };

  // Edit button
  const handleEdit = (statusCode: ApiStatusCode) => {
    setEditData(statusCode);
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

  useEffect(() => {
    const fetchStatusCodes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = CONFIG.API_BASE_URL + API_ROUTES.STATUS_CODES;
        const response = await authFetch(apiUrl);
        if (!response) {
          logout();
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch status codes' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result: ApiStatusCode[] = await response.json();
        setStatusCodes(result || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setStatusCodes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatusCodes();
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

  // columns config
  const columns: ListColumn<ApiStatusCode>[] = [
    { key: 'code', title: 'Code' },
    { key: 'description', title: 'Description' },
    {
      key: 'is_final',
      title: 'Is Final',
      render: v =>
        v ? <CheckIcon className="h-5 w-5 text-green-500 inline" /> : null,
    },
    // 只有有编辑权限时才显示 Actions 列
    ...(can('status_code', 'edit')
      ? [
          {
            key: 'actions',
            title: 'Actions',
            align: 'center' as const,
            render: (v: any, row: ApiStatusCode) => (
              <button
                onClick={() => handleEdit(row)}
                className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition-colors"
                title="Edit status code"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
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

  // Custom filter function: supports code and description
  const statusCodeFilter = (item: ApiStatusCode, search: string) => {
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
        rawData={statusCodes}
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
          can('status_code', 'create')
            ? { label: 'Add Status Code', onClick: handleAdd }
            : undefined
        }
        actions={actions}
        searchPlaceholder="Search by Code, Description..."
        filterFunction={statusCodeFilter}
      />

      <EditStatusCodeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        editData={editData}
      />
    </>
  );
};

export default StatusCodeList;
