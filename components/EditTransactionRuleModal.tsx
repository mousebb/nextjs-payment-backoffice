import React, { useState, useEffect } from 'react';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import { getBasicData } from '@/lib/basic-data.service';
import ToastNotify from './ToastNotify';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthContext';

interface ApiTransactionRule {
  id: string;
  target_name: string;
  target_type: string;
  target_id: string;
  transaction_type: string;
  code: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiRule {
  id: string;
  code: string;
  description: string;
}

interface EditTransactionRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ApiTransactionRule | null;
}

const EditTransactionRuleModal: React.FC<EditTransactionRuleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const t = useTranslations();
  const [formData, setFormData] = useState({
    target_type: '',
    target_id: '',
    transaction_type: '',
    rule_id: '',
    rule_value: '',
    enabled: true,
  });
  const [merchants, setMerchants] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [rules, setRules] = useState<ApiRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { user } = useAuth();

  // Get target type options from translations
  const targetTypeOptions = [
    { value: 'merchant', label: t('TargetType.merchant') },
    { value: 'bank', label: t('TargetType.bank') },
  ];

  // Get transaction type options from translations
  const transactionTypeOptions = [
    { value: 'payment', label: t('TransactionType.payment') },
    { value: 'refund', label: t('TransactionType.refund') },
    { value: 'withdrawal', label: t('TransactionType.withdrawal') },
    { value: 'chargeback', label: t('TransactionType.chargeback') },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
      if (editData) {
        // 编辑模式下，需要获取完整的 transaction rule 数据
        fetchTransactionRuleDetails(editData.id);
        setFormData({
          target_type: editData.target_type,
          target_id: editData.target_id,
          transaction_type: editData.transaction_type,
          rule_id: editData.code, // 临时使用 code 作为 rule_id
          rule_value: '', // 需要从详情接口获取
          enabled: editData.enabled,
        });
      } else {
        setFormData({
          target_type: 'merchant', // 默认选中 merchant
          target_id: '',
          transaction_type: '',
          rule_id: '',
          rule_value: '',
          enabled: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  const fetchDropdownData = async () => {
    setIsLoading(true);
    try {
      const [merchantsRes, banksRes, rulesRes] = await Promise.all([
        getBasicData(
          'merchants',
          CONFIG.API_BASE_URL + API_ROUTES.MERCHANTS_ACCESSIBLE
        ),
        getBasicData(
          'banks',
          CONFIG.API_BASE_URL + API_ROUTES.BANKS_ACCESSIBLE
        ),
        getBasicData('rules', CONFIG.API_BASE_URL + API_ROUTES.RULES),
      ]);

      setMerchants(merchantsRes || []);
      setBanks(banksRes || []);
      setRules(rulesRes || []);
    } catch (e) {
      console.error('Failed to fetch dropdown data', e);
      ToastNotify.error('Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取 transaction rule 详情
  const fetchTransactionRuleDetails = async (id: string) => {
    try {
      const res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.TRANSACTION_RULES}/${id}`
      );
      if (res && res.ok) {
        const data = await res.json();
        // 处理 rule_value，如果是对象则转换为字符串
        let ruleValue = data.rule_value || '';
        if (typeof ruleValue === 'object') {
          ruleValue = JSON.stringify(ruleValue, null, 2);
        }

        setFormData(prev => ({
          ...prev,
          rule_id: data.rule_id || data.code, // 使用 rule_id 或 code
          rule_value: ruleValue, // 获取 rule_value
        }));
      }
    } catch (e) {
      console.error('Failed to fetch transaction rule details:', e);
    }
  };

  const validate = () => {
    const errs: any = {};
    if (!formData.target_type) errs.target_type = 'Target type is required';
    if (!formData.target_id) errs.target_id = 'Target is required';
    if (!formData.transaction_type)
      errs.transaction_type = 'Transaction type is required';
    if (!formData.rule_id) errs.rule_id = 'Rule is required';

    // 确保 rule_value 是字符串再调用 trim()
    const ruleValueStr = String(formData.rule_value || '');
    if (!ruleValueStr.trim()) errs.rule_value = 'Rule value is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field])
      setErrors((prev: any) => ({ ...prev, [field]: undefined }));

    // Reset target_id when target_type changes
    if (field === 'target_type') {
      setFormData(prev => ({ ...prev, target_id: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    const startTime = Date.now();
    let res: Response | null = null;
    let submissionData: any = {};
    let updateSubmissionData: any = {};
    try {
      // 处理 rule_value，如果是 JSON 字符串则解析为对象
      const ruleValueStr = String(formData.rule_value || '');
      let ruleValue = ruleValueStr.trim();
      try {
        const parsed = JSON.parse(ruleValue);
        ruleValue = parsed;
      } catch (e) {
        // 如果不是有效的 JSON，保持原样
      }

      submissionData = {
        target_type: formData.target_type,
        target_id: formData.target_id,
        transaction_type: formData.transaction_type,
        rule_id: formData.rule_id,
        rule_value: ruleValue,
        enabled: formData.enabled,
      };

      updateSubmissionData = {
        transaction_type: formData.transaction_type,
        rule_id: formData.rule_id,
        rule_value: ruleValue,
        enabled: formData.enabled,
      };

      if (editData) {
        // Edit mode - PUT request
        res = await authFetch(
          `${CONFIG.API_BASE_URL + API_ROUTES.TRANSACTION_RULES}/${editData.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateSubmissionData),
          }
        );
      } else {
        // Add mode - POST request
        res = await authFetch(
          CONFIG.API_BASE_URL + API_ROUTES.TRANSACTION_RULES,
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
        path: `/transaction-rules`,
        type: ACCESS_LOG_TYPE.WEB,
        method: editData
          ? WEB_ACTION_METHODS.UPDATE
          : WEB_ACTION_METHODS.CREATE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify(
          editData ? updateSubmissionData : submissionData
        ),
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      target_type: 'merchant',
      target_id: '',
      transaction_type: '',
      rule_id: '',
      rule_value: '',
      enabled: true,
    });
    setErrors({});
    onClose();
  };

  // Get target options based on target_type
  const getTargetOptions = () => {
    if (formData.target_type === 'merchant') {
      return merchants.map((m: any) => ({ id: m.id, name: m.name }));
    } else if (formData.target_type === 'bank') {
      return banks.map((b: any) => ({ id: b.id, name: b.name }));
    }
    return [];
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
            {editData ? 'Edit Transaction Rule' : 'Add Transaction Rule'}
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
            id="target_type"
            name="target_type"
            label="Target Type *"
            value={formData.target_type}
            onChange={e => handleChange('target_type', e.target.value)}
            error={errors.target_type}
            disabled={isLoading || !!editData}
            disabledValue={editData?.target_type || ''}
            labelClassName="bg-white dark:bg-gray-800"
          >
            <option value="">Select Target Type</option>
            {targetTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FloatingLabelSelect>

          {formData.target_type && (
            <FloatingLabelSelect
              id="target_id"
              name="target_id"
              label={`${formData.target_type === 'merchant' ? 'Merchant' : 'Bank'} Name *`}
              value={formData.target_id}
              onChange={e => handleChange('target_id', e.target.value)}
              error={errors.target_id}
              disabled={isLoading || !!editData}
              disabledValue={editData?.target_name || ''}
              labelClassName="bg-white dark:bg-gray-800"
            >
              <option value="">
                Select{' '}
                {formData.target_type === 'merchant' ? 'Merchant' : 'Bank'}
              </option>
              {getTargetOptions().map((option: any) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </FloatingLabelSelect>
          )}

          <FloatingLabelSelect
            id="transaction_type"
            name="transaction_type"
            label="Transaction Type *"
            value={formData.transaction_type}
            onChange={e => handleChange('transaction_type', e.target.value)}
            error={errors.transaction_type}
            disabled={isLoading}
            labelClassName="bg-white dark:bg-gray-800"
          >
            <option value="">Select Transaction Type</option>
            {transactionTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FloatingLabelSelect>

          <FloatingLabelSelect
            id="rule_id"
            name="rule_id"
            label="Rule *"
            value={formData.rule_id}
            onChange={e => handleChange('rule_id', e.target.value)}
            error={errors.rule_id}
            disabled={isLoading}
            labelClassName="bg-white dark:bg-gray-800"
          >
            <option value="">Select Rule</option>
            {rules.map(rule => (
              <option key={rule.id} value={rule.id}>
                {rule.code} - {rule.description}
              </option>
            ))}
          </FloatingLabelSelect>

          <FloatingLabelInput
            id="rule_value"
            name="rule_value"
            label="Rule Value *"
            value={formData.rule_value}
            onChange={e => handleChange('rule_value', e.target.value)}
            error={errors.rule_value}
            placeholder="Enter rule value"
            inputClassName="bg-transparent"
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

export default EditTransactionRuleModal;
