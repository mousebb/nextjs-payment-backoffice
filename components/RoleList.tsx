import React, { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import LocalPagingList from './LocalPagingList';
import ConfirmationModal from './ConfirmationModal';
import EditRoleModal from './EditRoleModal';
import { ListColumn, ActionDropdownItem } from '../types/list';
import ToastNotify from './ToastNotify';
import {
  CONFIG,
  ADMIN_PERMISSIONS,
  WEB_ACTION_METHODS,
  ACCESS_LOG_TYPE,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import { useAuth } from './AuthContext';
import { useBasicData } from '@/hooks/useBasicData';

interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
}

// 判断角色是否为admin
const isAdminRole = (role: any) => {
  if (!role.permissions) return false;
  // 兼容字符串数组和对象数组
  if (
    Array.isArray(role.permissions) &&
    typeof role.permissions[0] === 'object'
  ) {
    return role.permissions.some((p: any) => p.name === ADMIN_PERMISSIONS);
  }
  return role.permissions.includes(ADMIN_PERMISSIONS);
};

const RoleList: React.FC = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // Refresh button
  const handleRefresh = () => setRefreshKey(k => k + 1);

  // Add Role button
  const handleAdd = () => {
    setEditingRole(null);
    setEditModalOpen(true);
  };

  // Edit button
  const handleEdit = (role: Role) => {
    if (isAdminRole(role)) {
      ToastNotify.warn('Admin role cannot be edited');
      return;
    }
    setEditingRole(role);
    setEditModalOpen(true);
  };

  // Delete button
  const handleDelete = (role: Role) => {
    if (isAdminRole(role)) {
      ToastNotify.warn('Admin role cannot be deleted');
      return;
    }
    setDeletingRole(role);
    setDeleteModalOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deletingRole) return;
    const startTime = Date.now();
    let res: Response | null = null;
    setIsDeleting(true);
    try {
      res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.ROLES}/${deletingRole.id}`,
        {
          method: 'DELETE',
        }
      );
      if (res && res.ok) {
        ToastNotify.success('Role deleted successfully');
        handleRefresh();
      } else {
        const errorData = await res
          ?.json()
          .catch(() => ({ message: 'Failed to delete role' }));
        throw new Error(errorData.message || 'Failed to delete role');
      }
    } catch (error: any) {
      ToastNotify.error(error?.message || 'Failed to delete role');
    } finally {
      await recordAccessLog({
        path: '/roles',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({
          name: deletingRole.name,
          code: deletingRole.code,
          id: deletingRole.id,
        }),
        response: JSON.stringify(res),
        duration_ms: Date.now() - startTime,
      });
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setDeletingRole(null);
    }
  };

  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.ROLES}`
        );
        if (!res) throw new Error('No response');
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: 'Failed to fetch roles' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${res.status}`
          );
        }
        const data = await res.json();
        setRoles(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch roles');
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoles();
  }, [refreshKey]);

  // columns config
  const columns: ListColumn<Role>[] = [
    { key: 'name', title: 'Name' },
    { key: 'code', title: 'Code' },
    { key: 'description', title: 'Description' },
    {
      key: 'actions',
      title: 'Actions',
      align: 'center' as const,
      render: (v: any, row: Role) => {
        const admin = isAdminRole(row);

        return (
          <>
            <button
              onClick={() => handleEdit(row)}
              disabled={admin}
              className={`p-1.5 rounded-md transition-colors ${
                admin
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20'
              }`}
              title={admin ? 'Admin role cannot be edited' : 'Edit Role'}
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(row)}
              disabled={admin}
              className={`p-1.5 rounded-md transition-colors ${
                admin
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20'
              }`}
              title={admin ? 'Admin role cannot be deleted' : 'Delete Role'}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </>
        );
      },
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
    {
      label: 'Add Role',
      icon: <PencilSquareIcon className="h-4 w-4" />,
      onClick: handleAdd,
      disabled: isLoading,
    },
  ];

  // Custom filter function: supports name, code, description
  const roleFilter = (item: Role, search: string) => {
    const s = search.trim().toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(s)) ||
      (item.code && item.code.toLowerCase().includes(s)) ||
      (item.description && item.description.toLowerCase().includes(s))
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={roles}
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
        addButton={{ label: 'Add Role', onClick: handleAdd }}
        actions={actions}
        searchPlaceholder="Search by Name, Code, Description..."
        filterFunction={roleFilter as any}
        onRefresh={handleRefresh}
      />
      <EditRoleModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          handleRefresh();
        }}
        editData={editingRole}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingRole(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Role"
        message={`Are you sure you want to delete role "${deletingRole?.name}" (${deletingRole?.code})? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="bg-red-600 hover:bg-red-700 focus-visible:outline-red-500"
      />
    </>
  );
};

export default RoleList;
