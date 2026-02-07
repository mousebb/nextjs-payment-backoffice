import React, { useState, useEffect } from 'react';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import FloatingLabelTextarea from './FloatingLabelTextarea';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  WEB_ACTION_METHODS,
  SETTLEMENT_METHOD_TYPE,
  SETTLEMENT_CYCLE,
  ROLES_ENUM,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import { getBasicData, getBasicDataFromCache } from '@/lib/basic-data.service';
import ToastNotify from './ToastNotify';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from './AuthContext';
import { usePermission } from '@/hooks/usePermission';

interface ApiSettlementMethod {
  id: string;
  user_id: string;
  user_type: string;
  type: string;
  payee_name: string;
  account_number: string;
  bank_name: string | null;
  currency_code: string;
  is_default: boolean;
  metadata: any;
  status: string;
  settlement_cycle: SETTLEMENT_CYCLE;
  auto_settlement: boolean;
  min_settlement_amount: string;
  created_at: string;
  username: string;
}

interface ApiUser {
  id: string;
  username: string;
  role_name: string;
  email?: string;
}

interface EditSettlementMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ApiSettlementMethod | null;
}

const EditSettlementMethodModal: React.FC<EditSettlementMethodModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const [formData, setFormData] = useState<{
    user_id: string;
    user_type: string;
    type: string;
    payee_name: string;
    account_number: string;
    bank_name: string;
    currency_code: string;
    is_default: boolean;
    status: string;
    metadata: string;
    settlement_cycle: SETTLEMENT_CYCLE;
    auto_settlement: boolean;
    min_settlement_amount: string;
  }>({
    user_id: '',
    user_type: '',
    type: '',
    payee_name: '',
    account_number: '',
    bank_name: '',
    currency_code: '',
    is_default: false,
    status: 'active',
    metadata: '',
    settlement_cycle: SETTLEMENT_CYCLE.MANUAL,
    auto_settlement: false,
    min_settlement_amount: '0',
  });
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { user } = useAuth();
  const { can } = usePermission();

  // 检查用户是否有权限管理其他用户的 settlement methods
  const canManageOtherUsers =
    can('user', 'view') ||
    user?.permissions?.some(p => ['all:view', 'all:*'].includes(p));

  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
      if (editData) {
        const settlementCycle =
          editData.settlement_cycle || SETTLEMENT_CYCLE.MANUAL;
        const autoSettlement =
          settlementCycle === SETTLEMENT_CYCLE.MANUAL
            ? false
            : editData.auto_settlement || false;

        setFormData({
          user_id: editData.user_id,
          user_type: editData.user_type,
          type: editData.type,
          payee_name: editData.payee_name,
          account_number: editData.account_number,
          bank_name: editData.bank_name || '',
          currency_code: editData.currency_code,
          is_default: editData.is_default,
          status: editData.status || 'active',
          metadata: editData.metadata
            ? JSON.stringify(editData.metadata, null, 2)
            : '',
          settlement_cycle: settlementCycle,
          auto_settlement: autoSettlement,
          min_settlement_amount: editData.min_settlement_amount || '0',
        });
      } else {
        setFormData({
          user_id: canManageOtherUsers ? '' : user?.id || '',
          user_type: canManageOtherUsers ? '' : 'merchant', // 默认用户类型
          type: '',
          payee_name: '',
          account_number: '',
          bank_name: '',
          currency_code: '',
          is_default: false,
          status: 'active',
          metadata: '',
          settlement_cycle: SETTLEMENT_CYCLE.MANUAL,
          auto_settlement: false,
          min_settlement_amount: '0',
        });
      }
      setErrors({});
    }
  }, [isOpen, editData, user, canManageOtherUsers]);

  const fetchDropdownData = async () => {
    setIsLoading(true);
    try {
      // 获取货币列表 - 使用基础数据
      const currenciesData = getBasicDataFromCache('currencies');
      if (currenciesData.length > 0) {
        setCurrencies(currenciesData);
      } else {
        // 如果缓存中没有，则从API获取
        const currenciesResponse = await authFetch(
          CONFIG.API_BASE_URL + API_ROUTES.CURRENCIES
        );
        if (currenciesResponse?.ok) {
          const currenciesData = await currenciesResponse.json();
          setCurrencies(currenciesData);
        }
      }

      // 如果是管理员或运营人员，获取用户列表
      if (canManageOtherUsers) {
        const usersData = getBasicDataFromCache('users');
        if (usersData.length > 0) {
          setUsers(usersData);
        } else {
          // 如果缓存中没有，则从API获取
          const usersResponse = await authFetch(
            CONFIG.API_BASE_URL + API_ROUTES.USERS
          );
          if (usersResponse?.ok) {
            const usersData = await usersResponse.json();
            setUsers(usersData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validate = () => {
    const newErrors: any = {};

    if (!formData.user_id) {
      newErrors.user_id = 'User is required';
    }
    if (!formData.user_type) {
      newErrors.user_type = 'User type is required';
    }
    if (!formData.type) {
      newErrors.type = 'Type is required';
    }
    if (formData.type === SETTLEMENT_METHOD_TYPE.BANK && !formData.payee_name) {
      newErrors.payee_name = 'Payee name is required';
    }
    if (!formData.account_number) {
      newErrors.account_number = 'Account number is required';
    }
    if (formData.type === SETTLEMENT_METHOD_TYPE.BANK && !formData.bank_name) {
      newErrors.bank_name = 'Bank name is required for bank type';
    }
    if (!formData.currency_code) {
      newErrors.currency_code = 'Currency is required';
    }
    if (!formData.settlement_cycle) {
      newErrors.settlement_cycle = 'Settlement cycle is required';
    }
    if (
      formData.min_settlement_amount &&
      parseFloat(formData.min_settlement_amount) < 0
    ) {
      newErrors.min_settlement_amount =
        'Minimum settlement amount cannot be negative';
    }
    // 验证：当 settlement_cycle 为 manual 时，auto_settlement 必须为 false
    if (
      formData.settlement_cycle === SETTLEMENT_CYCLE.MANUAL &&
      formData.auto_settlement
    ) {
      newErrors.auto_settlement =
        'Auto settlement cannot be enabled when settlement cycle is manual';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        metadata: formData.metadata ? JSON.parse(formData.metadata) : null,
      };

      let response;
      if (editData) {
        // 编辑现有记录
        const updateUrl =
          CONFIG.API_BASE_URL +
          API_ROUTES.SETTLEMENT_METHODS_DETAILS.replace(':id', editData.id);
        response = await authFetch(updateUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });
      } else {
        // 添加新记录
        response = await authFetch(
          CONFIG.API_BASE_URL + API_ROUTES.SETTLEMENT_METHODS,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submitData),
          }
        );
      }

      if (!response) {
        ToastNotify.error('Network error');
        return;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to save settlement method' }));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      // 记录访问日志
      try {
        await recordAccessLog({
          path: `/settlement-methods${editData ? '/' + editData.id : ''}`,
          type: ACCESS_LOG_TYPE.WEB,
          method: editData
            ? WEB_ACTION_METHODS.UPDATE
            : WEB_ACTION_METHODS.CREATE,
          user_id: user?.id,
          ip_address: user?.ip_address || '',
          status_code: 200,
          request: JSON.stringify(submitData),
          response: '',
          duration_ms: 0,
        });
      } catch (e) {
        // 忽略日志上报异常
      }

      ToastNotify.success(
        editData
          ? 'Settlement method updated successfully'
          : 'Settlement method created successfully'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      ToastNotify.error(err.message || 'Failed to save settlement method');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      user_id: '',
      user_type: '',
      type: '',
      payee_name: '',
      account_number: '',
      bank_name: '',
      currency_code: '',
      is_default: false,
      status: 'active',
      metadata: '',
      settlement_cycle: SETTLEMENT_CYCLE.MANUAL,
      auto_settlement: false,
      min_settlement_amount: '0',
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 transform transition-all overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {editData ? 'Edit Settlement Method' : 'Add Settlement Method'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Selection - 只有管理员和运营人员可以选择用户 */}
          {canManageOtherUsers && (
            <FloatingLabelSelect
              id="user_id"
              name="user_id"
              label="User"
              value={formData.user_id}
              onChange={e => {
                handleChange('user_id', e.target.value);
                // 根据选择的用户设置用户类型
                const selectedUser = users.find(u => u.id === e.target.value);
                if (selectedUser) {
                  handleChange('user_type', selectedUser.role_name);
                }
              }}
              error={errors.user_id}
            >
              {users
                .filter(u =>
                  [ROLES_ENUM.MERCHANT, ROLES_ENUM.AGENT].includes(
                    u.role_name as any
                  )
                )
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role_name})
                  </option>
                ))}
            </FloatingLabelSelect>
          )}

          {/* Type and Payee Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelSelect
              id="type"
              name="type"
              label="Type"
              value={formData.type}
              onChange={e => handleChange('type', e.target.value)}
              error={errors.type}
            >
              <option value={SETTLEMENT_METHOD_TYPE.BANK}>
                {SETTLEMENT_METHOD_TYPE.BANK.charAt(0).toUpperCase() +
                  SETTLEMENT_METHOD_TYPE.BANK.slice(1)}
              </option>
              <option value={SETTLEMENT_METHOD_TYPE.CRYPTO}>
                {SETTLEMENT_METHOD_TYPE.CRYPTO.charAt(0).toUpperCase() +
                  SETTLEMENT_METHOD_TYPE.CRYPTO.slice(1)}
              </option>
              <option value={SETTLEMENT_METHOD_TYPE.OTHER}>
                {SETTLEMENT_METHOD_TYPE.OTHER.charAt(0).toUpperCase() +
                  SETTLEMENT_METHOD_TYPE.OTHER.slice(1)}
              </option>
            </FloatingLabelSelect>
            <FloatingLabelInput
              id="payee_name"
              name="payee_name"
              label="Payee Name"
              value={formData.payee_name}
              onChange={e => handleChange('payee_name', e.target.value)}
              error={errors.payee_name}
            />
          </div>
          <FloatingLabelInput
            id="account_number"
            name="account_number"
            label="Account Number"
            value={formData.account_number}
            onChange={e => handleChange('account_number', e.target.value)}
            error={errors.account_number}
          />
          {/* Account Number and Bank Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelInput
              id="bank_name"
              name="bank_name"
              label="Bank Name"
              value={formData.bank_name}
              onChange={e => handleChange('bank_name', e.target.value)}
              error={errors.bank_name}
              disabled={formData.type !== SETTLEMENT_METHOD_TYPE.BANK}
            />
            {/* Currency */}
            <FloatingLabelSelect
              id="currency_code"
              name="currency_code"
              label="Currency"
              value={formData.currency_code}
              onChange={e => handleChange('currency_code', e.target.value)}
              error={errors.currency_code}
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </FloatingLabelSelect>
          </div>

          {canManageOtherUsers && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Minimum Settlement Amount */}
              <FloatingLabelInput
                id="min_settlement_amount"
                name="min_settlement_amount"
                label="Min Settlement Amount"
                // type="number"
                // step="0.01"
                value={formData.min_settlement_amount}
                onChange={e =>
                  handleChange('min_settlement_amount', e.target.value)
                }
                error={errors.min_settlement_amount}
                placeholder="100.00"
              />
              {/* Settlement Cycle */}
              <FloatingLabelSelect
                id="settlement_cycle"
                name="settlement_cycle"
                label="Settlement Cycle"
                value={formData.settlement_cycle}
                onChange={e => {
                  const selectedCycle = e.target.value as SETTLEMENT_CYCLE;
                  handleChange('settlement_cycle', selectedCycle);
                  // 如果选择 manual，自动禁用 auto_settlement
                  if (selectedCycle === SETTLEMENT_CYCLE.MANUAL) {
                    handleChange('auto_settlement', false);
                  }
                }}
                error={errors.settlement_cycle}
              >
                <option value={SETTLEMENT_CYCLE.MANUAL}>Manual</option>
                <option value={SETTLEMENT_CYCLE.T0}>T0</option>
                <option value={SETTLEMENT_CYCLE.D0}>D0</option>
                <option value={SETTLEMENT_CYCLE.T1}>T1</option>
                <option value={SETTLEMENT_CYCLE.T15}>T15</option>
                <option value={SETTLEMENT_CYCLE.MONTHLY}>Monthly</option>
              </FloatingLabelSelect>

              {/* Auto Settlement Toggle */}
              <div className="flex items-center justify-between ml-2">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Auto Settlement
                  </label>
                  {formData.settlement_cycle === SETTLEMENT_CYCLE.MANUAL && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Not available for manual
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    formData.auto_settlement &&
                    formData.settlement_cycle !== SETTLEMENT_CYCLE.MANUAL
                      ? 'bg-sky-500'
                      : 'bg-gray-300'
                  }`}
                  onClick={() => {
                    // 只有在非 manual 模式下才能切换 auto_settlement
                    if (formData.settlement_cycle !== SETTLEMENT_CYCLE.MANUAL) {
                      handleChange(
                        'auto_settlement',
                        !formData.auto_settlement
                      );
                    }
                  }}
                  disabled={
                    isSubmitting ||
                    formData.settlement_cycle === SETTLEMENT_CYCLE.MANUAL
                  }
                  aria-checked={
                    formData.auto_settlement &&
                    formData.settlement_cycle !== SETTLEMENT_CYCLE.MANUAL
                  }
                  role="switch"
                >
                  <span className="sr-only">Toggle Auto Settlement</span>
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      formData.auto_settlement &&
                      formData.settlement_cycle !== SETTLEMENT_CYCLE.MANUAL
                        ? 'translate-x-5'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {errors.auto_settlement && (
                <div className="text-red-500 text-sm mt-1 ml-2">
                  {errors.auto_settlement}
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <FloatingLabelTextarea
            id="metadata"
            name="metadata"
            label="Metadata (JSON)"
            value={formData.metadata}
            onChange={e => handleChange('metadata', e.target.value)}
            placeholder='{"swift_code": "BOSGSG2X"}'
            rows={3}
          />

          {/* Status Toggle */}
          <div className="flex items-center justify-between ml-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Status
            </label>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.status === 'active' ? 'bg-sky-500' : 'bg-gray-300'}`}
              onClick={() =>
                handleChange(
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

          {/* Is Default Toggle */}
          <div className="flex items-center justify-between ml-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Set as default
            </label>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.is_default ? 'bg-sky-500' : 'bg-gray-300'}`}
              onClick={() => handleChange('is_default', !formData.is_default)}
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

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 border border-transparent rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : editData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSettlementMethodModal;
