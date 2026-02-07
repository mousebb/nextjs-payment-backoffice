'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { ACCESS_LOG_TYPE, CONFIG } from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  XCircleIcon,
  InformationCircleIcon,
  UserCircleIcon,
  CurrencyDollarIcon,
  CogIcon,
  TrashIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  ListBulletIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  CheckBadgeIcon,
  PlusIcon,
  PencilIcon,
  ArrowPathRoundedSquareIcon,
  XMarkIcon,
  UserIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import ToastNotify from './ToastNotify';
import CopyButton from './CopyButton';
import { authFetch, formatDate, recordAccessLog } from '@/lib/utils';
import AccessDenied from './AccessDenied';
import { WEB_ACTION_METHODS, ENUM_CONFIG } from '@/constants/config';
import AddFeeSettingModal from './AddFeeSettingModal';
import ConfirmationModal from './ConfirmationModal';
import LocalPagingList from './LocalPagingList';
import { ListColumn } from '../types/list';
import {
  MerchantData,
  MerchantAccount,
  MerchantFeeSetting,
  RouterData,
} from '@/types/merchant';
import ActionsDropdown, { ActionItem } from './ActionsDropdown';
import FeeHistoryModal from './FeeHistoryModal';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import EditMerchantAccountModal from './EditMerchantAccountModal';
import { formatDateByUser } from '@/lib/utils';
import { COLOR_BADGE_LIST } from '../constants/config';

interface MerchantDetailProps {
  merchantId: string;
  onBack: () => void;
}

