import React, { useState, useEffect } from 'react';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import FloatingLabelTextarea from './FloatingLabelTextarea';
import FloatingLabelCheckboxList from './FloatingLabelCheckboxList';
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
import { useAuth } from './AuthContext';

interface ApiBank {
  id: string;
  gateway_id: string;
  gateway_name: string;
  router_id?: string | null;
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

interface EditBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ApiBank | null;
}

const EditBankModal: React.FC<EditBankModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    gateway_id: '',
    router_id: '',
    metadata: '',
    enabled: true,
    methods: [] as string[],
    currencies: [] as string[],
  });
  const [gateways, setGateways] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [currenciesDict, setCurrenciesDict] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [initialGatewayId, setInitialGatewayId] = useState('');
  const [initialMethods, setInitialMethods] = useState<string[]>([]);
  const [initialCurrencies, setInitialCurrencies] = useState<string[]>([]);
  const { user } = useAuth();
  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
      if (editData) {
        setFormData({
          name: editData.name,
          gateway_id: editData.gateway_id,
          router_id: editData.router_id || '', // 从 editData 中获取 router_id
          metadata: editData.metadata
            ? JSON.stringify(editData.metadata, null, 2)
            : '',
          enabled: editData.enabled,
          methods: editData.methods
            ? editData.methods.map(m => m.method_id)
            : [],
          currencies: editData.currencies || [],
        });
        setInitialGatewayId(editData.gateway_id);
        setInitialMethods(
          editData.methods ? editData.methods.map(m => m.method_id) : []
        );
        setInitialCurrencies(editData.currencies || []);
      } else {
        setFormData({
          name: '',
          gateway_id: '',
          router_id: '',
          metadata: '',
          enabled: true,
          methods: [],
          currencies: [],
        });
        setInitialGatewayId('');
        setInitialMethods([]);
        setInitialCurrencies([]);
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  // 监听 gateway_id 变化，切回初始 gateway 时恢复初始选项，否则只做过滤
  useEffect(() => {
    if (!formData.gateway_id) return;
    const gw = gateways.find(g => g.id === formData.gateway_id);
    if (!gw) return;
    // methods
    const allowedMethodIds = (gw.methods || []).map((m: any) => m.id);
    // currencies
    const allowedCurrencyIds = (gw.currencies || []).map((c: any) =>
      typeof c === 'string' ? c : c.code
    );

    if (formData.gateway_id === initialGatewayId) {
      setFormData(prev => ({
        ...prev,
        methods: initialMethods.filter(m => allowedMethodIds.includes(m)),
        currencies: initialCurrencies.filter(c =>
          allowedCurrencyIds.includes(c)
        ),
      }));
    } else {
      if (formData.methods.some(m => !allowedMethodIds.includes(m))) {
        setFormData(prev => ({
          ...prev,
          methods: prev.methods.filter(m => allowedMethodIds.includes(m)),
        }));
      }
      if (formData.currencies.some(c => !allowedCurrencyIds.includes(c))) {
        setFormData(prev => ({
          ...prev,
          currencies: prev.currencies.filter(c =>
            allowedCurrencyIds.includes(c)
          ),
        }));
      }
    }
  }, [
    formData.gateway_id,
    gateways,
    initialGatewayId,
    initialMethods,
    initialCurrencies,
  ]);

  const fetchDropdownData = async () => {
    setIsLoading(true);
    try {
      const [gatewaysRes, routersRes, methodsRes, currenciesRes] =
        await Promise.all([
          // 获取实时网关数据
          authFetch(CONFIG.API_BASE_URL + API_ROUTES.GATEWAYS + '?enabled=true'),
          // 获取实时路由器数据
          authFetch(CONFIG.API_BASE_URL + API_ROUTES.ROUTERS + '?enabled=true'),
          getBasicData(
            'transaction_methods',
            CONFIG.API_BASE_URL +
              API_ROUTES.TRANSACTION_METHODS +
              '?enabled=true'
          ),
          getBasicData(
            'currencies',
            CONFIG.API_BASE_URL + API_ROUTES.CURRENCIES
          ),
        ]);

      // 处理网关数据
      if (gatewaysRes && gatewaysRes.ok) {
        const gatewaysData = await gatewaysRes.json();
        setGateways(Array.isArray(gatewaysData) ? gatewaysData : []);
      } else {
        setGateways([]);
        console.error('Failed to fetch gateways');
      }

      // 处理路由器数据
      if (routersRes && routersRes.ok) {
        const routersData = await routersRes.json();
        setRouters(Array.isArray(routersData) ? routersData : []);
      } else {
        setRouters([]);
        console.error('Failed to fetch routers');
      }

      setMethods(methodsRes || []);
      setCurrenciesDict(currenciesRes || []);
    } catch (e) {
      console.error('Failed to fetch dropdown data', e);
      ToastNotify.error('Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  };

  const validate = () => {
    const errs: any = {};
    if (!formData.name.trim()) errs.name = 'Bank name is required';
    if (!formData.gateway_id) errs.gateway_id = 'Gateway is required';

    // Validate metadata JSON
    if (formData.metadata.trim()) {
      try {
        JSON.parse(formData.metadata);
      } catch (e) {
        errs.metadata = 'Invalid JSON format';
      }
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
    if (!validate()) return;
    setIsSubmitting(true);
    const startTime = Date.now();
    let res: Response | null = null;
    let submissionData: any = {};
    try {
      submissionData = {
        ...formData,
        name: formData.name.trim(),
        metadata: formData.metadata.trim()
          ? JSON.parse(formData.metadata)
          : null,
        methods: formData.methods.map(method_id => ({ method_id })),
        router_id: formData.router_id || null,
      };

      if (editData) {
        // Edit mode - PUT request
        res = await authFetch(
          `${CONFIG.API_BASE_URL + API_ROUTES.BANKS}/${editData.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          }
        );
      } else {
        // Add mode - POST request
        res = await authFetch(CONFIG.API_BASE_URL + API_ROUTES.BANKS, {
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
        path: `/banks`,
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
      gateway_id: '',
      router_id: '',
      metadata: '',
      enabled: true,
      methods: [],
      currencies: [],
    });
    setErrors({});
    onClose();
  };

  // methods 选项只显示当前 gateway 拥有的 methods
  const currentGateway = gateways.find(g => g.id === formData.gateway_id);
  const availableMethods = currentGateway?.methods || [];
  // currencies 选项只显示当前 gateway 拥有的 currencies，label 用 code-name 对照表
  const availableCurrencyCodes = currentGateway?.currencies || [];

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
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {editData ? 'Edit Bank' : 'Add Bank'}
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
            label="Bank Name *"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            error={errors.name}
            inputClassName="bg-transparent"
            labelClassName="bg-white dark:bg-gray-800"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelSelect
              id="gateway_id"
              name="gateway_id"
              label="Gateway *"
              value={formData.gateway_id}
              onChange={e => handleChange('gateway_id', e.target.value)}
              error={errors.gateway_id}
              disabled={isLoading}
            >
              <option value="">Select Gateway</option>
              {gateways.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </FloatingLabelSelect>

            <FloatingLabelSelect
              id="router_id"
              name="router_id"
              label="Router"
              value={formData.router_id}
              onChange={e => handleChange('router_id', e.target.value)}
              error={errors.router_id}
              disabled={isLoading}
            >
              <option value="">Select Router (Optional)</option>
              {routers.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </FloatingLabelSelect>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelCheckboxList
              label="Methods"
              options={availableMethods.map((m: any) => ({
                id: m.id,
                name: m.name + ' (' + m.type + ')',
              }))}
              selectedValues={formData.methods}
              onChange={(value, checked) => {
                const newMethods = checked
                  ? [...formData.methods, value]
                  : formData.methods.filter(m => m !== value);
                handleChange('methods', newMethods);
              }}
              error={errors.methods}
              disabled={isLoading}
              maxHeight="h-32"
              labelClassName="bg-white dark:bg-gray-800"
            />

            <FloatingLabelCheckboxList
              label="Currencies"
              options={
                formData.gateway_id
                  ? availableCurrencyCodes.map((code: string) => {
                      const found = currenciesDict.find(
                        (c: any) => c.code === code
                      );
                      return {
                        id: code,
                        name: found ? `${code} - ${found.name}` : code,
                      };
                    })
                  : []
              }
              emptyMessage={
                formData.gateway_id
                  ? 'No currencies available'
                  : 'Please select a gateway first'
              }
              selectedValues={formData.currencies}
              onChange={(value, checked) => {
                const newCurrencies = checked
                  ? [...formData.currencies, value]
                  : formData.currencies.filter(c => c !== value);
                handleChange('currencies', newCurrencies);
              }}
              error={errors.currencies}
              disabled={isLoading}
              maxHeight="h-32"
              labelClassName="bg-white dark:bg-gray-800"
            />
          </div>

          <FloatingLabelTextarea
            id="metadata"
            name="metadata"
            label="Metadata (JSON)"
            value={formData.metadata}
            onChange={e => handleChange('metadata', e.target.value)}
            error={errors.metadata}
            rows={4}
            placeholder='{"key": "value"}'
            textareaClassName="font-mono text-sm resize-none h-32"
            labelClassName="bg-white dark:bg-gray-800"
            alwaysFloatLabel
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

export default EditBankModal;
