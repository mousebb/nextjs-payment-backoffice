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
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from './AuthContext';

interface EditPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: {
    id: string;
    name: string;
    resource: string;
    action: string;
    description: string;
  } | null;
}

const EditPermissionModal: React.FC<EditPermissionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const [formData, setFormData] = useState({
    resource: '',
    action: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { user } = useAuth();
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({
          resource: editData.resource || '',
          action: editData.action || '',
          description: editData.description || '',
        });
      } else {
        setFormData({ resource: '', action: '', description: '' });
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  const validate = () => {
    const errs: any = {};
    if (!formData.resource.trim()) errs.resource = 'Resource is required';
    if (!formData.action.trim()) errs.action = 'Action is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field])
      setErrors((prev: any) => ({ ...prev, [field]: undefined }));
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
        name: `${formData.resource.trim()}:${formData.action.trim()}`,
        resource: formData.resource.trim(),
        action: formData.action.trim(),
        description: formData.description.trim(),
      };

      if (editData) {
        // Edit mode - PUT
        res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.PERMISSIONS}/${editData.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          }
        );
      } else {
        // Add mode - POST
        res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.PERMISSIONS}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          }
        );
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
        path: `/permissions`,
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
    setFormData({ resource: '', action: '', description: '' });
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
            {editData ? 'Edit Permission' : 'Add Permission'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        {editData && (
          <div className="mx-6 mt-4 mb-0 flex items-start bg-yellow-50 border-l-4 border-yellow-400 rounded-md p-3">
            <div className="flex-shrink-0 pt-0.5">
              <svg
                className="h-6 w-6 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <div className="font-semibold text-yellow-800">Warning!</div>
              <div className="text-sm text-yellow-700 mt-0.5">
                By editing the permission resource & action, you might break the
                system permissions functionality. Please ensure you&apos;re
                absolutely certain before proceeding.
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {editData && (
            <FloatingLabelInput
              id="name"
              name="name"
              label="Permission Name"
              value={`${formData.resource.trim()}:${formData.action.trim()}`}
              onChange={() => {}}
              disabled
              inputClassName="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
              labelClassName="bg-white dark:bg-gray-800"
            />
          )}
          <FloatingLabelInput
            id="resource"
            name="resource"
            label="Resource *"
            value={formData.resource}
            onChange={e => handleChange('resource', e.target.value)}
            error={errors.resource}
            inputClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
          />
          <FloatingLabelInput
            id="action"
            name="action"
            label="Action *"
            value={formData.action}
            onChange={e => handleChange('action', e.target.value)}
            error={errors.action}
            inputClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
          />
          <FloatingLabelTextarea
            id="description"
            name="description"
            label="Description"
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            error={errors.description}
            rows={3}
            placeholder="Permission description (optional)"
            textareaClassName="resize-none"
            labelClassName="bg-white dark:bg-gray-800"
          />
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
              disabled={isSubmitting}
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

export default EditPermissionModal;
