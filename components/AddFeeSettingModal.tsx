'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  WEB_ACTION_METHODS,
  TRANSACTION_TYPE,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import ToastNotify from './ToastNotify';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import { useAuth } from './AuthContext';

interface AddFeeSettingModalProps {
  merchantId: string;
  routerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Bank {
  id: string;
  name: string;
}

interface TransactionMethod {
  id: string;
  name: string;
}

interface Currency {
  code: string;
  name: string;
}

interface RouterBankDetail {
  id: string;
  name: string;
  methods: TransactionMethod[];
  currencies: Currency[];
}

const initialFormData = {
  bank_id: '',
  type: '',
  method_id: '',
  currency_code: '',
  min_amount: '',
  max_amount: '',
  percentage: '',
  fixed_fee: '',
  min_fee: '',
  max_fee: '',
  included_commission_percentage: '',
  included_commission_fixed: '',
  agent_user_id: '',
  enabled: true,
};

const AddFeeSettingModal: React.FC<AddFeeSettingModalProps> = ({
  merchantId,
  routerId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [routerBankDetails, setRouterBankDetails] = useState<
    RouterBankDetail[]
  >([]);
  const [routerMethods, setRouterMethods] = useState<TransactionMethod[]>([]);
  const [routerCurrencies, setRouterCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const [agents, setAgents] = useState<
    { id: string; name?: string; username?: string }[]
  >([]);
  const isCommissionApplicable =
    formData.type === TRANSACTION_TYPE.PAYMENT ||
    formData.type === TRANSACTION_TYPE.WITHDRAWAL;

  useEffect(() => {
    if (isOpen) {
      const fetchDropdownData = async () => {
        setIsLoading(true);
        try {
          const routerRes = await authFetch(
            CONFIG.API_BASE_URL + API_ROUTES.ROUTERS + `/${routerId}`
          );
          if (routerRes && routerRes.ok) {
            const routerData = await routerRes.json();
            if (Array.isArray(routerData.banks)) {
              const details: RouterBankDetail[] = routerData.banks.map(
                (b: any) => ({
                  id: b.bank_id,
                  name: b.bank_name,
                  methods: (b.transaction_methods || []).map((m: any) => ({
                    id: m.method_id,
                    name: m.method_name,
                  })),
                  currencies: (b.currencies || []).map((c: any) => ({
                    code: c.currency_code,
                    name: c.currency_code,
                  })),
                })
              );
              setRouterBankDetails(details);
            }
          } else {
            ToastNotify.error('Failed to fetch router info');
          }
          // 获取 agent 列表
          try {
            const agentRes = await authFetch(
              CONFIG.API_BASE_URL + API_ROUTES.AGENTS
            );
            if (agentRes && agentRes.ok) {
              const agentData = await agentRes.json();
              const allAgents = Array.isArray(agentData.data)
                ? agentData.data
                : Array.isArray(agentData)
                  ? agentData
                  : [];

              // 过滤 agents，只显示包含当前 merchant id 的 agents
              const filteredAgents = allAgents.filter((agent: any) => {
                // 检查 agent 是否有 merchants 数组
                if (!agent.merchants || !Array.isArray(agent.merchants)) {
                  return false;
                }

                // 检查 merchants 数组中是否有匹配当前 merchantId 的商户
                return agent.merchants.some(
                  (merchant: any) =>
                    merchant && merchant.id && merchant.id === merchantId
                );
              });

              setAgents(filteredAgents);
            }
          } catch (e) {
            ToastNotify.error('Failed to fetch agents');
          }
        } catch (error) {
          console.error('Failed to fetch router banks', error);
          ToastNotify.error('Failed to load data for form.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchDropdownData();
      setFormData(initialFormData);
      setRouterMethods([]);
      setRouterCurrencies([]);
    }
  }, [isOpen, routerId]);

  useEffect(() => {
    if (!isCommissionApplicable) {
      setFormData(prev => ({
        ...prev,
        agent_user_id: '',
        included_commission_percentage: '',
        included_commission_fixed: '',
      }));
    }
  }, [formData.type]);

  useEffect(() => {
    const selectedBank = routerBankDetails.find(b => b.id === formData.bank_id);
    if (selectedBank) {
      setRouterMethods(selectedBank.methods);
      setRouterCurrencies(selectedBank.currencies);

      // 自动清除不合法的 method 或 currency
      if (!selectedBank.methods.some(m => m.id === formData.method_id)) {
        setFormData(prev => ({ ...prev, method_id: '' }));
      }
      if (
        !selectedBank.currencies.some(c => c.code === formData.currency_code)
      ) {
        setFormData(prev => ({ ...prev, currency_code: '' }));
      }
    } else {
      setRouterMethods([]);
      setRouterCurrencies([]);
    }
  }, [formData.bank_id, routerBankDetails]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      bank_id,
      type,
      currency_code,
      min_amount,
      max_amount,
      percentage,
      min_fee,
      max_fee,
      fixed_fee,
      included_commission_percentage,
      included_commission_fixed,
    } = formData;

    if (!bank_id || !type || !currency_code) {
      ToastNotify.error('Bank, Type, and Currency are required.');
      return;
    }

    if (!percentage && !fixed_fee) {
      ToastNotify.error('Either Percentage or Fixed Fee must be provided.');
      return;
    }

    if (percentage && (!min_fee || !max_fee)) {
      ToastNotify.error(
        'Min Fee or Max Fee is required when using percentage-based fees.'
      );
      return;
    }

    if (max_amount && !min_amount) {
      ToastNotify.error('Min Amount is required when Max Amount is provided.');
      return;
    }

    if (
      min_amount &&
      max_amount &&
      parseFloat(min_amount) > parseFloat(max_amount)
    ) {
      ToastNotify.error('Min Amount cannot be greater than Max Amount.');
      return;
    }

    if (percentage && parseFloat(percentage) >= 100) {
      ToastNotify.error('Percentage must be less than 100.');
      return;
    }

    if (min_fee && max_fee && parseFloat(min_fee) > parseFloat(max_fee)) {
      ToastNotify.error('Min Fee cannot be greater than Max Fee.');
      return;
    }

    const nonNegativeFields = [
      ['percentage', percentage],
      ['fixed_fee', fixed_fee],
      ['min_amount', min_amount],
      ['max_amount', max_amount],
      ['min_fee', min_fee],
      ['max_fee', max_fee],
      ['included_commission_percentage', included_commission_percentage],
      ['included_commission_fixed', included_commission_fixed],
    ];

    for (const [name, value] of nonNegativeFields) {
      if (value && parseFloat(value) < 0) {
        ToastNotify.error(`${name.replace('_', ' ')} cannot be negative.`);
        return;
      }
    }

    setIsSaving(true);

    const submissionData = {
      ...formData,
      merchant_id: merchantId,
      method_id: formData.method_id || null,
      min_amount: formData.min_amount || null,
      max_amount: formData.max_amount || null,
      percentage: formData.percentage
        ? (parseFloat(formData.percentage) / 100).toString()
        : null,
      fixed_fee: formData.fixed_fee || null,
      min_fee: formData.min_fee || null,
      max_fee: formData.max_fee || null,
      included_commission_percentage: formData.included_commission_percentage
        ? (parseFloat(formData.included_commission_percentage) / 100).toString()
        : null,
      included_commission_fixed: formData.included_commission_fixed || null,
    };

    const startTime = Date.now();
    let res: Response | null = null;
    try {
      res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.MERCHANT_FEE_SETTINGS,
        {
          method: 'POST',
          body: JSON.stringify(submissionData),
        }
      );

      if (res && res.ok) {
        ToastNotify.success('Fee setting added successfully!');
        onSuccess();
        handleClose();
      } else {
        const errorData = await res?.json();
        throw new Error(errorData?.message || 'Failed to add fee setting');
      }
    } catch (error: any) {
      ToastNotify.error(error.message);
    } finally {
      await recordAccessLog({
        path: `/fee-settings`,
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.CREATE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify(submissionData),
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });

      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setRouterMethods([]);
    setRouterCurrencies([]);
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Add New Fee Setting
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {isLoading ? (
            <div className="p-10 text-center">Loading form...</div>
          ) : (
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FloatingLabelSelect
                  id="bank_id"
                  name="bank_id"
                  label="Bank *"
                  value={formData.bank_id}
                  onChange={handleChange}
                  selectClassName="bg-transparent"
                  labelClassName="bg-white dark:bg-gray-800"
                >
                  {routerBankDetails.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </FloatingLabelSelect>

                <FloatingLabelSelect
                  id="type"
                  name="type"
                  label="Transaction Type *"
                  value={formData.type}
                  onChange={handleChange}
                  selectClassName="bg-transparent"
                  labelClassName="bg-white dark:bg-gray-800"
                >
                  {Object.values(TRANSACTION_TYPE).map(typeValue => (
                    <option key={typeValue} value={typeValue}>
                      {typeValue.charAt(0).toUpperCase() + typeValue.slice(1)}
                    </option>
                  ))}
                </FloatingLabelSelect>

                <FloatingLabelSelect
                  id="method_id"
                  name="method_id"
                  label="Method"
                  value={formData.method_id}
                  onChange={handleChange}
                  selectClassName="bg-transparent"
                  labelClassName="bg-white dark:bg-gray-800"
                >
                  {routerMethods.map(method => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </FloatingLabelSelect>

                <FloatingLabelSelect
                  id="currency_code"
                  name="currency_code"
                  label="Currency *"
                  value={formData.currency_code}
                  onChange={handleChange}
                  selectClassName="bg-transparent"
                  labelClassName="bg-white dark:bg-gray-800"
                >
                  {routerCurrencies.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </FloatingLabelSelect>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <FloatingLabelInput
                  id="min_amount"
                  type="number"
                  name="min_amount"
                  label="Min Amount"
                  value={formData.min_amount}
                  onChange={handleChange}
                  inputClassName="bg-transparent"
                  labelClassName="bg-white dark:bg-gray-800"
                />
                <FloatingLabelInput
                  id="max_amount"
                  type="number"
                  name="max_amount"
                  label="Max Amount"
                  value={formData.max_amount}
                  onChange={handleChange}
                  inputClassName="bg-transparent"
                  labelClassName="bg-white dark:bg-gray-800"
                />
              </div>

              <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FloatingLabelInput
                    id="percentage"
                    type="number"
                    name="percentage"
                    label="Percentage %"
                    value={formData.percentage}
                    onChange={handleChange}
                    inputClassName="bg-white dark:bg-gray-700"
                    labelClassName="bg-white dark:bg-gray-700"
                  />
                  <FloatingLabelInput
                    id="fixed_fee"
                    type="number"
                    name="fixed_fee"
                    label="Fixed Fee"
                    value={formData.fixed_fee}
                    onChange={handleChange}
                    inputClassName="bg-white dark:bg-gray-700"
                    labelClassName="bg-white dark:bg-gray-700"
                  />
                  <FloatingLabelInput
                    id="min_fee"
                    type="number"
                    name="min_fee"
                    label="Min Fee"
                    value={formData.min_fee}
                    onChange={handleChange}
                    inputClassName="bg-white dark:bg-gray-700"
                    labelClassName="bg-white dark:bg-gray-700"
                  />
                  <FloatingLabelInput
                    id="max_fee"
                    type="number"
                    name="max_fee"
                    label="Max Fee"
                    value={formData.max_fee}
                    onChange={handleChange}
                    inputClassName="bg-white dark:bg-gray-700"
                    labelClassName="bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg">
                <div className="text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                  <span className="font-bold">Note:</span>
                  <span className="text-sm ml-2">
                    Commission is included in the total fee — no additional
                    charge is applied.
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FloatingLabelSelect
                    id="agent_user_id"
                    name="agent_user_id"
                    label="Agent"
                    value={formData.agent_user_id}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        agent_user_id: e.target.value,
                      })
                    }
                    selectClassName="bg-white dark:bg-gray-700"
                    labelClassName="bg-white dark:bg-gray-700"
                    disabled={!isCommissionApplicable}
                  >
                    <option value="">Select agent</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name || agent.username || agent.id}
                      </option>
                    ))}
                  </FloatingLabelSelect>
                  <FloatingLabelInput
                    id="included_commission_percentage"
                    type="number"
                    name="included_commission_percentage"
                    label="Commission %"
                    value={formData.included_commission_percentage}
                    onChange={handleChange}
                    inputClassName="bg-white dark:bg-gray-700"
                    labelClassName="bg-white dark:bg-gray-700"
                    disabled={!isCommissionApplicable}
                  />
                  <FloatingLabelInput
                    id="included_commission_fixed"
                    type="number"
                    name="included_commission_fixed"
                    label="Commission Fixed"
                    value={formData.included_commission_fixed}
                    onChange={handleChange}
                    inputClassName="bg-white dark:bg-gray-700"
                    labelClassName="bg-white dark:bg-gray-700"
                    disabled={!isCommissionApplicable}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFeeSettingModal;
