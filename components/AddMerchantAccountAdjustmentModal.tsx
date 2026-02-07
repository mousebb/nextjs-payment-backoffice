import React, { useState, useEffect } from 'react';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import FloatingLabelTextarea from './FloatingLabelTextarea';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  SOURCE_ACTION,
  TRANSACTION_SOURCE_TYPE,
  TRANSACTION_TYPE,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import ToastNotify from './ToastNotify';
import { useAuth } from './AuthContext';

interface ApiMerchantAccount {
  id: string;
  merchant_id: string;
  merchant_name: string;
  currency_code: string;
  balance: string;
  reserved_balance: string;
  is_default: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AddMerchantAccountAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  merchantAccount: ApiMerchantAccount | null;
}

const AddMerchantAccountAdjustmentModal: React.FC<
  AddMerchantAccountAdjustmentModalProps
> = ({ isOpen, onClose, onSuccess, merchantAccount }) => {
  const t = useTranslations('AdjustmentType');
  const [formData, setFormData] = useState({
    source_type: '',
    source_action: '',
    amount: '',
    currency_code: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { user } = useAuth();
  // Get adjustment type options from translations
  const adjustmentTypeOptions = [
    { value: TRANSACTION_SOURCE_TYPE.RELEASE, label: t('release') },
    { value: TRANSACTION_SOURCE_TYPE.RESERVE, label: t('reserve') },
    { value: TRANSACTION_SOURCE_TYPE.ADJUSTMENT, label: t('adjustment') },
  ];
  const NEGATIVE_ALLOWED = [
    TRANSACTION_SOURCE_TYPE.ADJUSTMENT,
    TRANSACTION_SOURCE_TYPE.RESERVE,
  ];
  const NEGATIVE_ONLY = [TRANSACTION_SOURCE_TYPE.RESERVE];

  useEffect(() => {
    if (isOpen) {
      setFormData({
        source_type: '',
        source_action: '',
        amount: '',
        currency_code: '',
        description: '',
      });
      setErrors({});
    }
  }, [isOpen, merchantAccount]);

  const validate = () => {
    const errs: any = {};
    const amount = parseFloat(formData.amount);

    if (!formData.source_type) errs.source_type = 'Adjustment type is required';
    if (!formData.amount) errs.amount = 'Amount is required';

    if (
      amount < 0 &&
      !NEGATIVE_ALLOWED.includes(
        formData.source_type as TRANSACTION_SOURCE_TYPE
      )
    ) {
      errs.amount = 'Negative amount not allowed for this adjustment type';
    } else if (
      amount > 0 &&
      NEGATIVE_ONLY.includes(formData.source_type as TRANSACTION_SOURCE_TYPE)
    ) {
      errs.amount = 'This adjustment type only supports negative amount';
    }

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
    if (!validate() || !merchantAccount) return;
    setIsSubmitting(true);
    const startTime = Date.now();
    let res: Response | null = null;
    let submissionData: any = {};
    try {
      let calculatedSourceAction = '';
      switch (formData.source_type) {
        case TRANSACTION_SOURCE_TYPE.RELEASE:
          calculatedSourceAction = SOURCE_ACTION.UNFREEZE;
          break;
        case TRANSACTION_SOURCE_TYPE.RESERVE:
          calculatedSourceAction = SOURCE_ACTION.FREEZE;
          break;
        case TRANSACTION_SOURCE_TYPE.ADJUSTMENT:
          if (
            !isNaN(parseFloat(formData.amount)) &&
            parseFloat(formData.amount) < 0
          ) {
            calculatedSourceAction = SOURCE_ACTION.DEBIT;
          } else {
            calculatedSourceAction = SOURCE_ACTION.CREDIT;
          }
          break;
      }

      submissionData = {
        merchant_account_id: merchantAccount.id,
        source_type: formData.source_type,
        source_action: calculatedSourceAction,
        amount: formData.amount,
        currency_code: merchantAccount.currency_code,
        description: formData.description.trim() || undefined,
      };

      res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.MERCHANT_ACCOUNTS_TRANSACTIONS}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData),
        }
      );

      if (res && res.ok) {
        ToastNotify.success('Account adjustment added successfully');
        handleClose();
        onSuccess();
      } else {
        const err = await res?.json().catch(() => ({}));
        ToastNotify.error(err?.message || 'Failed to add account adjustment');
      }
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to add account adjustment');
    } finally {
      await recordAccessLog({
        path: `/merchant-accounts`,
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.CREATE,
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
      source_type: '',
      source_action: '',
      amount: '',
      currency_code: '',
      description: '',
    });
    setErrors({});
    onClose();
  };

  if (!isOpen || !merchantAccount) return null;

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
            Add Account Adjustment
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
            id="merchant_name"
            name="merchant_name"
            label="Merchant Name"
            value={merchantAccount.merchant_name}
            disabled={true}
            inputClassName="bg-gray-50 dark:bg-gray-700"
            labelClassName="bg-white dark:bg-gray-800"
            onChange={() => {}}
          />

          <FloatingLabelSelect
            id="source_type"
            name="source_type"
            label="Adjustment Type *"
            value={formData.source_type}
            onChange={e => handleChange('source_type', e.target.value)}
            error={errors.source_type}
            disabled={isLoading}
            labelClassName="bg-white dark:bg-gray-800"
          >
            <option value="">Select Adjustment Type</option>
            {adjustmentTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FloatingLabelSelect>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelInput
              id="amount"
              name="amount"
              label="Amount *"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={e => handleChange('amount', e.target.value)}
              error={errors.amount}
              placeholder="Positive or negative"
              inputClassName="bg-transparent"
              labelClassName="bg-white dark:bg-gray-800"
            />
            <FloatingLabelInput
              id="currency_code"
              name="currency_code"
              label="Currency"
              value={merchantAccount.currency_code}
              disabled={true}
              inputClassName="bg-gray-50 dark:bg-gray-700"
              labelClassName="bg-white dark:bg-gray-800"
              onChange={() => {}}
            />
          </div>

          <FloatingLabelTextarea
            id="description"
            name="description"
            label="Description"
            value={formData.description}
            onChange={() => {}}
            error={errors.description}
            rows={3}
            placeholder="Enter description (optional)"
            textareaClassName="resize-none"
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
              disabled={isSubmitting || isLoading}
              className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMerchantAccountAdjustmentModal;
