'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import { getBasicData } from '@/lib/basic-data.service';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import FloatingLabelTextarea from './FloatingLabelTextarea';
import FloatingLabelCheckboxList from './FloatingLabelCheckboxList';
import ToastNotify from './ToastNotify';
import { GATEWAY_TYPE } from '../constants/config';
import { useAuth } from './AuthContext';

interface GatewayFormData {
  id?: string;
  name: string;
  type: string;
  object: string;
  account: string;
  secret: string;
  api: string;
  metadata: string;
  enabled: boolean;
  methods: string[];
  currencies: string[];
}

interface EditGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: GatewayFormData;
}

const EditGatewayModal: React.FC<EditGatewayModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const isEditMode = !!editData;
  const [formData, setFormData] = useState<GatewayFormData>({
    name: '',
    type: '',
    object: '',
    account: '',
    secret: '',
    api: '',
    metadata: '',
    enabled: true,
    methods: [],
    currencies: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<GatewayFormData>>({});
  const [methods, setMethods] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { user } = useAuth();
  // 重置表单
  const resetForm = () => {
    if (isEditMode && editData) {
      setFormData({
        name: editData.name,
        type: editData.type,
        object: editData.object,
        account: editData.account || '',
        secret: editData.secret || '',
        api: editData.api,
        metadata: editData.metadata
          ? typeof editData.metadata === 'string'
            ? editData.metadata
            : JSON.stringify(editData.metadata, null, 2)
          : '',
        enabled: editData.enabled,
        methods: editData.methods || [],
        currencies: editData.currencies || [],
      });
    } else {
      setFormData({
        name: '',
        type: '',
        object: '',
        account: '',
        secret: '',
        api: '',
        metadata: '',
        enabled: true,
        methods: [],
        currencies: [],
      });
    }
    setErrors({});
  };

  // 关闭对话框时重置表单
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 加载基础数据
  useEffect(() => {
    if (isOpen) {
      loadBasicData();
      resetForm();
    }
  }, [isOpen, isEditMode, editData]);

  const loadBasicData = async () => {
    setIsLoadingData(true);
    try {
      // 加载支付方式列表
      const [methodsData, currenciesData] = await Promise.all([
        getBasicData(
          'methods',
          CONFIG.API_BASE_URL + API_ROUTES.TRANSACTION_METHODS
        ),
        getBasicData('currencies', CONFIG.API_BASE_URL + API_ROUTES.CURRENCIES),
      ]);
      setMethods(methodsData || []);
      setCurrencies(currenciesData || []);
    } catch (error: any) {
      console.error('Error loading basic data:', error);
      ToastNotify.error('Failed to load basic data');
    } finally {
      setIsLoadingData(false);
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Partial<GatewayFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.type.trim()) {
      newErrors.type = 'Type is required';
    }

    if (!formData.object.trim()) {
      newErrors.object = 'Object is required';
    }

    if (!formData.api.trim()) {
      newErrors.api = 'API URL is required';
    } else if (!isValidUrl(formData.api)) {
      newErrors.api = 'Please enter a valid URL';
    }

    // 验证 metadata JSON 格式
    if (formData.metadata.trim() && !isValidJson(formData.metadata)) {
      newErrors.metadata = 'Please enter valid JSON format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // URL 验证
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // JSON 验证
  const isValidJson = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    const startTime = Date.now();
    let res: Response | null = null;
    let requestBody: any = {};
    try {
      requestBody = {
        name: formData.name.trim(),
        type: formData.type,
        object: formData.object.trim(),
        account: formData.account.trim() || null,
        secret: formData.secret.trim() || null,
        api: formData.api.trim(),
        metadata: formData.metadata.trim()
          ? JSON.parse(formData.metadata)
          : null,
        enabled: formData.enabled,
        methods: formData.methods.map(id => ({ id })),
        currencies: formData.currencies,
      };
      if (isEditMode && editData) {
        // 编辑模式 PUT
        res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.GATEWAYS}/${editData.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );
      } else {
        // 新增 POST
        res = await authFetch(`${CONFIG.API_BASE_URL}${API_ROUTES.GATEWAYS}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      }
      if (res && res.ok) {
        ToastNotify.success(
          isEditMode
            ? 'Gateway updated successfully'
            : 'Gateway created successfully'
        );
        handleClose();
        onSuccess();
      } else {
        const errorData = await res
          ?.json()
          .catch(() => ({
            message: isEditMode
              ? 'Failed to update gateway'
              : 'Failed to create gateway',
          }));
        throw new Error(
          errorData.message || `HTTP error! status: ${res?.status}`
        );
      }
    } catch (error: any) {
      ToastNotify.error(
        error?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} gateway`
      );
    } finally {
      await recordAccessLog({
        path: `/gateways`,
        type: ACCESS_LOG_TYPE.WEB,
        method: editData
          ? WEB_ACTION_METHODS.UPDATE
          : WEB_ACTION_METHODS.CREATE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify(requestBody),
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });
      setIsSubmitting(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (
    field: keyof GatewayFormData,
    value: string | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // 处理方法选择
  const handleMethodChange = (methodId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      methods: checked
        ? [...prev.methods, methodId]
        : prev.methods.filter(id => id !== methodId),
    }));
  };

  // 处理 currencies 多选
  const handleCurrencyChange = (currency: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      currencies: checked
        ? [...prev.currencies, currency]
        : prev.currencies.filter(c => c !== currency),
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 transform transition-all overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {isEditMode ? 'Edit Gateway' : 'Add Gateway'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Name */}
            <FloatingLabelInput
              id="name"
              name="name"
              label="Name *"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              error={errors.name}
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
            />

            {/* Type and Object in same row */}
            <div className="grid grid-cols-2 gap-4">
              <FloatingLabelSelect
                id="type"
                name="type"
                label="Type *"
                value={formData.type}
                onChange={e => handleInputChange('type', e.target.value)}
                error={errors.type}
                disabled={isLoadingData}
                selectClassName="bg-transparent"
                labelClassName="bg-white dark:bg-gray-800"
              >
                <option value="">Select Type</option>
                {Object.values(GATEWAY_TYPE).map(type => (
                  <option key={type} value={type}>
                    {type.toUpperCase()}
                  </option>
                ))}
              </FloatingLabelSelect>

              <FloatingLabelInput
                id="object"
                name="object"
                label="Object *"
                value={formData.object}
                onChange={e => handleInputChange('object', e.target.value)}
                error={errors.object}
                inputClassName="bg-transparent"
                labelClassName="bg-white dark:bg-gray-800"
              />
            </div>

            {/* Account and Secret in same row */}
            <div className="grid grid-cols-2 gap-4">
              <FloatingLabelInput
                id="account"
                name="account"
                label="Account"
                value={formData.account}
                onChange={e => handleInputChange('account', e.target.value)}
                error={errors.account}
                inputClassName="bg-transparent"
                labelClassName="bg-white dark:bg-gray-800"
                autoComplete="nope"
              />

              <FloatingLabelInput
                id="secret"
                name="secret"
                label="Secret"
                type="password"
                value={formData.secret}
                onChange={e => handleInputChange('secret', e.target.value)}
                error={errors.secret}
                inputClassName="bg-transparent"
                labelClassName="bg-white dark:bg-gray-800"
                autoComplete="new-password"
              />
            </div>

            {/* API URL */}
            <FloatingLabelInput
              id="api"
              name="api"
              label="API URL *"
              value={formData.api}
              onChange={e => handleInputChange('api', e.target.value)}
              error={errors.api}
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
            />

            {/* Transaction Methods & Currencies */}
            <div className="grid grid-cols-2 gap-4">
              <FloatingLabelCheckboxList
                label="Transaction Methods"
                options={methods.map(method => ({
                  id: method.id,
                  name: method.name,
                  code: method.type,
                }))}
                selectedValues={formData.methods}
                onChange={handleMethodChange}
                loading={isLoadingData}
                emptyMessage="No methods available"
                labelClassName="bg-white dark:bg-gray-800"
              />
              <FloatingLabelCheckboxList
                label="Currencies"
                options={currencies.map((c: any) => ({
                  id: c.code,
                  name: `${c.code} - ${c.name}`,
                }))}
                selectedValues={formData.currencies || []}
                onChange={handleCurrencyChange}
                error={
                  typeof errors.currencies === 'string'
                    ? errors.currencies
                    : undefined
                }
                disabled={isLoadingData}
                maxHeight="h-32"
                labelClassName="bg-white dark:bg-gray-800"
              />
            </div>

            {/* Metadata 单独一行 */}
            <FloatingLabelTextarea
              id="metadata"
              name="metadata"
              label="Metadata (JSON)"
              value={formData.metadata}
              onChange={e => handleInputChange('metadata', e.target.value)}
              error={errors.metadata}
              rows={3}
              placeholder='{"key": "value"}'
              textareaClassName="font-mono text-sm resize-none"
              labelClassName="bg-white dark:bg-gray-800"
              alwaysFloatLabel
            />

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Enabled
              </label>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.enabled ? 'bg-sky-500' : 'bg-gray-300'}`}
                onClick={() => handleInputChange('enabled', !formData.enabled)}
                disabled={isSubmitting}
                aria-checked={formData.enabled}
                role="switch"
              >
                <span className="sr-only">Toggle Enabled</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${formData.enabled ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center space-x-3">
          <button
            onClick={handleClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingData}
            className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? isEditMode
                ? 'Updating...'
                : 'Creating...'
              : isEditMode
                ? 'Update'
                : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditGatewayModal;
