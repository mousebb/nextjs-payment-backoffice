import React, { useState, useEffect } from 'react';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  PAYMENT_STATUS,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import { getBasicData } from '@/lib/basic-data.service';
import ToastNotify from './ToastNotify';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from './AuthContext';

interface ApiGatewayStatusCode {
  id: string;
  gateway_id: string;
  gateway_name: string;
  gateway_status_code: string;
  internal_status_code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface EditGatewayStatusCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ApiGatewayStatusCode | null;
}

const EditGatewayStatusCodeModal: React.FC<EditGatewayStatusCodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const [formData, setFormData] = useState({
    gateway_id: '',
    gateway_status_code: '',
    internal_status_code: '',
    description: '',
  });
  const [gateways, setGateways] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { user } = useAuth();
  useEffect(() => {
    if (isOpen) {
      fetchGateways();
      if (editData) {
        setFormData({
          gateway_id: editData.gateway_id,
          gateway_status_code: editData.gateway_status_code,
          internal_status_code: editData.internal_status_code,
          description: editData.description || '',
        });
      } else {
        setFormData({
          gateway_id: '',
          gateway_status_code: '',
          internal_status_code: '',
          description: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  const fetchGateways = async () => {
    setIsLoading(true);
    try {
      const response = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.GATEWAYS
      );
      
      if (response && response.ok) {
        const gatewaysData = await response.json();
        setGateways(Array.isArray(gatewaysData) ? gatewaysData : []);
      } else {
        setGateways([]);
        console.error('Failed to fetch gateways');
      }
    } catch (e) {
      console.error('Failed to fetch gateways:', e);
      setGateways([]);
    } finally {
      setIsLoading(false);
    }
  };

  const validate = () => {
    const errs: any = {};
    if (!formData.gateway_id) errs.gateway_id = 'Gateway name is required';
    if (!formData.gateway_status_code.trim())
      errs.gateway_status_code = 'Gateway status code is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field: string, value: string) => {
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
        ...formData,
        gateway_status_code: formData.gateway_status_code.trim(),
      };

      if (editData) {
        // Edit mode - PUT request
        res = await authFetch(
          `${CONFIG.API_BASE_URL + API_ROUTES.GATEWAY_STATUS_CODES}/${editData.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          }
        );
      } else {
        // Add mode - POST request
        res = await authFetch(
          CONFIG.API_BASE_URL + API_ROUTES.GATEWAY_STATUS_CODES,
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
        path: `/gateways-status-codes`,
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
      gateway_id: '',
      gateway_status_code: '',
      internal_status_code: '',
      description: '',
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
            {editData ? 'Edit Gateway Status Code' : 'Add Gateway Status Code'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FloatingLabelSelect
            id="gateway_id"
            name="gateway_id"
            label="Gateway Name *"
            value={formData.gateway_id}
            onChange={e => handleChange('gateway_id', e.target.value)}
            error={errors.gateway_id}
            disabled={isLoading || !!editData}
            disabledValue={editData?.gateway_name}
          >
            <option value="">Select Gateway</option>
            {gateways.map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </FloatingLabelSelect>
          <FloatingLabelInput
            id="gateway_status_code"
            name="gateway_status_code"
            label="Gateway Status Code *"
            value={formData.gateway_status_code}
            onChange={e => handleChange('gateway_status_code', e.target.value)}
            error={errors.gateway_status_code}
            inputClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
          />
          <FloatingLabelSelect
            id="internal_status_code"
            name="internal_status_code"
            label="Internal Status Code"
            value={formData.internal_status_code}
            onChange={e => handleChange('internal_status_code', e.target.value)}
            error={errors.internal_status_code}
          >
            <option value="">Select Status</option>
            {Object.values(PAYMENT_STATUS).map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </FloatingLabelSelect>
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

export default EditGatewayStatusCodeModal;
