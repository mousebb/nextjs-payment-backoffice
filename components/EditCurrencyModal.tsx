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
import { clearBasicDataCache } from '@/lib/basic-data.service';
import FloatingLabelInput from './FloatingLabelInput';
import ToastNotify from './ToastNotify';
import { useAuth } from './AuthContext';

interface CurrencyFormData {
  id?: string;
  code: string;
  name: string;
  symbol: string;
  precision: number;
  is_crypto: boolean;
}

interface EditCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: CurrencyFormData | null;
}

const EditCurrencyModal: React.FC<EditCurrencyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const isEditMode = !!editData;
  const [formData, setFormData] = useState<CurrencyFormData>({
    code: '',
    name: '',
    symbol: '',
    precision: 2,
    is_crypto: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CurrencyFormData, string>>
  >({});
  const { user } = useAuth();

  // 重置表单
  const resetForm = () => {
    if (isEditMode && editData) {
      setFormData({
        code: editData.code,
        name: editData.name,
        symbol: editData.symbol,
        precision: editData.precision,
        is_crypto: editData.is_crypto,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        symbol: '',
        precision: 2,
        is_crypto: false,
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
      resetForm();
    }
  }, [isOpen, isEditMode, editData]);

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CurrencyFormData, string>> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.precision < 0 || formData.precision > 18) {
      newErrors.precision = 'Precision must be between 0 and 18';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    const startTime = Date.now();
    let requestBody: any = {};
    let res: Response | null = null;

    try {
      requestBody = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        precision: formData.precision,
        is_crypto: formData.is_crypto,
        ...(formData.symbol?.trim() ? { symbol: formData.symbol.trim() } : {}),
      };

      if (isEditMode && editData) {
        // 编辑模式 PUT
        res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.CURRENCIES}/${editData.code}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );
      } else {
        // 新增 POST
        res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.CURRENCIES}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );
      }

      if (res && res.ok) {
        ToastNotify.success(
          isEditMode
            ? 'Currency updated successfully'
            : 'Currency created successfully'
        );
        // 清除货币基础数据缓存，确保其他组件能立即看到最新数据
        clearBasicDataCache(['currencies']);
        handleClose();
        onSuccess();
      } else {
        const errorData = await res
          ?.json()
          .catch(() => ({
            message: isEditMode
              ? 'Failed to update currency'
              : 'Failed to create currency',
          }));
        throw new Error(
          errorData.message || `HTTP error! status: ${res?.status}`
        );
      }
    } catch (error: any) {
      ToastNotify.error(
        error?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} currency`
      );
    } finally {
      await recordAccessLog({
        path: `/currencies`,
        type: ACCESS_LOG_TYPE.WEB,
        method: isEditMode
          ? WEB_ACTION_METHODS.UPDATE
          : WEB_ACTION_METHODS.CREATE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: requestBody,
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });

      setIsSubmitting(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (
    field: keyof CurrencyFormData,
    value: string | number | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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
            {isEditMode ? 'Edit Currency' : 'Add Currency'}
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
            {/* Code */}
            <FloatingLabelInput
              id="code"
              name="code"
              label="Code *"
              value={formData.code || ''}
              onChange={e => handleInputChange('code', e.target.value)}
              error={errors.code}
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
              placeholder="e.g. USD"
            />

            {/* Name */}
            <FloatingLabelInput
              id="name"
              name="name"
              label="Name *"
              value={formData.name || ''}
              onChange={e => handleInputChange('name', e.target.value)}
              error={errors.name}
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
            />

            {/* Symbol */}
            <FloatingLabelInput
              id="symbol"
              name="symbol"
              label="Symbol"
              value={formData.symbol || ''}
              onChange={e => handleInputChange('symbol', e.target.value)}
              error={errors.symbol}
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
              placeholder="e.g. $, £, ₱, Rp, R$"
            />

            {/* Precision */}
            <FloatingLabelInput
              id="precision"
              name="precision"
              label="Precision"
              type="number"
              value={formData.precision || ''}
              onChange={e =>
                handleInputChange('precision', parseInt(e.target.value) || 0)
              }
              error={errors.precision}
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
              min="0"
              placeholder="e.g. 0 - 18"
            />

            {/* Type Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Is Crypto
              </label>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.is_crypto ? 'bg-sky-500' : 'bg-gray-300'}`}
                onClick={() =>
                  handleInputChange('is_crypto', !formData.is_crypto)
                }
                disabled={isSubmitting}
                aria-checked={formData.is_crypto}
                role="switch"
              >
                <span className="sr-only">Toggle Type</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${formData.is_crypto ? 'translate-x-5' : 'translate-x-1'}`}
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
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? isEditMode
                ? 'Updating...'
                : 'Creating...'
              : isEditMode
                ? 'Update'
                : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCurrencyModal;
