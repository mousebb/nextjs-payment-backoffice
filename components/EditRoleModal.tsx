import React, { useState, useEffect } from 'react';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelTextarea from './FloatingLabelTextarea';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import ToastNotify from './ToastNotify';
import { XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import CustomCheckbox from './CustomCheckbox';
import { useAuth } from './AuthContext';

interface PermissionAction {
  id: string;
  action: string;
}
interface PermissionGroup {
  resource: string;
  actions: PermissionAction[];
}

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: {
    id: string;
    name: string;
    code: string;
    description: string;
    permissions?: string[];
  } | null;
}

const EditRoleModal: React.FC<EditRoleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    selectedPermissions: [] as string[],
  });
  const [permissionsGrouped, setPermissionsGrouped] = useState<
    PermissionGroup[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [roleDetail, setRoleDetail] = useState<any>(null);
  const [errors, setErrors] = useState<any>({});
  const [resourceFilter, setResourceFilter] = useState('');
  const { user } = useAuth();
  const fetchPermissionsGrouped = async () => {
    try {
      const res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.PERMISSIONS_GROUPED
      );
      if (!res || !res.ok) throw new Error('Failed to fetch permissions');
      const data = await res.json();
      setPermissionsGrouped(data || []);
    } catch (e) {
      ToastNotify.error('Failed to load permissions');
    }
  };

  const fetchRoleDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.ROLES}/${id}`
      );
      if (!res || !res.ok) throw new Error('Failed to fetch role detail');
      const data = await res.json();
      setRoleDetail(data);
      setFormData({
        name: data.name || '',
        code: data.code || '',
        description: data.description || '',
        selectedPermissions: Array.isArray(data.permissions)
          ? data.permissions.map((p: any) => (typeof p === 'string' ? p : p.id))
          : [],
      });
    } catch (e) {
      ToastNotify.error('Failed to load role detail');
      setFormData({
        name: '',
        code: '',
        description: '',
        selectedPermissions: [],
      });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      fetchPermissionsGrouped();
      if (editData && editData.id) {
        fetchRoleDetail(editData.id);
      } else {
        setRoleDetail(null);
        setFormData({
          name: '',
          code: '',
          description: '',
          selectedPermissions: [],
        });
      }
    }
  }, [isOpen, editData]);

  const validate = () => {
    const errs: any = {};
    if (!formData.name.trim()) errs.name = 'Role name is required';
    if (!formData.code.trim()) errs.code = 'Role code is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field])
      setErrors((prev: any) => ({ ...prev, [field]: undefined }));
  };

  const handlePermissionChange = (permId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedPermissions: checked
        ? [...prev.selectedPermissions, permId]
        : prev.selectedPermissions.filter(id => id !== permId),
    }));
  };

  // 收集所有唯一action类型，排序（如 view, edit, create, ...）
  const allActions = Array.from(
    new Set(permissionsGrouped.flatMap(g => g.actions.map(a => a.action)))
  );

  const filteredGroups = permissionsGrouped.filter(group =>
    group.resource.toLowerCase().includes(resourceFilter.trim().toLowerCase())
  );

  // 判断某action列是否全选（只针对过滤后）
  const isActionAllChecked = (action: string) => {
    const allIds = filteredGroups.flatMap(g =>
      g.actions.filter(a => a.action === action).map(a => a.id)
    );
    return (
      allIds.length > 0 &&
      allIds.every(id => formData.selectedPermissions.includes(id))
    );
  };

  const isActionIndeterminate = (action: string) => {
    const allIds = filteredGroups.flatMap(g =>
      g.actions.filter(a => a.action === action).map(a => a.id)
    );

    const selectedCount = allIds.filter(id =>
      formData.selectedPermissions.includes(id)
    ).length;

    return selectedCount > 0 && selectedCount < allIds.length;
  };

  // 切换某action列全选（只针对过滤后）
  const handleActionAllChange = (action: string, checked: boolean) => {
    const allIds = filteredGroups.flatMap(g =>
      g.actions.filter(a => a.action === action).map(a => a.id)
    );
    setFormData(prev => ({
      ...prev,
      selectedPermissions: checked
        ? Array.from(new Set([...prev.selectedPermissions, ...allIds]))
        : prev.selectedPermissions.filter(id => !allIds.includes(id)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    const startTime = Date.now();
    let res: Response | null = null;
    let submissionData: any = {};
    try {
      submissionData = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
        permissions: formData.selectedPermissions,
      };
      if (editData) {
        // Edit mode - PUT
        res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.ROLES}/${editData.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          }
        );
      } else {
        // Add mode - POST
        res = await authFetch(`${CONFIG.API_BASE_URL}${API_ROUTES.ROLES}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData),
        });
      }
      if (res && res.ok) {
        ToastNotify.success(
          editData ? 'Updated successfully' : 'Added successfully'
        );
        handleClose();
        onSuccess();
      } else {
        const err = await res?.json().catch(() => ({}));
        ToastNotify.error(
          err.message || (editData ? 'Failed to update' : 'Failed to add')
        );
      }
    } catch (e: any) {
      ToastNotify.error(
        e.message || (editData ? 'Failed to update' : 'Failed to add')
      );
    } finally {
      await recordAccessLog({
        path: `/roles`,
        type: ACCESS_LOG_TYPE.WEB,
        method: editData
          ? WEB_ACTION_METHODS.UPDATE
          : WEB_ACTION_METHODS.CREATE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify(submissionData),
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      selectedPermissions: [],
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 transform transition-all overflow-hidden max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {editData ? 'Edit Role' : 'Add Role'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto max-h-[80vh]"
        >
          <FloatingLabelInput
            id="name"
            name="name"
            label="Role Name *"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            error={errors.name}
            inputClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
            disabled={isLoadingDetail}
          />
          <FloatingLabelInput
            id="code"
            name="code"
            label="Role Code *"
            value={formData.code}
            onChange={e => handleChange('code', e.target.value)}
            error={errors.code}
            inputClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
            disabled={isLoadingDetail}
            placeholder="e.g. admin, user, manager"
          />
          <FloatingLabelTextarea
            id="description"
            name="description"
            label="Description"
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            error={errors.description}
            rows={2}
            placeholder="Role description (optional)"
            textareaClassName="resize-none"
            labelClassName="bg-white dark:bg-gray-800"
            disabled={isLoadingDetail}
          />

          {/* 权限分组多选列表 */}
          <div className="overflow-x-auto scrollbar rounded-lg">
            <div className="max-h-64 overflow-y-auto">
              {isLoadingDetail ? (
                <div className="py-8 text-center text-gray-400">
                  Loading role details...
                </div>
              ) : (
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <tr>
                      <th className="w-1/3 pl-2 text-left bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs leading-normal">
                        <div className="relative">
                          <input
                            type="text"
                            value={resourceFilter}
                            onChange={e => setResourceFilter(e.target.value)}
                            placeholder="Search Resource..."
                            className="w-full px-2 py-1 pr-7 rounded bg-gray-10 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-sky-400"
                          />
                          {resourceFilter && (
                            <button
                              type="button"
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                              onClick={() => setResourceFilter('')}
                              tabIndex={-1}
                              aria-label="Clear search"
                            >
                              <XCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </th>
                      {allActions.map(action => (
                        <th
                          key={action}
                          className="w-1/6 text-center bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400 uppercase text-xs"
                        >
                          <div className="flex flex-col items-center my-1.5">
                            <span className="mb-1">
                              {action.charAt(0).toUpperCase() + action.slice(1)}
                            </span>
                            {/* <input
                              type="checkbox"
                              className="appearance-none bg-gray-50 checked:bg-sky-500 checked:border-transparent border border-gray-400 h-4 w-4 rounded mb-2"
                              checked={isActionAllChecked(action)}
                              onChange={e => handleActionAllChange(action, e.target.checked)}
                            /> */}
                            <CustomCheckbox
                              isRound={false}
                              checked={isActionAllChecked(action)}
                              indeterminate={isActionIndeterminate(action)}
                              onChange={() =>
                                handleActionAllChange(
                                  action,
                                  !isActionAllChecked(action)
                                )
                              }
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredGroups.map(group => (
                      <tr key={group.resource}>
                        <td
                          className="w-1/3 pl-3 text-gray-700 dark:text-gray-200 text-sm font-medium py-2 cursor-pointer"
                          onClick={() => {
                            const allIds = group.actions.map(a => a.id);
                            const allChecked = allIds.every(id =>
                              formData.selectedPermissions.includes(id)
                            );
                            setFormData(prev => ({
                              ...prev,
                              selectedPermissions: allChecked
                                ? prev.selectedPermissions.filter(
                                    id => !allIds.includes(id)
                                  )
                                : Array.from(
                                    new Set([
                                      ...prev.selectedPermissions,
                                      ...allIds,
                                    ])
                                  ),
                            }));
                          }}
                          title="Click to select/deselect all permissions in this row"
                        >
                          {group.resource
                            .replace(/\b\w/g, c => c.toUpperCase())
                            .replace(/_/g, ' ')}
                        </td>
                        {allActions.map(action => {
                          const found = group.actions.find(
                            a => a.action === action
                          );
                          return (
                            <td key={action} className="text-center py-2">
                              {found ? (
                                <label className="flex items-center justify-center gap-1.5 cursor-pointer select-none">
                                  {/* <input
                                    type="checkbox"
                                    className="appearance-none bg-gray-50 checked:bg-sky-300 checked:border-transparent border border-gray-400 h-4 w-4 rounded-full"
                                    checked={formData.selectedPermissions.includes(found.id)}
                                    onChange={e => handlePermissionChange(found.id, e.target.checked)}
                                  />  */}
                                  <CustomCheckbox
                                    checked={formData.selectedPermissions.includes(
                                      found.id
                                    )}
                                    onChange={() =>
                                      handlePermissionChange(
                                        found.id,
                                        !formData.selectedPermissions.includes(
                                          found.id
                                        )
                                      )
                                    }
                                  />
                                </label>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingDetail}
              className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? editData
                  ? 'Updating...'
                  : 'Saving...'
                : editData
                  ? 'Update'
                  : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRoleModal;