const MerchantDetail: React.FC<MerchantDetailProps> = ({
  merchantId,
  onBack,
}) => {
  const { logout, user } = useAuth();
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null);
  const [merchantAccounts, setMerchantAccounts] = useState<
    MerchantAccount[] | null
  >(null);
  const [merchantFeeSettings, setMerchantFeeSettings] = useState<
    MerchantFeeSetting[] | null
  >(null);
  const [routerData, setRouterData] = useState<RouterData | null>(null);

  const [isLoadingMerchant, setIsLoadingMerchant] = useState(true);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingFees, setIsLoadingFees] = useState(true);

  const [errorMerchant, setErrorMerchant] = useState<string | null>(null);
  const [errorAccounts, setErrorAccounts] = useState<string | null>(null);
  const [errorFees, setErrorFees] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isAddFeeModalOpen, setAddFeeModalOpen] = useState(false);
  const [isDisableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [selectedFeeSetting, setSelectedFeeSetting] =
    useState<MerchantFeeSetting | null>(null);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerateSecretOpen, setRegenerateSecretOpen] = useState(false);
  const [isRegenerateSecretConfirmOpen, setRegenerateSecretConfirmOpen] =
    useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditNameOpen, setEditNameOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [routers, setRouters] = useState<any[]>([]);
  const [isLoadingRouters, setIsLoadingRouters] = useState(false);
  const [isAddAccountModalOpen, setAddAccountModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('bank_name');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.ASC);
  const [currentPage, setCurrentPage] = useState(1);

  const [copiedId, setCopiedId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(
        sortOrder === ENUM_CONFIG.ASC ? ENUM_CONFIG.DESC : ENUM_CONFIG.ASC
      );
    } else {
      setSortColumn(column);
      setSortOrder(ENUM_CONFIG.ASC);
    }
  };

  const fetchFeeSettings = async () => {
    setIsLoadingFees(true);
    setErrorFees(null);
    try {
      // Fetch Merchant Fee Settings
      const resFees = await authFetch(
        CONFIG.API_BASE_URL +
          API_ROUTES.MERCHANT_FEE_SETTINGS +
          '?enabled=true&merchant_id=' +
          merchantId
      );
      if (!resFees) {
        logout();
        return;
      }
      if (!resFees.ok) {
        const errorData = await resFees
          .json()
          .catch(() => ({ message: `HTTP error ${resFees.status}` }));
        throw new Error(
          errorData.message ||
            `Failed to fetch merchant fee settings: ${resFees.statusText}`
        );
      }
      const dataFees = await resFees.json();
      setMerchantFeeSettings(
        Array.isArray(dataFees.data)
          ? dataFees.data
          : Array.isArray(dataFees)
            ? dataFees
            : []
      );
    } catch (err: any) {
      setErrorFees(err.message);
    } finally {
      setIsLoadingFees(false);
    }
  };

  const fetchMerchantAccounts = async () => {
    setIsLoadingAccounts(true);
    setErrorAccounts(null);
    try {
      // Fetch Merchant Accounts
      const resAccounts = await authFetch(
        CONFIG.API_BASE_URL +
          API_ROUTES.MERCHANT_ACCOUNTS +
          '?merchant_id=' +
          merchantId
      );
      if (!resAccounts) {
        logout();
        return;
      }
      if (!resAccounts.ok) {
        const errorData = await resAccounts
          .json()
          .catch(() => ({ message: `HTTP error ${resAccounts.status}` }));
        throw new Error(
          errorData.message ||
            `Failed to fetch merchant accounts: ${resAccounts.statusText}`
        );
      }
      const dataAccounts = await resAccounts.json();
      setMerchantAccounts(
        Array.isArray(dataAccounts.data)
          ? dataAccounts.data
          : Array.isArray(dataAccounts)
            ? dataAccounts
            : []
      );
    } catch (err: any) {
      setErrorAccounts(err.message);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (!merchantId) {
      setIsLoadingMerchant(false);
      setIsLoadingAccounts(false);
      setIsLoadingFees(false);
      return;
    }

    const fetchAllData = async () => {
      setIsLoadingMerchant(true);
      setIsLoadingAccounts(true);
      fetchFeeSettings();
      fetchMerchantAccounts();
      setErrorMerchant(null);
      setErrorAccounts(null);

      try {
        // Fetch Merchant Details
        const resMerchant = await authFetch(
          CONFIG.API_BASE_URL +
            API_ROUTES.MERCHANT_DETAILS.replace(':id', merchantId)
        );
        if (!resMerchant) {
          logout();
          return;
        }
        if (!resMerchant.ok) {
          const errorData = await resMerchant
            .json()
            .catch(() => ({ message: `HTTP error ${resMerchant.status}` }));
          throw new Error(
            errorData.message ||
              `Failed to fetch merchant details: ${resMerchant.statusText}`
          );
        }
        const dataMerchant = await resMerchant.json();
        setMerchantData(dataMerchant.data || dataMerchant);
      } catch (err: any) {
        setErrorMerchant(err.message);
      } finally {
        setIsLoadingMerchant(false);
      }
    };

    fetchAllData();
  }, [merchantId, logout]);

  useEffect(() => {
    if (merchantData?.router_id && routers.length > 0) {
      // Find the router from the routers list instead of making a separate API call
      const selectedRouter = routers.find(r => r.id === merchantData.router_id);
      if (selectedRouter) {
        setRouterData(selectedRouter);
      } else {
        setRouterData(null);
      }
    } else {
      setRouterData(null);
    }
  }, [merchantData?.router_id, routers]);

  useEffect(() => {
    if (isEditNameOpen && merchantData?.name) {
      setEditNameValue(merchantData.name);
    }
  }, [isEditNameOpen, merchantData?.name]);

  useEffect(() => {
    fetchRouters();
  }, []);

  const fetchRouters = async () => {
    setIsLoadingRouters(true);
    try {
      const res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.ROUTERS}`
      );
      if (res && res.ok) {
        const data = await res.json();
        console.log('Routers API response:', data);

        // Handle different possible data structures
        let routersData = [];
        if (Array.isArray(data.data)) {
          routersData = data.data;
        } else if (Array.isArray(data)) {
          routersData = data;
        } else if (data && typeof data === 'object') {
          routersData = Array.isArray(data.routers) ? data.routers : [];
        }

        console.log('Processed routers data:', routersData);
        setRouters(routersData);
      } else {
        const errorText = res ? await res.text() : 'No response';
        console.error('API error response:', errorText);
        throw new Error(
          `Failed to fetch routers: ${res?.status || 'unknown'} ${res?.statusText || 'unknown error'}`
        );
      }
    } catch (err: any) {
      console.error('Error fetching routers:', err);
      ToastNotify.error(err.message || 'Failed to fetch routers');
    } finally {
      setIsLoadingRouters(false);
    }
  };

  // 工具函数：只显示前4后4，中间5个*
  const maskSecretKey = (key: string) => {
    if (!key || key.length <= 8) return key;
    return key.slice(0, 4) + '**************************' + key.slice(-4);
  };

  // 通用商户信息更新方法
  const updateMerchant = async (
    updateBody: Record<string, any>,
    action: string
  ) => {
    setIsSaving(true);
    let res: Response | null = null;
    let reqBody = JSON.stringify(updateBody);
    const startTime = Date.now();
    try {
      res = await authFetch(
        CONFIG.API_BASE_URL +
          API_ROUTES.MERCHANT_DETAILS.replace(':id', merchantId),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: reqBody,
        }
      );

      if (!res) {
        logout();
        return;
      }
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: `HTTP error ${res?.status}` }));
        throw new Error(
          errorData.message || `Failed to update merchant: ${res?.statusText}`
        );
      }
      const data = await res.json();
      // 根据字段更新本地 state
      if (updateBody.hasOwnProperty('enabled')) {
        setMerchantData(prev =>
          prev ? { ...prev, enabled: updateBody.enabled } : null
        );
        ToastNotify.success('Saved');
      }
      if (updateBody.hasOwnProperty('name')) {
        setMerchantData(prev =>
          prev ? { ...prev, name: updateBody.name } : null
        );
        setEditNameOpen(false);
        setEditNameValue('');
        ToastNotify.success('Merchant name updated successfully');
      }
      if (updateBody.hasOwnProperty('router_id')) {
        setMerchantData(prev =>
          prev ? { ...prev, router_id: updateBody.router_id } : null
        );
        // 可选：setRouterData
        ToastNotify.success('Router updated successfully');
      }
      return data;
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to update merchant');
      throw e;
    } finally {
      setIsSaving(false);
      await recordAccessLog({
        path: '/merchant-detail',
        type: ACCESS_LOG_TYPE.WEB,
        user_id: user?.id || '',
        ip_address: user?.ip_address || '',
        method: action,
        request: JSON.stringify({
          name: updateBody.name,
          id: merchantId,
          request: reqBody,
        }),
        response: res ? JSON.stringify(res) : '',
        status_code: res?.status || 500,
        duration_ms: Date.now() - startTime,
      });
    }
  };

  // 修改 handleToggleEnabled
  const handleToggleEnabled = async () => {
    if (!merchantData) return;
    try {
      await updateMerchant(
        { enabled: !merchantData.enabled },
        WEB_ACTION_METHODS.UPDATE
      );
    } catch {}
  };

  // 修改 handleEditName
  const handleEditName = async () => {
    if (!editNameValue.trim()) {
      ToastNotify.error('Merchant name cannot be empty');
      return;
    }
    setIsEditingName(true);
    try {
      await updateMerchant(
        { name: editNameValue.trim() },
        WEB_ACTION_METHODS.UPDATE
      );
    } catch {}
    setIsEditingName(false);
  };

  // 修改 handleRouterChange
  const handleRouterChange = async (routerId: string) => {
    if (routerId === merchantData?.router_id) return;
    try {
      await updateMerchant(
        { router_id: routerId || null },
        WEB_ACTION_METHODS.UPDATE
      );
      // 可选：setRouterData 逻辑
      if (routerId) {
        const selectedRouter = routers.find(r => r.id === routerId);
        if (selectedRouter) {
          setRouterData(selectedRouter);
        }
      } else {
        setRouterData(null);
      }
    } catch {}
  };

  if (isLoadingMerchant && isLoadingAccounts && isLoadingFees) {
    // Show main loader only when all are initially loading
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <ArrowPathIcon className="h-12 w-12 animate-spin text-sky-600 dark:text-sky-400 mb-4" />
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Loading merchant details...
        </p>
      </div>
    );
  }

  if (errorMerchant && !merchantData) {
    return (
      <AccessDenied
        onBack={onBack}
        title="Error Loading Merchant Data"
        message={errorMerchant}
        buttonText="Back to Merchants"
      />
    );
  }

  if (!isLoadingMerchant && !merchantData) {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <InformationCircleIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-6">
          Merchant data not found.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors flex items-center"
        >
          {' '}
          <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back to List{' '}
        </button>
      </div>
    );
  }

  const primaryAccount = merchantAccounts
    ? merchantAccounts.find(account => account.is_default)
    : null;
  const otherAccounts = merchantAccounts
    ? merchantAccounts.filter(account => !account.is_default)
    : [];
  const primaryFeeSetting =
    merchantFeeSettings && merchantFeeSettings.length > 0
      ? merchantFeeSettings[0]
      : null;

  const MerchantStatusDisplayBadge = ({ enabled }: { enabled: boolean }) => {
    const isActive = enabled;
    const bgColor = isActive
      ? 'bg-green-100 dark:bg-green-700'
      : 'bg-red-100 dark:bg-red-700';
    const textColor = isActive
      ? 'text-green-700 dark:text-green-100'
      : 'text-red-700 dark:text-red-100';
    const Icon = isActive ? CheckCircleIcon : XCircleIcon; // Use outline icons
    const text = isActive ? 'Active' : 'Inactive';

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${bgColor} ${textColor}`}
      >
        <Icon
          className={`h-4 w-4 mr-1.5 ${isActive ? 'text-green-500 dark:text-green-300' : 'text-red-500 dark:text-red-300'}`}
        />
        {text}
      </span>
    );
  };

  const handleDisableClick = (fee: MerchantFeeSetting) => {
    setSelectedFeeSetting(fee);
    setDisableConfirmOpen(true);
  };

  const handleDisableConfirm = async () => {
    if (!selectedFeeSetting) return;
    const startTime = Date.now();
    let res: Response | null = null;
    try {
      res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.MERCHANT_FEE_SETTINGS}/${selectedFeeSetting.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ enabled: false }),
        }
      );

      if (res && res.ok) {
        ToastNotify.success('Fee setting disabled successfully!');
        fetchFeeSettings();
      } else {
        throw new Error('Failed to disable fee setting');
      }
    } catch (error: any) {
      ToastNotify.error(error.message || 'Failed to disable fee setting');
    } finally {
      await recordAccessLog({
        path: '/merchant-detail/disable-fee-setting',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.UPDATE,
        user_id: user?.id || '',
        ip_address: user?.ip_address || '',
        request: JSON.stringify(selectedFeeSetting.id),
        response: JSON.stringify(res),
        status_code: res?.status || 500,
        duration_ms: Date.now() - startTime,
      });
      setDisableConfirmOpen(false);
      setSelectedFeeSetting(null);
    }
  };

  const handleDeleteClick = () => {
    // 检查是否有关联数据
    const hasFeeSettings =
      merchantFeeSettings && merchantFeeSettings.length > 0;
    const hasAccounts = merchantAccounts && merchantAccounts.length > 0;

    if (hasFeeSettings || hasAccounts) {
      const issues = [];
      if (hasFeeSettings) issues.push('fee settings');
      if (hasAccounts) issues.push('accounts');

      ToastNotify.error(
        `Cannot delete merchant. Please remove all ${issues.join(' and ')} first.`
      );
      return;
    }

    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!merchantData) return;
    const startTime = Date.now();
    let res: Response | null = null;
    setIsDeleting(true);
    try {
      res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.MERCHANT_DETAILS.replace(':id', merchantData.id)}`,
        {
          method: 'DELETE',
        }
      );

      if (res && res.ok) {
        ToastNotify.success('Merchant deleted successfully!');
        setDeleteConfirmOpen(false);
        onBack(); // 返回商户列表
      } else {
        const errorData = await res?.json();
        throw new Error(errorData?.message || 'Failed to delete merchant');
      }
    } catch (error: any) {
      ToastNotify.error(error.message || 'Failed to delete merchant');
    } finally {
      await recordAccessLog({
        path: '/merchant-detail',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id || '',
        ip_address: user?.ip_address || '',
        request: JSON.stringify({
          name: merchantData.name,
          id: merchantData.id,
        }),
        response: JSON.stringify(res),
        status_code: res?.status || 500,
        duration_ms: Date.now() - startTime,
      });
      setIsDeleting(false);
    }
  };

  const handleRegenerateSecret = async () => {
    setRegenerateSecretConfirmOpen(false);
    setIsRegenerating(true);
    const startTime = Date.now();
    let res: Response | null = null;
    try {
      res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.MERCHANT_REGENERATE_SECRET_KEY.replace(':id', merchantId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ merchant_id: merchantId }),
        }
      );

      if (res && res.ok) {
        const data = await res.json();
        console.log('Regenerate secret response:', data);

        // Update the merchant data with new secret key
        if (data && data.secret_key) {
          setMerchantData(prev =>
            prev ? { ...prev, secret_key: data.secret_key } : null
          );
        }

        setRegenerateSecretOpen(false);
        ToastNotify.success('Secret key regenerated successfully');
      } else {
        const errorText = res ? await res.text() : 'No response';
        console.error('API error response:', errorText);
        throw new Error(
          `Failed to regenerate secret key: ${res?.status || 'unknown'} ${res?.statusText || 'unknown error'}`
        );
      }
    } catch (err: any) {
      console.error('Error regenerating secret key:', err);
      ToastNotify.error(err.message || 'Failed to regenerate secret key');
    } finally {
      await recordAccessLog({
        path: '/merchant-detail/regenerate-secret',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.UPDATE,
        user_id: user?.id || '',
        ip_address: user?.ip_address || '',
        request: JSON.stringify(merchantId),
        response: JSON.stringify(res),
        status_code: res?.status || 500,
        duration_ms: Date.now() - startTime,
      });
      setIsRegenerating(false);
    }
  };

  const handleClose = () => {
    setEditNameOpen(false);
    setEditNameValue('');
  };

  const listActions: ActionItem[] = [
    {
      label: 'Fee & Comm History',
      icon: <ListBulletIcon />,
      onClick: () => setHistoryModalOpen(true),
    },
    {
      label: 'Verify Fee Settings',
      icon: <CheckBadgeIcon />,
      onClick: () => alert('Verify Fee Settings clicked'),
    },
  ];

  const feeSettingsColumns: ListColumn<MerchantFeeSetting>[] = [
    { key: 'bank_name', title: 'Bank', render: value => value || '-' },
    { key: 'type', title: 'Type', render: value => value || '-' },
    { key: 'method_name', title: 'Method', render: value => value || '-' },
    { key: 'currency_code', title: 'Currency', render: value => value || '-' },
    {
      key: 'min_amount',
      title: 'Min Amt',
      align: 'right',
      render: value => (value ? Number(value).toFixed(2) : '-'),
    },
    {
      key: 'max_amount',
      title: 'Max Amt',
      align: 'right',
      render: value => (value ? Number(value).toFixed(2) : '-'),
    },
    {
      key: 'percentage',
      title: '%',
      align: 'right',
      render: value => (value ? (Number(value) * 100).toFixed(2) + '%' : '-'),
    },
    {
      key: 'fixed_fee',
      title: 'Fixed Fee',
      align: 'right',
      render: value => (value ? Number(value).toFixed(2) : '-'),
    },
    {
      key: 'min_fee',
      title: 'Min Fee',
      align: 'right',
      render: value => (value ? Number(value).toFixed(2) : '-'),
    },
    {
      key: 'max_fee',
      title: 'Max Fee',
      align: 'right',
      render: value => (value ? Number(value).toFixed(2) : '-'),
    },
    {
      key: 'agent_username',
      title: 'Agent',
      render: value => (value ? value : '-'),
    },
    {
      key: 'included_commission_percentage',
      title: 'Comm %',
      align: 'right',
      render: value => (value ? (Number(value) * 100).toFixed(2) + '%' : '-'),
    },
    {
      key: 'included_commission_fixed',
      title: 'Comm Fixed',
      align: 'right',
      render: value => (value ? Number(value).toFixed(2) : '-'),
    },
    {
      key: 'created_at',
      title: 'Created At',
      render: value =>
        value ? formatDateByUser(value, user?.metadata?.data_time_format) : '-',
    },
    {
      key: 'actions',
      title: 'Action',
      align: 'center',
      render: (_, fee) => (
        <div className="pr-5">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-md hover:text-red-700 dark:hover:text-red-100 hover:bg-red-100 dark:hover:bg-red-700 mx-auto"
            title="Disable"
            onClick={() => handleDisableClick(fee)}
          >
            <NoSymbolIcon className="h-4 w-4 " />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {/* <button
            onClick={onBack}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 focus:outline-none"
            aria-label="Back to merchants"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button> */}
          <div className="flex items-center md:space-x-2 md:pl-2">
            <h1 className="text-2xl text-gray-500 dark:text-gray-400">
              {merchantData?.name}
            </h1>
          </div>
        </div>
      </div>

      {/* 顶部三卡片并排 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Merchant Info Card */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center relative">
          {/* Edit Icon */}
          <UserCircleIcon className="h-28 w-28 text-gray-300 dark:text-gray-600 mb-4" />
          <div className="flex items-center justify-center space-x-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center">
              {merchantData?.name}
            </h2>
            <button
              onClick={() => setEditNameOpen(true)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Edit Merchant Name"
            >
              <PencilIcon className="h-4 w-4 text-gray-400 hover:text-sky-600" />
            </button>
          </div>
          <div className="w-lg mt-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ID: {merchantData?.id}
              </span>
              {merchantData?.id && (
                <CopyButton
                  value={merchantData.id}
                  copied={copiedId}
                  onCopied={() => {
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  title="Copy ID"
                />
              )}
            </div>
            <div className="flex items-center mt-1.5 space-x-1.5">
              {merchantData?.secret_key && (
                <>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Secret Key: {maskSecretKey(merchantData.secret_key!)}
                  </span>
                  <CopyButton
                    value={merchantData.secret_key ?? ''}
                    copied={copiedSecret}
                    onCopied={() => {
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }}
                    title="Copy Secret Key"
                  />
                  <button
                    onClick={() => setRegenerateSecretConfirmOpen(true)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Regenerate Secret Key"
                  >
                    <ArrowPathRoundedSquareIcon className="h-4 w-4 text-gray-400 hover:text-sky-600" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center mt-2 space-x-3">
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${merchantData?.enabled ? 'bg-sky-500' : 'bg-gray-300'}`}
              onClick={handleToggleEnabled}
              disabled={isSaving}
              aria-checked={merchantData?.enabled}
              role="switch"
            >
              <span className="sr-only">Toggle Active</span>
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${merchantData?.enabled ? 'translate-x-5' : 'translate-x-1'}`}
              />
            </button>
            <span
              className={`text-sm font-medium ${merchantData?.enabled ? 'text-sky-600' : 'text-gray-400'}`}
            >
              {merchantData?.enabled ? 'Active' : 'Inactive'}
            </span>
            {/* <button
              onClick={handleLinkClick}
              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              title="Link User"
            >
              <LinkIcon className="h-5 w-5 text-red-500 hover:text-red-600" />
            </button> */}
            <button
              onClick={handleDeleteClick}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors"
              title="Delete Merchant"
            >
              <TrashIcon className="h-5 w-5 text-gray-500 hover:text-gray-600" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Registered on:{' '}
            {formatDateByUser(
              merchantData?.created_at || '',
              user?.metadata?.data_time_format || ''
            )}
          </p>
        </div>

        {/* Router Card */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative">
          <div className="flex items-center mb-4">
            <div className="p-2.5 bg-yellow-100 dark:bg-yellow-700/50 rounded-lg mr-4">
              <GlobeAltIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Router
            </h3>
          </div>

          {isLoadingRouters ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              Loading routers...
            </p>
          ) : (
            <>
              <div className="mb-2">
                <FloatingLabelSelect
                  id="routerSelect"
                  name="routerSelect"
                  label="Select Router"
                  value={merchantData?.router_id || ''}
                  onChange={e => handleRouterChange(e.target.value)}
                  selectClassName="bg-transparent"
                  labelClassName="bg-white dark:bg-gray-800"
                >
                  <option value="">No Router</option>
                  {routers.map(router => (
                    <option key={router.id} value={router.id}>
                      {router.name}
                    </option>
                  ))}
                </FloatingLabelSelect>
              </div>

              {routerData && (
                <div className="px-3">
                  {routerData.banks && routerData.banks.length > 0 ? (
                    routerData.banks
                      .sort((a, b) => a.priority - b.priority)
                      .map(bank => {
                        let currenciesDisplay: React.ReactNode = null;
                        if (
                          Array.isArray(bank.currencies) &&
                          bank.currencies.length > 0
                        ) {
                          currenciesDisplay = (
                            <div className="flex flex-wrap gap-1">
                              {bank.currencies.length > 3 && (
                                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-300 text-xs dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400 border-none">
                                  +{bank.currencies.length - 3}
                                </span>
                              )}
                              {bank.currencies.slice(0, 3).map((curr: any) => (
                                <span
                                  key={curr.currency_code}
                                  className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 text-xs dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400 border-none"
                                >
                                  {curr.currency_code}
                                </span>
                              ))}
                            </div>
                          );
                        } else {
                          currenciesDisplay = (
                            <span className="text-gray-400 text-xs mr-2">
                              -
                            </span>
                          );
                        }

                        return (
                          <div
                            key={bank.bank_id}
                            className="text-sm text-gray-700 dark:text-gray-200 py-1 flex items-center justify-between"
                          >
                            <span title={bank.bank_name}>
                              {bank.bank_name.length > 20
                                ? bank.bank_name.slice(0, 20) + '...'
                                : bank.bank_name}
                            </span>
                            {currenciesDisplay && (
                              <span
                                className="text-xs text-gray-500 dark:text-gray-400"
                                title={bank?.currencies
                                  ?.map((curr: any) => curr.currency_code)
                                  .join(', ')}
                              >
                                {currenciesDisplay}
                              </span>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-xs text-gray-400">No banks</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Account Balance Card */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative">
          {/* Edit Icon */}
          <button
            onClick={() => setAddAccountModalOpen(true)}
            className="absolute top-3 right-3 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Add Account"
          >
            <PlusIcon className="h-5 w-5 text-gray-400 hover:text-sky-600" />
          </button>
          <div className="flex items-center mb-4">
            <div className="p-2.5 bg-sky-100 dark:bg-sky-700/50 rounded-lg mr-4">
              <CurrencyDollarIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Account Balance
            </h3>
          </div>
          {isLoadingAccounts && (
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              Loading balance...
            </p>
          )}
          {errorAccounts && (
            <p className="text-sm text-red-500 dark:text-red-400">
              Error: {errorAccounts}
            </p>
          )}
          {!isLoadingAccounts && !errorAccounts && primaryAccount && (
            <>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {primaryAccount.available_balance || primaryAccount.balance}{' '}
                {primaryAccount.currency_code}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                Reserved: {primaryAccount.reserved_balance || 0}{' '}
                {primaryAccount.currency_code}
              </p>
              {primaryAccount.bank_name && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {primaryAccount.bank_name}{' '}
                  {primaryAccount.account_number_last4
                    ? `•••• ${primaryAccount.account_number_last4}`
                    : ''}
                </p>
              )}
            </>
          )}
          {!isLoadingAccounts && !errorAccounts && !primaryAccount && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No account data available.
            </p>
          )}
          {!isLoadingAccounts && !errorAccounts && otherAccounts.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Other Accounts
              </h4>
              {otherAccounts.map(account => (
                <div
                  key={account.id}
                  className="flex items-center justify-between text-sm py-1 border-t border-gray-200 dark:border-gray-700"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    {account.balance}
                    <span className="text-xs text-gray-400 ml-2">
                      Res. {account.reserved_balance || 0}
                    </span>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {account.currency_code}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Icon */}

      <LocalPagingList
        titleIcon={
          <div className="p-2.5 bg-green-100 dark:bg-green-700/50 rounded-lg mr-4">
            <CogIcon className="h-6 w-6 text-green-600 dark:text-green-300" />
          </div>
        }
        listTitle="Fee & Commission Settings"
        searchPlaceholder="Search by Bank, Type, Method, Currency..."
        columns={feeSettingsColumns}
        rawData={merchantFeeSettings || []}
        isLoading={isLoadingFees}
        addButton={{
          label: 'Add Fee Setting',
          onClick: () => setAddFeeModalOpen(true),
        }}
        actions={listActions as any}
        error={errorFees}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSort={handleSort}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {merchantData && (
        <AddFeeSettingModal
          merchantId={merchantData.id}
          routerId={merchantData.router_id || ''}
          isOpen={isAddFeeModalOpen}
          onClose={() => setAddFeeModalOpen(false)}
          onSuccess={() => {
            setAddFeeModalOpen(false);
            fetchFeeSettings();
          }}
        />
      )}
      <ConfirmationModal
        isOpen={isDisableConfirmOpen}
        onClose={() => setDisableConfirmOpen(false)}
        onConfirm={handleDisableConfirm}
        title="Disable Fee Setting"
        message="Are you sure you want to disable this fee setting? This action cannot be undone, and you will have to add a new one to enable it again."
        confirmText="Disable"
      />
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Merchant"
        message={`Are you sure you want to delete merchant "${merchantData?.name}"? This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
      />
      <ConfirmationModal
        isOpen={isRegenerateSecretOpen}
        onClose={() => setRegenerateSecretOpen(false)}
        onConfirm={handleRegenerateSecret}
        title="Regenerate Secret Key"
        message="Are you sure you want to regenerate the secret key? This action cannot be undone."
        confirmText={isRegenerating ? 'Regenerating...' : 'Regenerate'}
      />
      {/* 只保留带有二次确认警告的弹窗 */}
      <ConfirmationModal
        isOpen={isRegenerateSecretConfirmOpen}
        onClose={() => setRegenerateSecretConfirmOpen(false)}
        onConfirm={handleRegenerateSecret}
        title="Regenerate Secret Key"
        message="Warning: Regenerating the secret key will immediately invalidate the old key and will cause the merchant's integration to fail until the new key is applied. Are you sure you want to continue?"
        confirmText={isRegenerating ? 'Regenerating...' : 'Regenerate'}
      />
      <FeeHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        merchantId={merchantId}
        user={user!}
      />

      {/* Edit Merchant Name Modal */}
      {isEditNameOpen && (
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
                Edit Merchant Name
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <FloatingLabelInput
                id="merchantName"
                name="merchantName"
                label="Merchant Name"
                value={editNameValue}
                onChange={e => setEditNameValue(e.target.value)}
                inputClassName="bg-transparent"
                labelClassName="bg-white dark:bg-gray-800"
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center space-x-3">
              <button
                onClick={handleClose}
                className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                disabled={isEditingName}
              >
                Cancel
              </button>
              <button
                onClick={handleEditName}
                disabled={isEditingName || !editNameValue.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
              >
                {isEditingName ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      <EditMerchantAccountModal
        isOpen={isAddAccountModalOpen}
        onClose={() => setAddAccountModalOpen(false)}
        onSuccess={() => {
          setAddAccountModalOpen(false);
          fetchMerchantAccounts();
        }}
        merchantId={merchantId}
      />
    </div>
  );
};

export default MerchantDetail;
