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
interface ApiStatusCode {
  id: string;
  code: string;
  description: string;
  is_final: boolean;
  created_at: string;
  updated_at: string;
}

interface EditStatusCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ApiStatusCode | null;
}

const EditStatusCodeModal: React.FC<EditStatusCodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    is_final: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { user } = useAuth();
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({
          code: editData.code,
          description: editData.description,
          is_final: editData.is_final,
        });
      } else {
        setFormData({
          code: '',
          description: '',
          is_final: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  const validate = () => {
    const errs: any = {};
    if (!formData.code.trim()) errs.code = 'Status code is required';

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
        code: formData.code.trim(),
        description: formData.description.trim(),
        is_final: formData.is_final,
      };

      if (editData) {
        // Edit mode - PUT request
        res = await authFetch(
          `${CONFIG.API_BASE_URL + API_ROUTES.STATUS_CODES}/${editData.code}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          }
        );
      } else {
        // Add mode - POST request
        res = await authFetch(CONFIG.API_BASE_URL + API_ROUTES.STATUS_CODES, {
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
        path: `/status-codes`,
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
      code: '',
      description: '',
      is_final: true,
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
            {editData ? 'Edit Status Code' : 'Add Status Code'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
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
              Editing status code may affect system logic. Please ensure you are
              fully aware of the impact before proceeding.
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FloatingLabelInput
            id="code"
            name="code"
            label="Status Code *"
            value={formData.code}
            onChange={e => handleChange('code', e.target.value)}
            error={errors.code}
            inputClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
          />

          <FloatingLabelInput
            id="description"
            name="description"
            label="Description"
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            error={errors.description}
            inputClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
          />

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Is Final
            </label>
            <button
              type="button"
              onClick={() => handleChange('is_final', !formData.is_final)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.is_final
                  ? 'bg-sky-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.is_final ? 'translate-x-6' : 'translate-x-1'
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

export default EditStatusCodeModal;
