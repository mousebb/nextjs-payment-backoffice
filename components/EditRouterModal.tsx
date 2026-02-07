import React, { useState, useEffect } from 'react';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelTextarea from './FloatingLabelTextarea';
import FloatingLabelCheckboxList from './FloatingLabelCheckboxList';
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
interface ApiRouter {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  banks: RouterBank[];
  created_at: string;
  updated_at: string;
}

interface RouterBank {
  bank_id: string;
  bank_name: string;
  priority: number;
}

interface ApiBank {
  id: string;
  gateway_id: string;
  gateway_name: string;
  router_name: string | null;
  name: string;
  metadata: any;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  methods: BankMethod[];
  currencies: string[];
}

interface BankMethod {
  method_id: string;
  name: string;
  code: string;
}

interface EditRouterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ApiRouter | null;
}

const EditRouterModal: React.FC<EditRouterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: true,
    banks: [] as string[],
  });
  const [banks, setBanks] = useState<ApiBank[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { user } = useAuth();
  useEffect(() => {
    if (isOpen) {
      fetchBanks();
      if (editData) {
        setFormData({
          name: editData.name,
          description: editData.description || '',
          enabled: editData.enabled,
          banks: editData.banks ? editData.banks.map(b => b.bank_id) : [],
        });
      } else {
        setFormData({
          name: '',
          description: '',
          enabled: true,
          banks: [],
        });
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  const fetchBanks = async () => {
    setIsLoading(true);
    try {
      const response = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.BANKS + '?enabled=true'
      );
      if (!response || !response.ok) {
        throw new Error('Failed to fetch banks');
      }
      const banksData: ApiBank[] = await response.json();
      setBanks(banksData || []);
    } catch (e) {
      console.error('Failed to fetch banks', e);
      ToastNotify.error('Failed to load banks data');
    } finally {
      setIsLoading(false);
    }
  };

  const validate = () => {
    const errs: any = {};
    if (!formData.name.trim()) errs.name = 'Router name is required';

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
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        enabled: formData.enabled,
        banks: formData.banks.map(bank_id => ({ bank_id })),
      };

      if (editData) {
        // Edit mode - PUT request
        res = await authFetch(
          `${CONFIG.API_BASE_URL + API_ROUTES.ROUTERS}/${editData.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          }
        );
      } else {
        // Add mode - POST request
        res = await authFetch(CONFIG.API_BASE_URL + API_ROUTES.ROUTERS, {
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
        path: `/routers`,
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
      description: '',
      enabled: true,
      banks: [],
    });
    setErrors({});
    onClose();
  };

  // 格式化银行显示名称
  const formatBankDisplayName = (bank: ApiBank) => {
    const baseName = bank.name;
    const gatewayName = bank.gateway_name;
    const routerName = bank.router_name;

    if (routerName) {
      return `${baseName} (GW: ${gatewayName}, RT: ${routerName})`;
    } else {
      return `${baseName} (GW: ${gatewayName})`;
    }
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
            {editData ? 'Edit Router' : 'Add Router'}
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
            id="name"
            name="name"
            label="Router Name *"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            error={errors.name}
            inputClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
            placeholder="e.g. Paypal Stripe debit"
          />

          <FloatingLabelTextarea
            id="description"
            name="description"
            label="Description"
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            error={errors.description}
            rows={2}
            placeholder="e.g. Qrcode, Bank Transfer, USD, EUR"
            textareaClassName="resize-none"
            labelClassName="bg-white dark:bg-gray-800"
          />

          <FloatingLabelCheckboxList
            label="Banks"
            options={banks.map(bank => ({
              id: bank.id,
              name: formatBankDisplayName(bank),
            }))}
            selectedValues={formData.banks}
            onChange={(value, checked) => {
              const newBanks = checked
                ? [...formData.banks, value]
                : formData.banks.filter(b => b !== value);
              handleChange('banks', newBanks);
            }}
            error={errors.banks}
            disabled={isLoading}
            maxHeight="h-40"
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

export default EditRouterModal;
