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
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import ToastNotify from './ToastNotify';
import { useAuth } from './AuthContext';

interface MerchantAccountData {
  id: string;
  merchant_id: string;
  merchant_name: string;
  currency_code: string;
  balance: string;
  reserved_balance: string;
  is_default: boolean;
  status: string;
}

interface AddMerchantAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  merchantId?: string; // 可选，如果不传则需要选择商户
  editData?: MerchantAccountData; // 编辑模式下的数据
}

interface MerchantAccountFormData {
  merchant_id: string;
  currency_code: string;
  balance: string;
  reserved_balance: string;
  is_default: boolean;
  status: string;
}

const EditMerchantAccountModal: React.FC<AddMerchantAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  merchantId,
  editData,
}) => {
  const isEditMode = !!editData;

  const [formData, setFormData] = useState<MerchantAccountFormData>({
    merchant_id: merchantId || '',
    currency_code: '',
    balance: '',
    reserved_balance: '',
    is_default: false,
    status: 'active',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<MerchantAccountFormData>>({});
  const [merchants, setMerchants] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { user } = useAuth();
  // 检查编辑模式下是否有数据改动
  const hasChanges = () => {
    if (!isEditMode || !editData) return false;

    return (
      formData.status !== editData.status ||
      formData.is_default !== editData.is_default
    );
  };

  // 重置表单
  const resetForm = () => {
    if (isEditMode && editData) {
      setFormData({
        merchant_id: editData.merchant_id,
        currency_code: editData.currency_code,
        balance: editData.balance,
        reserved_balance: editData.reserved_balance,
        is_default: editData.is_default,
        status: editData.status,
      });
    } else {
      setFormData({
        merchant_id: merchantId || '',
        currency_code: '',
        balance: '',
        reserved_balance: '',
        is_default: false,
        status: 'active',
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
    }
  }, [isOpen]);

  // 当编辑数据变化时重置表单
  useEffect(() => {
    if (isOpen && isEditMode && editData) {
      resetForm();
    }
  }, [isOpen, isEditMode, editData]);

  const loadBasicData = async () => {
    setIsLoadingData(true);
    try {
      // 加载商户列表（如果没有传入merchantId且不是编辑模式）
      if (!merchantId && !isEditMode) {
        const merchantsRes = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.MERCHANTS_ACCESSIBLE}`
        );
        if (merchantsRes && merchantsRes.ok) {
          const merchantsData = await merchantsRes.json();
          console.log('Merchants API response:', merchantsData);
          setMerchants(
            Array.isArray(merchantsData.data)
              ? merchantsData.data
              : Array.isArray(merchantsData)
                ? merchantsData
                : []
          );
        } else {
          console.error('Failed to fetch merchants:', merchantsRes?.status);
        }
      }

      // 加载货币列表（如果不是编辑模式）
      if (!isEditMode) {
        const currenciesRes = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.CURRENCIES}`
        );
        if (currenciesRes && currenciesRes.ok) {
          const currenciesData = await currenciesRes.json();
          console.log('Currencies API response:', currenciesData);
          setCurrencies(
            Array.isArray(currenciesData.data)
              ? currenciesData.data
              : Array.isArray(currenciesData)
                ? currenciesData
                : []
          );
        } else {
          console.error('Failed to fetch currencies:', currenciesRes?.status);
        }
      }
    } catch (error: any) {
      console.error('Error loading basic data:', error);
      ToastNotify.error('Failed to load basic data');
    } finally {
      setIsLoadingData(false);
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Partial<MerchantAccountFormData> = {};

    if (!formData.merchant_id.trim()) {
      newErrors.merchant_id = 'Merchant ID is required';
    }

    if (!formData.currency_code.trim()) {
      newErrors.currency_code = 'Currency is required';
    }

    // 验证余额格式
    if (formData.balance && isNaN(Number(formData.balance))) {
      newErrors.balance = 'Balance must be a valid number';
    }

    if (formData.reserved_balance && isNaN(Number(formData.reserved_balance))) {
      newErrors.reserved_balance = 'Reserved balance must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // 编辑模式下检查是否有改动
    if (isEditMode && !hasChanges()) {
      ToastNotify.info('No changes to update');
      return;
    }

    setIsSubmitting(true);
    const startTime = Date.now();
    let res: Response | null = null;
    let requestBody: any = {};
    try {
      if (isEditMode && editData) {
        // 编辑模式 - 只更新状态和默认设置
        requestBody = {
          status: formData.status,
          is_default: formData.is_default,
        };

        res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.MERCHANT_ACCOUNTS}/${editData.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (res && res.ok) {
          ToastNotify.success('Merchant account updated successfully');
          handleClose();
          onSuccess();
        } else {
          const errorData = await res
            ?.json()
            .catch(() => ({ message: 'Failed to update merchant account' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${res?.status}`
          );
        }
      } else {
        // 创建模式
        requestBody = {
          merchant_id: formData.merchant_id,
          currency_code: formData.currency_code,
          balance: formData.balance || '0.00',
          reserved_balance: formData.reserved_balance || '0.00',
          is_default: formData.is_default,
          status: formData.status,
        };

        res = await authFetch(
          `${CONFIG.API_BASE_URL}${API_ROUTES.MERCHANT_ACCOUNTS}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (res && res.ok) {
          ToastNotify.success('Merchant account created successfully');
          handleClose();
          onSuccess();
        } else {
          const errorData = await res
            ?.json()
            .catch(() => ({ message: 'Failed to create merchant account' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${res?.status}`
          );
        }
      }
    } catch (error: any) {
      ToastNotify.error(
        error?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} merchant account`
      );
    } finally {
      await recordAccessLog({
        path: `/merchant-accounts`,
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
    field: keyof MerchantAccountFormData,
    value: string | boolean
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {isEditMode ? 'Edit Merchant Account' : 'Add Merchant Account'}
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
            {/* 商户选择（如果没有传入merchantId且不是编辑模式） */}
            {!merchantId && (
              <FloatingLabelSelect
                id="merchant_id"
                name="merchant_id"
                label="Merchant *"
                value={formData.merchant_id}
                onChange={e => handleInputChange('merchant_id', e.target.value)}
                error={errors.merchant_id}
                disabled={isLoadingData || isEditMode}
                disabledValue={editData?.merchant_name || ''}
                selectClassName="bg-transparent"
                labelClassName="bg-white dark:bg-gray-800"
              >
                <option value="">Select Merchant</option>
                {merchants.map(merchant => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name}
                  </option>
                ))}
              </FloatingLabelSelect>
            )}

            <FloatingLabelSelect
              id="currency_code"
              name="currency_code"
              label="Currency *"
              value={formData.currency_code}
              onChange={e => handleInputChange('currency_code', e.target.value)}
              error={errors.currency_code}
              disabled={isLoadingData || isEditMode}
              disabledValue={editData?.currency_code || ''}
              selectClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
            >
              <option value="">Select Currency</option>
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </FloatingLabelSelect>

            <FloatingLabelInput
              id="balance"
              name="balance"
              label="Balance"
              type="number"
              step="0.01"
              min="0"
              value={formData.balance}
              onChange={e => handleInputChange('balance', e.target.value)}
              error={errors.balance}
              disabled={isEditMode}
              disabledValue={`${editData?.balance || '0.00'} ${editData?.currency_code || ''}`}
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
              placeholder="0.00"
            />

            <FloatingLabelInput
              id="reserved_balance"
              name="reserved_balance"
              label="Reserved Balance"
              type="number"
              step="0.01"
              min="0"
              value={formData.reserved_balance}
              disabled={isEditMode}
              disabledValue={`${editData?.reserved_balance || '0.00'} ${editData?.currency_code || ''}`}
              onChange={e =>
                handleInputChange('reserved_balance', e.target.value)
              }
              error={errors.reserved_balance}
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
              placeholder="0.00"
            />

            {/* 状态Toggle */}
            <div className="flex items-center justify-between ml-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Status
              </label>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.status === 'active' ? 'bg-sky-500' : 'bg-gray-300'}`}
                onClick={() =>
                  handleInputChange(
                    'status',
                    formData.status === 'active' ? 'inactive' : 'active'
                  )
                }
                disabled={isSubmitting}
                aria-checked={formData.status === 'active'}
                role="switch"
              >
                <span className="sr-only">Toggle Status</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${formData.status === 'active' ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {/* 是否默认账户Toggle */}
            <div className="flex items-center justify-between ml-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Set as default account
              </label>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.is_default ? 'bg-sky-500' : 'bg-gray-300'}`}
                onClick={() =>
                  handleInputChange('is_default', !formData.is_default)
                }
                disabled={isSubmitting}
                aria-checked={formData.is_default}
                role="switch"
              >
                <span className="sr-only">Toggle Default</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${formData.is_default ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>
        </form>

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
            disabled={
              isSubmitting || isLoadingData || (isEditMode && !hasChanges())
            }
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

export default EditMerchantAccountModal;
