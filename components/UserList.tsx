import React, { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import LocalPagingList from './LocalPagingList';
import ConfirmationModal from './ConfirmationModal';
import EditUserModal from './EditUserModal';
import { ListColumn, ActionDropdownItem } from '../types/list';
import ToastNotify from './ToastNotify';
import {
  ACCESS_LOG_TYPE,
  ACTIVE_STATUS,
  CONFIG,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, formatDateByUser, recordAccessLog } from '@/lib/utils';
import { useAuth } from './AuthContext';
import { useBasicData } from '@/hooks/useBasicData';

interface User {
  id: string;
  username: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  role_name: string;
  role_id?: string;
  status?: string;
  permissions?: string[];
  merchants?: Array<{ id: string; name: string }>;
}

const UserList: React.FC = () => {
  const { user } = useAuth();
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('username');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Refresh button
  const handleRefresh = () => setRefreshKey(k => k + 1);

  // Add User button
  const handleAdd = () => {
    setEditingUser(null);
    setEditModalOpen(true);
  };

  // Edit button
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  // Delete button
  const handleDelete = (user: User) => {
    setDeletingUser(user);
    setDeleteModalOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deletingUser) return;
    const startTime = Date.now();
    let res: Response | null = null;
    setIsDeleting(true);
    try {
      res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.USERS}/${deletingUser.id}`,
        {
          method: 'DELETE',
        }
      );
      if (res && res.ok) {
        ToastNotify.success('User deleted successfully');
        handleRefresh();
      } else {
        const err = await res
          ?.json()
          .catch(() => ({ message: 'Failed to delete user' }));
        let msg = '';
        if (Array.isArray(err.message)) {
          msg = err.message.join('; ');
        } else {
          msg = err.message || 'Failed to delete user';
        }
        ToastNotify.error(msg);
      }
    } catch (error: any) {
      ToastNotify.error(error?.message || 'Failed to delete user');
    } finally {
      await recordAccessLog({
        path: '/users',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({
          name: deletingUser.username,
          id: deletingUser.id,
        }),
        response: JSON.stringify(res),
        duration_ms: Date.now() - startTime,
      });
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setDeletingUser(null);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.USERS}`
        );
        if (!res) throw new Error('No response');
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: 'Failed to fetch users' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${res.status}`
          );
        }
        const data = await res.json();
        setUsers(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users');
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [refreshKey]);

  // columns config
  const columns: ListColumn<User>[] = [
    { key: 'username', title: 'Name' },
    { key: 'role_name', title: 'Role' },
    { key: 'email', title: 'Email' },
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
            textColor = 'text-green-700 dark:text-green-500';
            break;
          case ACTIVE_STATUS.INACTIVE:
            bgColor = 'bg-gray-100 dark:bg-gray-700 dark:bg-opacity-25';
            textColor = 'text-gray-700 dark:text-gray-300';
            break;
          default:
            bgColor = 'bg-gray-100 dark:bg-gray-700 dark:bg-opacity-25';
            textColor = 'text-gray-700 dark:text-gray-400';
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
      key: 'created_at',
      title: 'Created At',
      render: v => formatDateByUser(v, user?.metadata?.data_time_format),
    },
    {
      key: 'updated_at',
      title: 'Updated At',
      render: v => formatDateByUser(v, user?.metadata?.data_time_format),
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'center',
      render: (v, row) => (
        <>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition-colors"
            title="Edit User"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
            title="Delete User"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </>
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

  // Custom filter function: supports username, email, roles, status
  const userFilter = (item: User, search: string) => {
    const s = search.trim().toLowerCase();
    return (
      (item.username && item.username.toLowerCase().includes(s)) ||
      (item.email && item.email.toLowerCase().includes(s)) ||
      (item.role_name && item.role_name.toLowerCase().includes(s)) ||
      (item.status && item.status.toLowerCase().includes(s))
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={users}
        searchTerm={search}
        onSearchTermChange={setSearch}
        sortColumn={sortColumn}
        sortOrder={sortOrder as any}
        onSort={col => {
          if (sortColumn === col) {
            setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
          } else {
            setSortColumn(col);
            setSortOrder('ASC');
          }
          setCurrentPage(1);
        }}
        itemsPerPage={10}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isLoading={isLoading}
        error={error}
        addButton={{ label: 'Add User', onClick: handleAdd }}
        actions={actions}
        searchPlaceholder="Search by Name, Email, Role, Status..."
        filterFunction={userFilter as any}
        onRefresh={handleRefresh}
      />
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          handleRefresh();
        }}
        editData={editingUser}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingUser(null);
        }}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete user "${deletingUser?.username}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="bg-red-600 hover:bg-red-700 focus-visible:outline-red-500"
      />
    </>
  );
};

export default UserList;
