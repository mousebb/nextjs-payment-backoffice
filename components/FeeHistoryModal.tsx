'use client';

import React, { useState, useEffect } from 'react';
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CONFIG } from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, formatDateByUser } from '@/lib/utils';
import LocalPagingList from './LocalPagingList';
import { ListColumn } from '../types/list';
import { MerchantFeeSetting } from '../types/merchant';
import { ENUM_CONFIG } from '../constants/config';
import { useAuth } from './AuthContext';
import { User } from '../types/user';

interface FeeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchantId: string;
  user: User;
}

const FeeHistoryModal: React.FC<FeeHistoryModalProps> = ({
  isOpen,
  onClose,
  merchantId,
  user,
}) => {
  const [historyData, setHistoryData] = useState<MerchantFeeSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search, sort, and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.DESC);
  const [currentPage, setCurrentPage] = useState(1);

  // 动态生成 columns，依赖 user
  const historyColumns: ListColumn<MerchantFeeSetting>[] = React.useMemo(
    () => [
      { key: 'bank_name', title: 'Bank', render: v => v || '-' },
      { key: 'type', title: 'Type', render: v => v || '-' },
      { key: 'method_name', title: 'Method', render: v => v || '-' },
      { key: 'currency_code', title: 'Currency', render: v => v || '-' },
      {
        key: 'percentage',
        title: '%',
        render: v => (v ? (Number(v) * 100).toFixed(2) + '%' : '-'),
      },
      {
        key: 'fixed_fee',
        title: 'Fixed Fee',
        render: v => (v ? Number(v).toFixed(2) : '-'),
      },
      {
        key: 'min_fee',
        title: 'Min Fee',
        render: v => (v ? Number(v).toFixed(2) : '-'),
      },
      {
        key: 'max_fee',
        title: 'Max Fee',
        render: v => (v ? Number(v).toFixed(2) : '-'),
      },
      { key: 'agent_username', title: 'Agent', render: v => (v ? v : '-') },
      {
        key: 'included_commission_percentage',
        title: 'Comm %',
        render: v => (v ? (Number(v) * 100).toFixed(2) + '%' : '-'),
      },
      {
        key: 'included_commission_fixed',
        title: 'Comm Fixed',
        render: v => (v ? Number(v).toFixed(2) : '-'),
      },
      {
        key: 'updated_at',
        title: 'Disabled At',
        render: v => formatDateByUser(v, user.metadata?.data_time_format),
      },
    ],
    [user]
  );

  // 关闭对话框时清理状态
  const handleClose = () => {
    setHistoryData([]);
    setError(null);
    setSearchTerm('');
    setCurrentPage(1);
    onClose();
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(
        sortOrder === ENUM_CONFIG.ASC ? ENUM_CONFIG.DESC : ENUM_CONFIG.ASC
      );
    } else {
      setSortColumn(column);
      setSortOrder(ENUM_CONFIG.ASC);
    }
  };

  useEffect(() => {
    if (isOpen && merchantId) {
      const fetchHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
          console.log('Fetching fee history for merchant:', merchantId);
          const res = await authFetch(
            `${CONFIG.API_BASE_URL}${API_ROUTES.MERCHANT_FEE_SETTINGS}?merchant_id=${merchantId}&enabled=false`
          );
          if (res && res.ok) {
            const data = await res.json();
            console.log('Fee history API response:', data);

            // Handle different possible data structures
            let feeData = [];
            if (Array.isArray(data.data)) {
              feeData = data.data;
            } else if (Array.isArray(data)) {
              feeData = data;
            } else if (data && typeof data === 'object') {
              feeData = Array.isArray(data.fee_settings)
                ? data.fee_settings
                : [];
            }

            console.log('Processed fee history data:', feeData);
            setHistoryData(feeData);
          } else {
            const errorText = res ? await res.text() : 'No response';
            console.error('API error response:', errorText);
            throw new Error(
              `Failed to fetch fee history: ${res?.status || 'unknown'} ${res?.statusText || 'unknown error'}`
            );
          }
        } catch (err: any) {
          console.error('Error fetching fee history:', err);
          setError(err.message || 'Failed to fetch fee history');
        } finally {
          setIsLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen, merchantId]);

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        className="bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl mx-4 transform transition-all overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Fee & Commission Settings History
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <div className="p-6 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400">Error: {error}</p>
            </div>
          )}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Loading fee history...
              </p>
            </div>
          )}
          {!isLoading && !error && historyData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No disabled fee settings found.
              </p>
            </div>
          )}
          <LocalPagingList
            titleIcon={
              <div className="p-2.5 bg-green-100 dark:bg-green-700/50 rounded-lg mr-4">
                <ClockIcon className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
            }
            columns={historyColumns}
            rawData={historyData}
            isLoading={isLoading}
            error={error}
            searchTerm={searchTerm}
            searchPlaceholder="Search by Bank, Type, Method, Currency..."
            onSearchTermChange={setSearchTerm}
            sortColumn={sortColumn}
            sortOrder={sortOrder}
            onSort={handleSort}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};

export default FeeHistoryModal;
