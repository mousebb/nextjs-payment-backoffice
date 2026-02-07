import React, { useEffect, useState, useMemo } from 'react';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  DEFAULT_PAGE_SIZE,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import {
  authFetch,
  formatDateByUser,
  getUtcDate,
  recordAccessLog,
} from '@/lib/utils';
import RemotePagingList from './RemotePagingList';
import CommonSelect from './CommonSelect';
import {
  ArrowPathIcon,
  CheckIcon,
  EnvelopeIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import CustomDateRangePicker from './CustomDateRangePicker';
import type { RangeValue } from '@react-types/shared';
import { CalendarDate } from '@internationalized/date';
import EditNotificationModal from './EditNotificationModal';
import { useAuth } from './AuthContext';
import ConfirmationModal from './ConfirmationModal';
import ToastNotify from './ToastNotify';
import NotificationDetailModal from './NotificationDetailModal';
import { usePermission } from '@/hooks/usePermission';
import { useBasicData } from '@/hooks/useBasicData';

interface Notification {
  id: string;
  title: string;
  type: string;
  is_broadcast: boolean;
  created_at: string;
  expires_at: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
}

const NOTIFICATION_TYPES = [
  { id: 'warning', name: 'Warning' },
  { id: 'info', name: 'Info' },
  { id: 'system', name: 'System' },
  { id: 'personal', name: 'Personal' },
];

const TypeBadge = ({ type }: { type: string }) => {
  let color = '';
  switch (type) {
    case 'warning':
      color =
        'bg-orange-100 text-orange-700 dark:bg-orange-700 dark:bg-opacity-25 dark:text-orange-400';
      break;
    case 'info':
      color =
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:bg-opacity-25 dark:text-yellow-400';
      break;
    case 'system':
      color =
        'bg-red-100 text-red-700 dark:bg-red-700 dark:bg-opacity-25 dark:text-red-400';
      break;
    case 'personal':
      color =
        'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400';
      break;
    default:
      color =
        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400';
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${color}`}
    >
      {type}
    </span>
  );
};

const NotificationList: React.FC = () => {
  const { user } = useAuth();
  const { can } = usePermission();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedType, setSelectedType] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<
    RangeValue<CalendarDate>
  >(() => {
    const today = new CalendarDate(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate()
    );
    return { start: today.subtract({ days: 6 }), end: today };
  });
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // State for add modal
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  // Add button handler
  const handleAdd = () => setAddModalOpen(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailNotification, setDetailNotification] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const totalPages = Math.ceil(totalItems / DEFAULT_PAGE_SIZE);

  const handleTypeChange = (v: string) => {
    setSelectedType(v);
    setCurrentPage(1);
  };
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortColumn(column);
      setSortOrder('ASC');
    }
    setCurrentPage(1);
  };
  const handleRefresh = () => setRefreshKey(k => k + 1);
  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
    setRefreshKey(k => k + 1);
  };
  const handleDateRangeChange = (v: RangeValue<CalendarDate>) => {
    setSelectedDateRange(v);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    const startTime = Date.now();
    let res: Response | null = null;
    try {
      if (id === 'ALL_EXPIRED') {
        res = await authFetch(
          CONFIG.API_BASE_URL + API_ROUTES.NOTIFICATIONS_DELETE_EXPIRED,
          { method: 'DELETE' }
        );
      } else {
        res = await authFetch(
          CONFIG.API_BASE_URL + API_ROUTES.NOTIFICATIONS + '/' + id,
          { method: 'DELETE' }
        );
      }
      setDeleteId(null);
      handleRefresh();
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to delete notification');
    } finally {
      await recordAccessLog({
        path: `/notifications`,
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({ id }),
        response: '',
        duration_ms: Date.now() - startTime,
      });
      setIsDeleting(false);
    }
  };

  const handleMarkAsRead = async (row: Notification) => {
    const startTime = Date.now();
    let res: Response | null = null;
    try {
      res = await authFetch(
        CONFIG.API_BASE_URL +
          API_ROUTES.NOTIFICATIONS_READ.replace(':id', row.id),
        { method: 'POST' }
      );
      setNotifications(prev =>
        prev.map(n => (n.id === row.id ? { ...n, is_read: true } : n))
      );
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to mark as read');
    } finally {
      await recordAccessLog({
        path: `/notifications`,
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.UPDATE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({ id: row.id, is_read: true }),
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });
    }
  };

  const fetchNotificationDetail = async (row: Notification) => {
    setDetailLoading(true);
    try {
      const res = await authFetch(
        CONFIG.API_BASE_URL +
          API_ROUTES.NOTIFICATIONS_DETAILS.replace(':id', row.id)
      );
      if (!res || !res.ok)
        throw new Error('Failed to fetch notification detail');
      const data = await res.json();
      setDetailNotification(data);
      setDetailModalOpen(true);
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to fetch notification detail');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', DEFAULT_PAGE_SIZE.toString());
        params.append('orderBy', sortColumn);
        params.append('orderDirection', sortOrder);
        if (selectedType) params.append('type', selectedType);
        if (searchTerm.trim()) {
          params.append('title', searchTerm.trim());
          params.append('content', searchTerm.trim());
        }
        if (selectedDateRange) {
          if (selectedDateRange.start) {
            params.append(
              'start',
              `${getUtcDate(selectedDateRange.start.toString(), true).toISOString()}`
            );
          }
          if (selectedDateRange.end) {
            params.append(
              'end',
              `${getUtcDate(selectedDateRange.end.toString(), false).toISOString()}`
            );
          }
        }
        const apiUrl = can('notification', 'create')
          ? CONFIG.API_BASE_URL +
            API_ROUTES.NOTIFICATIONS +
            `?${params.toString()}`
          : CONFIG.API_BASE_URL +
            API_ROUTES.NOTIFICATION_PERSONAL +
            `?${params.toString()}`;
        const response = await authFetch(apiUrl);
        if (!response) return;
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || 'Failed to fetch notifications');
        setNotifications(result.data || []);
        setTotalItems(result.total || 0);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, [
    currentPage,
    selectedType,
    sortColumn,
    sortOrder,
    refreshKey,
    searchTerm,
    selectedDateRange,
  ]);

  const columns = useMemo(
    () => [
      {
        key: 'title',
        title: 'Title',
        sortable: true,
        render: (v: string) => (v.length > 30 ? v.slice(0, 30) + '...' : v),
      },
      {
        key: 'type',
        title: 'Type',
        sortable: true,
        render: (v: string) => <TypeBadge type={v} />,
      },
      ...(!can('notification', 'create')
        ? [
            {
              key: 'is_read',
              title: 'Read',
              sortable: true,
              render: (v: boolean) =>
                v ? (
                  <CheckIcon className="h-5 w-5 text-green-500 inline" />
                ) : (
                  <XMarkIcon className="h-5 w-5 text-red-500 inline" />
                ),
            },
          ]
        : []),
      {
        key: 'is_broadcast',
        title: 'Broadcast',
        sortable: true,
        render: (v: boolean) =>
          v ? <CheckIcon className="h-5 w-5 text-green-500 inline" /> : null,
      },
      {
        key: 'created_at',
        title: 'Created At',
        sortable: true,
        render: (v: string) =>
          formatDateByUser(v, user?.metadata?.data_time_format),
      },
      {
        key: 'expires_at',
        title: 'Expires At',
        sortable: true,
        render: (v: string) =>
          v ? formatDateByUser(v, user?.metadata?.data_time_format) : '-',
      },
      ...(!can('notification', 'create')
        ? [
            {
              key: 'read_at',
              title: 'Read At',
              sortable: true,
              render: (v: string) =>
                v ? formatDateByUser(v, user?.metadata?.data_time_format) : '-',
            },
          ]
        : []),
      ...(can('notification', 'delete')
        ? [
            {
              key: 'actions',
              title: 'Actions',
              render: (_: any, row: Notification) => (
                <button
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Delete Notification"
                  onClick={e => {
                    e.stopPropagation();
                    setDeleteId(row.id);
                  }}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              ),
              align: 'center' as const,
            },
          ]
        : []),
    ],
    [user]
  );

  const filters = (
    <>
      <CommonSelect
        value={selectedType}
        onChange={handleTypeChange}
        options={NOTIFICATION_TYPES}
        placeholder="Type"
      />
      <CustomDateRangePicker
        value={selectedDateRange}
        onChange={handleDateRangeChange}
      />
    </>
  );

  const actions = [
    {
      label: 'Refresh',
      icon: <ArrowPathIcon className="h-5 w-5" />,
      onClick: handleRefresh,
      disabled: isLoading,
    },
    ...(can('notification', 'delete')
      ? [
          {
            label: 'Delete All Expired',
            icon: <TrashIcon className="h-5 w-5" />,
            onClick: () => setDeleteId('ALL_EXPIRED'),
            disabled: isLoading,
          },
        ]
      : []),
  ];

  return (
    <>
      <RemotePagingList
        //   listTitle="Notifications"
        showSearchBar={true}
        columns={columns}
        data={notifications}
        totalItems={totalItems}
        isLoading={isLoading}
        error={error}
        searchTerm={searchTerm}
        onSearchTermChange={handleSearchTermChange}
        searchPlaceholder="Search by title or content..."
        filters={filters}
        actions={actions}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSort={handleSort}
        showCheckboxColumn={false}
        onRowClick={(row: Notification) => {
          if (!can('notification', 'create') && !row.is_read) {
            handleMarkAsRead(row);
          }
          fetchNotificationDetail(row);
        }}
        addButton={
          can('notification', 'create')
            ? {
                label: 'Send Notification',
                onClick: () => setAddModalOpen(true),
                icon: <EnvelopeIcon className="h-5 w-5" />,
              }
            : undefined
        }
      />
      <EditNotificationModal
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          setAddModalOpen(false);
          handleRefresh();
        }}
      />
      <NotificationDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        notification={detailNotification}
      />
      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title={
          deleteId === 'ALL_EXPIRED'
            ? 'Delete All Expired Notifications'
            : 'Delete Notification'
        }
        message={
          deleteId === 'ALL_EXPIRED'
            ? 'Are you sure you want to delete all expired notifications? This action cannot be undone.'
            : 'Are you sure you want to delete this notification? This action cannot be undone.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="bg-red-600 hover:bg-red-700 focus-visible:outline-red-500"
      />
    </>
  );
};

export default NotificationList;
