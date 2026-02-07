import React, { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import LocalPagingList from './LocalPagingList';
import ConfirmationModal from './ConfirmationModal';
import EditPermissionModal from './EditPermissionModal';
import { ListColumn, ActionDropdownItem } from '../types/list';
import ToastNotify from './ToastNotify';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import { useAuth } from './AuthContext';
import { useBasicData } from '@/hooks/useBasicData';

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

const PermissionList: React.FC = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPermission, setDeletingPermission] =
    useState<Permission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null
  );
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // Refresh button
  const handleRefresh = () => setRefreshKey(k => k + 1);

  // Add Permission button
  const handleAdd = () => {
    setEditingPermission(null);
    setEditModalOpen(true);
  };

  // Edit button
  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setEditModalOpen(true);
  };

  // Delete button
  const handleDelete = (permission: Permission) => {
    setDeletingPermission(permission);
    setDeleteModalOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deletingPermission) return;
    const startTime = Date.now();
    let res: Response | null = null;
    setIsDeleting(true);
    try {
      res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.PERMISSIONS}/${deletingPermission.id}`,
        {
          method: 'DELETE',
        }
      );
      if (res && res.ok) {
        ToastNotify.success('Permission deleted successfully');
        handleRefresh();
      } else {
        const errorData = await res
          ?.json()
          .catch(() => ({ message: 'Failed to delete permission' }));
        throw new Error(errorData.message || 'Failed to delete permission');
      }
    } catch (error: any) {
      ToastNotify.error(error?.message || 'Failed to delete permission');
    } finally {
      await recordAccessLog({
        path: '/permissions',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({
          name: deletingPermission.name,
          id: deletingPermission.id,
        }),
        response: JSON.stringify(res),
        duration_ms: Date.now() - startTime,
      });
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setDeletingPermission(null);
    }
  };

  useEffect(() => {
    const fetchPermissions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.PERMISSIONS}`
        );
        if (!res) throw new Error('No response');
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: 'Failed to fetch permissions' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${res.status}`
          );
        }
        const data = await res.json();
        setPermissions(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch permissions');
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPermissions();
  }, [refreshKey]);

  // columns config
  const columns: ListColumn<Permission>[] = [
    { key: 'name', title: 'Name' },
    { key: 'resource', title: 'Resource' },
    { key: 'action', title: 'Action' },
    { key: 'description', title: 'Description' },
    {
      key: 'actions',
      title: 'Actions',
      align: 'center',
      sortable: false,
      render: (v, row) => (
        <>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 dark:text-gray-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition-colors"
            title="Edit Permission"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
            title="Delete Permission"
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
    {
      label: 'Add Permission',
      icon: <PencilSquareIcon className="h-4 w-4" />,
      onClick: handleAdd,
      disabled: isLoading,
    },
  ];

  // Custom filter function: supports name, resource, action, description
  const permissionFilter = (item: Permission, search: string) => {
    const s = search.trim().toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(s)) ||
      (item.resource && item.resource.toLowerCase().includes(s)) ||
      (item.action && item.action.toLowerCase().includes(s)) ||
      (item.description && item.description.toLowerCase().includes(s))
    );
  };

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={permissions}
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
        addButton={{ label: 'Add Permission', onClick: handleAdd }}
        actions={actions}
        searchPlaceholder="Search by Name, Resource, Action, Description..."
        filterFunction={permissionFilter as any}
        onRefresh={handleRefresh}
      />
      <EditPermissionModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          handleRefresh();
        }}
        editData={editingPermission}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingPermission(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Permission"
        message={`Are you sure you want to delete permission "${deletingPermission?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="bg-red-600 hover:bg-red-700 focus-visible:outline-red-500"
      />
    </>
  );
};

export default PermissionList;
