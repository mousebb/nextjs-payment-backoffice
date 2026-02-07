import React, { useState, useEffect } from 'react';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import FloatingLabelCheckboxList from './FloatingLabelCheckboxList';
import FloatingLabelTextarea from './FloatingLabelTextarea';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import { getBasicData } from '@/lib/basic-data.service';
import ToastNotify from './ToastNotify';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from './AuthContext';

interface ApiUser {
  id: string;
  username: string;
  email?: string;
  role_id?: string;
  role_name: string;
  status?: string;
  permissions?: string[];
  merchants?: Array<{ id: string; name: string }>;
  created_at?: string;
  updated_at?: string;
  metadata?: string;
  is_2fa_enabled?: boolean;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ApiUser | null;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role_id: '',
    status: 'active',
    merchant_ids: [] as string[],
    metadata: '',
    is_2fa_enabled: false,
  });
  const [roles, setRoles] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { user } = useAuth();
  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
      if (editData) {
        setFormData({
          username: editData.username,
          password: '', // Don't populate password for edit
          email: editData.email || '',
          role_id: editData.role_id || '',
          status: editData.status || 'active',
          merchant_ids: editData.merchants
            ? editData.merchants.map(m => m.id)
            : [],
          metadata: editData.metadata
            ? JSON.stringify(editData.metadata, null, 2)
            : '',
          is_2fa_enabled: editData.is_2fa_enabled || false,
        });
      } else {
        setFormData({
          username: '',
          password: '',
          email: '',
          role_id: '',
          status: 'active',
          merchant_ids: [],
          metadata: '',
          is_2fa_enabled: false,
        });
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  const fetchDropdownData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, merchantsRes] = await Promise.all([
        getBasicData('roles', CONFIG.API_BASE_URL + API_ROUTES.ROLES),
        // 直接调用 API 而不使用缓存
        authFetch(CONFIG.API_BASE_URL + API_ROUTES.MERCHANTS_ACCESSIBLE).then(
          async response => {
            if (response && response.ok) {
              const data = await response.json();
              return Array.isArray(data) ? data : [];
            }
            return [];
          }
        ),
      ]);

      setRoles(rolesRes || []);
      setMerchants(merchantsRes || []);
    } catch (e) {
      console.error('Failed to fetch dropdown data', e);
      ToastNotify.error('Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  };

  const validate = () => {
    const errs: any = {};
    if (!formData.username.trim()) errs.username = 'Username is required';
    if (!editData && !formData.password.trim())
      errs.password = 'Password is required';
    if (!formData.role_id) errs.role_id = 'Role is required';

    // Email validation
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Please enter a valid email address';
      }
    }

    // Metadata JSON 校验
    if (formData.metadata.trim()) {
      try {
        JSON.parse(formData.metadata);
      } catch {
        errs.metadata = 'Metadata must be valid JSON';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field])
      setErrors((prev: any) => ({ ...prev, [field]: undefined }));

    // Clear merchants when role changes to non-merchant role
    if (
      field === 'role_id' &&
      value &&
      !isMerchantRole(value) &&
      !isAgentRole(value)
    ) {
      setFormData(prev => ({ ...prev, merchant_ids: [] }));
    }
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
        username: formData.username.trim(),
        role_id: formData.role_id,
        status: formData.status,
        merchants: formData.merchant_ids.map(id => ({ id })),
        metadata: formData.metadata.trim()
          ? JSON.parse(formData.metadata)
          : undefined,
        is_2fa_enabled: formData.is_2fa_enabled,
        ...(formData.is_2fa_enabled === false
          ? { two_factor_secret: null }
          : {}),
      };

      // 只有在添加模式下或编辑模式下密码不为空时才提交密码
      if (!editData || (editData && formData.password.trim())) {
        submissionData.password = formData.password.trim();
      }

      // 只有当 email 不为空时才提交
      if (formData.email.trim()) {
        submissionData.email = formData.email.trim();
      }

      if (editData) {
        // Edit mode - PUT request
        res = await authFetch(
          `${CONFIG.API_BASE_URL + API_ROUTES.USERS}/${editData.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          }
        );
      } else {
        // Add mode - POST request
        res = await authFetch(CONFIG.API_BASE_URL + API_ROUTES.USERS, {
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
        let msg = '';
        if (Array.isArray(err.message)) {
          msg = err.message.join('; ');
        } else {
          msg =
            err.message || (editData ? 'Failed to update' : 'Failed to add');
        }
        ToastNotify.error(msg);
      }
    } catch (e: any) {
      ToastNotify.error(
        e.message || (editData ? 'Failed to update' : 'Failed to add')
      );
    } finally {
      await recordAccessLog({
        path: `/users`,
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
      username: '',
      password: '',
      email: '',
      role_id: '',
      status: 'active',
      merchant_ids: [],
      metadata: '',
      is_2fa_enabled: false,
    });
    setErrors({});
    onClose();
  };

  // Check if selected role allows merchant selection
  const isMerchantRole = (roleId: string) => {
    const selectedRole = roles.find(role => role.id === roleId);
    return selectedRole?.code === 'merchant';
  };

  const isAgentRole = (roleId: string) => {
    const selectedRole = roles.find(role => role.id === roleId);
    return selectedRole?.code === 'agent';
  };

  // Check if merchants checkbox list should be enabled
  const shouldEnableMerchants = () => {
    return (
      formData.role_id &&
      (isMerchantRole(formData.role_id) || isAgentRole(formData.role_id))
    );
  };

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 transform transition-all overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {editData ? 'Edit User' : 'Add User'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelInput
              id="username"
              name="username"
              label="Username *"
              value={formData.username}
              onChange={e => handleChange('username', e.target.value)}
              error={errors.username}
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
              autoComplete="nope"
            />

            <FloatingLabelInput
              id="password"
              name="password"
              type="password"
              label="Password *"
              value={formData.password}
              onChange={e => handleChange('password', e.target.value)}
              error={errors.password}
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
              autoComplete="new-password"
              alwaysFloatLabel={editData ? true : false}
              placeholder={editData ? '(leave blank to keep unchanged)' : ''}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelInput
              id="email"
              name="email"
              type="email"
              label="Email"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              error={errors.email}
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
            />
            <FloatingLabelSelect
              id="role_id"
              name="role_id"
              label="Role *"
              value={formData.role_id}
              onChange={e => handleChange('role_id', e.target.value)}
              error={errors.role_id}
              disabled={isLoading}
            >
              <option value="">Select Role</option>
              {roles.map((role: any) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </FloatingLabelSelect>
          </div>

          {shouldEnableMerchants() ? (
            <FloatingLabelCheckboxList
              label="	Associated merchants"
              options={merchants}
              renderOptionLabel={option => {
                // 简化的处理逻辑
                const usernames = Array.isArray(option.usernames)
                  ? option.usernames
                  : [];
                const validUsernames = usernames.filter(
                  username =>
                    username &&
                    typeof username === 'string' &&
                    username.trim() !== ''
                );

                return (
                  <React.Fragment key={`${option.id}-label`}>
                    {option.name}
                    {validUsernames.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {' '}
                        ({validUsernames.join(', ')})
                      </span>
                    )}
                  </React.Fragment>
                );
              }}
              selectedValues={formData.merchant_ids}
              onChange={(value, checked) => {
                const newMerchantIds = checked
                  ? [...formData.merchant_ids, value]
                  : formData.merchant_ids.filter(id => id !== value);
                handleChange('merchant_ids', newMerchantIds);
              }}
              error={errors.merchant_ids}
              disabled={isLoading}
              maxHeight="h-32"
              labelClassName="bg-white dark:bg-gray-800"
            />
          ) : formData.role_id ? (
            // <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            //   Merchant selection is only available for merchant roles.
            // </div>
            <></>
          ) : null}

          <FloatingLabelTextarea
            id="metadata"
            name="metadata"
            label="Metadata (JSON)"
            value={formData.metadata}
            onChange={e => handleChange('metadata', e.target.value)}
            error={errors.metadata}
            rows={3}
            textareaClassName="resize-none"
            labelClassName="bg-white dark:bg-gray-800"
            placeholder='{ "data_time_format": "YYYY-MM-DD HH:mm:ss" }'
          />

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">
              Two-Factor Authentication
            </label>
            <button
              type="button"
              onClick={() => {
                // 只能禁用 2FA，不能启用
                if (formData.is_2fa_enabled) {
                  handleChange('is_2fa_enabled', false);
                }
              }}
              disabled={!formData.is_2fa_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.is_2fa_enabled
                  ? 'bg-sky-600 cursor-pointer'
                  : 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.is_2fa_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">
              Status
            </label>
            <button
              type="button"
              onClick={() =>
                handleChange(
                  'status',
                  formData.status === 'active' ? 'inactive' : 'active'
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.status === 'active'
                  ? 'bg-sky-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.status === 'active'
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
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
              disabled={isSubmitting || isLoading}
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

export default EditUserModal;
