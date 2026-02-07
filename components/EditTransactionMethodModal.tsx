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
import FloatingLabelSelect from './FloatingLabelSelect';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthContext';
interface TransactionMethodFormData {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string;
  enabled: boolean;
}

interface EditTransactionMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: TransactionMethodFormData | null;
}

const EditTransactionMethodModal: React.FC<EditTransactionMethodModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const isEditMode = !!editData;
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    description: '',
    enabled: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const t = useTranslations();
  const transactionTypeOptions = [
    { value: 'payment', label: t('TransactionType.payment') },
    { value: 'withdrawal', label: t('TransactionType.withdrawal') },
    { value: 'refund', label: t('TransactionType.refund') },
  ];
  const { user } = useAuth();
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({
          code: editData.code,
          name: editData.name,
          type: editData.type,
          description: editData.description || '',
          enabled: editData.enabled,
        });
      } else {
        setFormData({
          code: '',
          name: '',
          type: '',
          description: '',
          enabled: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  const validate = () => {
    const errs: any = {};
    if (!formData.code.trim()) errs.code = 'Code is required';
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (!formData.type) errs.type = 'Type is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field: keyof TransactionMethodFormData, value: any) => {
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
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim() || null,
        enabled: formData.enabled,
      };
      if (isEditMode && editData) {
        // Edit mode - PUT request
        res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.TRANSACTION_METHODS}/${editData.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          }
        );
      } else {
        // Add mode - POST request
        res = await authFetch(
          CONFIG.API_BASE_URL + API_ROUTES.TRANSACTION_METHODS,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          }
        );
      }
      if (res && res.ok) {
        ToastNotify.success(
          isEditMode ? 'Updated successfully' : 'Added successfully'
        );
        handleClose();
        onSuccess();
      } else {
        const err = await res?.json().catch(() => ({}));
        ToastNotify.error(
          err.message || (isEditMode ? 'Failed to update' : 'Failed to add')
        );
      }
    } catch (e: any) {
      ToastNotify.error(
        e.message || (isEditMode ? 'Failed to update' : 'Failed to add')
      );
    } finally {
      await recordAccessLog({
        path: `/transaction-methods`,
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
      name: '',
      type: '',
      description: '',
      enabled: true,
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
            {isEditMode ? 'Edit Transaction Method' : 'Add Transaction Method'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        {isEditMode && (
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
                Editing <b>code</b> may affect users. Please ensure you are
                fully aware of the impact before proceeding.
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FloatingLabelInput
            id="code"
            name="code"
            label="Code *"
            value={formData.code}
            onChange={e => handleChange('code', e.target.value)}
            error={errors.code}
            inputClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
          />
          <FloatingLabelInput
            id="name"
            name="name"
            label="Name *"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            error={errors.name}
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
            {transactionTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FloatingLabelSelect>
          <FloatingLabelTextarea
            id="description"
            name="description"
            label="Description"
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            error={errors.description}
            rows={2}
            placeholder="e.g. QRcode, Bank Transfer, USD, EUR"
            textareaClassName="resize-none"
            labelClassName="bg-white dark:bg-gray-800"
          />
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enabled
            </label>
            <button
              type="button"
              onClick={() => handleChange('enabled', !formData.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.enabled ? 'bg-sky-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.enabled ? 'translate-x-6' : 'translate-x-1'
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
                ? isEditMode
                  ? 'Updating...'
                  : 'Saving...'
                : isEditMode
                  ? 'Update'
                  : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTransactionMethodModal;
