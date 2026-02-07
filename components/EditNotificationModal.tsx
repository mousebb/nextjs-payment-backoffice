import React, { useState, useEffect } from 'react';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelTextarea from './FloatingLabelTextarea';
import CommonSelect from './CommonSelect';
import ToastNotify from './ToastNotify';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import { XMarkIcon } from '@heroicons/react/24/outline';
import FloatingLabelSelect from './FloatingLabelSelect';
import FloatingLabelDateTimePicker from './FloatingLabelDateTimePicker';
import { useAuth } from './AuthContext';
import { formatDateByUser } from '@/lib/utils';
import FloatingLabelCheckboxList from './FloatingLabelCheckboxList';

export interface NotificationFormData {
  title: string;
  type: string;
  content: string;
  is_broadcast: boolean;
  expires_at: string;
  metadata: string;
  user_ids: string[]; // add user_ids field
}

export interface EditNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: NotificationFormData | null;
}

const NOTIFICATION_TYPES = [
  { id: 'warning', name: 'Warning' },
  { id: 'info', name: 'Info' },
  { id: 'system', name: 'System' },
  { id: 'personal', name: 'Personal' },
];

const EditNotificationModal: React.FC<EditNotificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    type: '',
    content: '',
    is_broadcast: false,
    expires_at: '',
    metadata: '',
    user_ids: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { user } = useAuth();
  const [userOptions, setUserOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({ ...editData, user_ids: editData.user_ids || [] });
      } else {
        setFormData({
          title: '',
          type: '',
          content: '',
          is_broadcast: false,
          expires_at: '',
          metadata: '',
          user_ids: [],
        });
      }
      setErrors({});
      // fetch user list
      setLoadingUsers(true);
      authFetch(CONFIG.API_BASE_URL + API_ROUTES.USERS)
        .then(async res => {
          if (!res || !res.ok) return setUserOptions([]);
          const data = await res.json();
          setUserOptions(
            Array.isArray(data)
              ? data.map((u: any) => ({ id: u.id, name: u.username }))
              : []
          );
        })
        .catch(() => setUserOptions([]))
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen, editData]);

  // 清空 users 选中逻辑
  useEffect(() => {
    if (formData.is_broadcast && formData.user_ids.length > 0) {
      setFormData(prev => ({ ...prev, user_ids: [] }));
    }
  }, [formData.is_broadcast]);

  const validate = () => {
    const errs: any = {};
    if (!formData.title.trim()) errs.title = 'Title is required';
    if (!formData.type) errs.type = 'Type is required';
    if (!formData.content.trim()) errs.content = 'Content is required';
    if (!formData.is_broadcast && formData.user_ids.length === 0)
      errs.user_ids = 'Users are required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field])
      setErrors((prev: any) => ({ ...prev, [field]: undefined }));
  };

  const handleUserCheckbox = (userId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      user_ids: checked
        ? [...prev.user_ids, userId]
        : prev.user_ids.filter(id => id !== userId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    let res: Response | null = null;
    const startTime = Date.now();
    const submissionData = {
      ...formData,
      expires_at: formData.expires_at,
      metadata: formData.metadata,
      user_ids: formData.is_broadcast ? [] : formData.user_ids,
    };
    try {
      if (editData) {
        // Edit mode - PUT request (假设有 id 字段)
        res = await authFetch(
          `${CONFIG.API_BASE_URL + API_ROUTES.NOTIFICATIONS}/${(editData as any).id || ''}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          }
        );
      } else {
        // Add mode - POST request
        res = await authFetch(CONFIG.API_BASE_URL + API_ROUTES.NOTIFICATIONS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData),
        });
      }
      if (res && res.ok) {
        ToastNotify.success(
          editData ? 'Updated successfully' : 'Sent successfully'
        );
        handleClose();
        onSuccess();
      } else {
        const err = await res?.json().catch(() => ({}));
        ToastNotify.error(
          err.message || (editData ? 'Failed to update' : 'Failed to send')
        );
      }
    } catch (e: any) {
      ToastNotify.error(
        e.message || (editData ? 'Failed to update' : 'Failed to send')
      );
    } finally {
      await recordAccessLog({
        path: `/notifications`,
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
      title: '',
      type: '',
      content: '',
      is_broadcast: false,
      expires_at: '',
      metadata: '',
      user_ids: [],
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 transform transition-all overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {editData ? 'Edit Notification' : 'Send Notification'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FloatingLabelInput
            id="title"
            name="title"
            label="Title *"
            value={formData.title}
            onChange={e => handleChange('title', e.target.value)}
            error={errors.title}
            inputClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
          />
          <FloatingLabelSelect
            id="type"
            name="type"
            label="Type *"
            value={formData.type}
            onChange={e => handleChange('type', e.target.value)}
            error={errors.type}
          >
            <option value="">Select Type</option>
            {NOTIFICATION_TYPES.map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </FloatingLabelSelect>
          {/* Broadcast switch below type */}
          <div className="flex items-center justify-between mt-2 mb-2">
            <label className="pl-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Broadcast
            </label>
            <button
              type="button"
              onClick={() =>
                handleChange('is_broadcast', !formData.is_broadcast)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_broadcast ? 'bg-sky-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_broadcast ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
          {/* Users checkbox list below broadcast */}
          <FloatingLabelCheckboxList
            label="Users"
            options={userOptions}
            selectedValues={formData.user_ids}
            onChange={handleUserCheckbox}
            disabled={formData.is_broadcast}
            loading={loadingUsers}
            emptyMessage="No users available"
            maxHeight="h-24"
            error={errors.user_ids}
          />
          <FloatingLabelTextarea
            id="content"
            name="content"
            label="Content *"
            value={formData.content}
            onChange={e => handleChange('content', e.target.value)}
            error={errors.content}
            textareaClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
          />
          <FloatingLabelTextarea
            id="metadata"
            name="metadata"
            label="Metadata (optional)"
            value={formData.metadata}
            onChange={e => handleChange('metadata', e.target.value)}
            textareaClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
          />
          <FloatingLabelDateTimePicker
            id="expires_at"
            name="expires_at"
            label="Expires At"
            value={formData.expires_at}
            onChange={v => handleChange('expires_at', v || '')}
            error={errors.expires_at}
            placeholder={
              user?.metadata?.data_time_format
                ? user.metadata.data_time_format
                : 'yyyy/MM/dd HH:mm'
            }
            dateFormat={user?.metadata?.data_time_format || 'yyyy/MM/dd HH:mm'}
            // 可选：显示格式化后的值
            // value={formData.expires_at ? formatDateByUser(formData.expires_at, user?.metadata?.data_time_format) : ''}
          />
          <div id="modal-content" className="relative z-60"></div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : editData ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNotificationModal;
