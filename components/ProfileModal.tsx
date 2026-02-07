import React, { useEffect, useState } from 'react';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  DATE_TIME_FORMATS,
  WEB_ACTION_METHODS,
} from '@/constants/config';
import { API_ROUTES } from '@/constants/apiRoutes';
import { authFetch, recordAccessLog, maskSensitiveFields } from '@/lib/utils';
import ToastNotify from './ToastNotify';
import {
  XMarkIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  CheckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from './AuthContext';
import CopyButton from './CopyButton';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface TwoFactorData {
  secret: string;
  qrCode: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    username: '',
    password: '',
    email: '',
    data_time_format: DATE_TIME_FORMATS[0],
    is_2fa_enabled: false,
    two_factor_secret: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [twoFactorData, setTwoFactorData] = useState<TwoFactorData | null>(
    null
  );
  const [generating2FA, setGenerating2FA] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setTwoFactorData(null);
      setIsVerified(true);
      setVerificationToken('');
      setVerificationError(null);
      fetchUser();
    }
    // eslint-disable-next-line
  }, [isOpen]);

  const fetchUser = async () => {
    setFetching(true);
    setErrors({});
    try {
      const res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.USERS + '/' + user?.id
      );
      if (res && res.ok) {
        const user = await res.json();
        setUserId(user.id);
        setForm({
          username: user.username || '',
          password: '',
          email: user.email || '',
          data_time_format:
            (user.metadata && user.metadata.data_time_format) ||
            DATE_TIME_FORMATS[0],
          is_2fa_enabled: user.is_2fa_enabled || false,
          two_factor_secret: user.is_2fa_enabled ? '********' : '',
        });
      } else {
        ToastNotify.error('Failed to fetch user info');
        onClose();
      }
    } catch {
      ToastNotify.error('Failed to fetch user info');
      onClose();
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field])
      setErrors((prev: any) => ({ ...prev, [field]: undefined }));
  };

  const generate2FAData = async () => {
    setGenerating2FA(true);
    const startTime = Date.now();
    let res: Response | null = null;
    try {
      res = await authFetch(
        CONFIG.API_BASE_URL +
          API_ROUTES.TWO_FACTOR_GENERATE +
          '?username=' +
          form.username
      );
      if (res && res.ok) {
        const data = await res.json();
        setTwoFactorData(data);
        // 重置验证状态
        setIsVerified(false);
        setVerificationToken('');
        setVerificationError(null);
      } else {
        ToastNotify.error('Failed to generate 2FA data');
      }
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to generate 2FA data');
    } finally {
      await recordAccessLog({
        path: '/profile/2fa/generate',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.UPDATE,
        user_id: user?.id || '',
        ip_address: user?.ip_address || '',
        request: JSON.stringify({ username: form.username }),
        response: JSON.stringify(res),
        status_code: res?.status || 500,
        duration_ms: Date.now() - startTime,
      });
      setGenerating2FA(false);
    }
  };

  const handle2FAToggle = async (enabled: boolean) => {
    if (enabled && !twoFactorData) {
      // 启用 2FA 时生成新的 secret 和 QR 码
      await generate2FAData();
      setForm(prev => ({ ...prev, is_2fa_enabled: true }));
    } else {
      // 禁用 2FA
      setForm(prev => ({ ...prev, is_2fa_enabled: false }));
      setTwoFactorData(null);
      setIsVerified(false);
      setVerificationToken('');
      setVerificationError(null);
    }
  };

  const handleRegenerate2FA = async () => {
    await generate2FAData();
  };

  const handleVerifyToken = async () => {
    if (!verificationToken.trim() || !twoFactorData) {
      setVerificationError('Please enter a verification token');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    const startTime = Date.now();
    let res: Response | null = null;

    try {
      res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.TWO_FACTOR_VERIFY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: verificationToken.trim(),
            secret: twoFactorData.secret,
          }),
        }
      );

      if (res && res.ok) {
        const result = await res.json();
        if (result.valid) {
          setIsVerified(true);
          ToastNotify.success('Verification successful!');
        } else {
          setIsVerified(false);
          setVerificationError('Invalid verification token');
        }
      } else {
        const err = await res?.json().catch(() => ({}));
        setVerificationError(err.message || 'Verification failed');
        setIsVerified(false);
      }
    } catch (e: any) {
      setVerificationError(e.message || 'Verification failed');
      setIsVerified(false);
    } finally {
      await recordAccessLog({
        path: '/profile/2fa/verify',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.UPDATE,
        user_id: user?.id || '',
        ip_address: user?.ip_address || '',
        request: JSON.stringify({
          token: verificationToken.trim(),
          secret: '********',
        }),
        response: JSON.stringify(res),
        status_code: res?.status || 500,
        duration_ms: Date.now() - startTime,
      });
      setIsVerifying(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // 如果启用了 2FA，必须验证通过才能保存
    if (form.is_2fa_enabled && !isVerified) {
      ToastNotify.error('Please verify your 2FA token before saving');
      return;
    }

    const errs: any = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
      errs.email = 'Invalid email';
    if (!form.data_time_format)
      errs.data_time_format = 'Date time format is required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    const startTime = Date.now();
    let res: Response | null = null;
    let requestBody: any = {};
    try {
      requestBody = {
        username: form.username.trim(),
        password: form.password.trim() || undefined,
        email: form.email.trim() || null,
        metadata: { data_time_format: form.data_time_format },
        is_2fa_enabled: form.is_2fa_enabled,
        two_factor_secret: form.is_2fa_enabled ? twoFactorData?.secret : null,
      };
      res = await authFetch(
        `${CONFIG.API_BASE_URL}${API_ROUTES.USERS}/${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      if (res && res.ok) {
        ToastNotify.success('Profile updated successfully');
        onClose();
        onSuccess && onSuccess();
      } else {
        const err = await res?.json().catch(() => ({}));
        ToastNotify.error(err.message || 'Failed to update profile');
      }
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to update profile');
    } finally {
      const maskedRequest = maskSensitiveFields(requestBody, [
        'two_factor_secret',
        'password',
      ]);
      await recordAccessLog({
        path: '/profile',
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.UPDATE,
        user_id: user?.id || '',
        ip_address: user?.ip_address || '',
        request: JSON.stringify(maskedRequest),
        response: JSON.stringify(res),
        status_code: res?.status || 500,
        duration_ms: Date.now() - startTime,
      });
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full mx-4 transform transition-all overflow-hidden ${
          form.is_2fa_enabled && twoFactorData ? 'max-w-3xl' : 'max-w-md'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            User Profile
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="flex">
          {/* 左侧表单 */}
          <div className="flex-1 p-6">
            <form onSubmit={handleSave} className="space-y-4">
              <FloatingLabelInput
                id="username"
                name="username"
                label="Username *"
                value={form.username}
                onChange={e => handleChange('username', e.target.value)}
                error={errors.username}
                inputClassName="bg-transparent"
                labelClassName="bg-white dark:bg-gray-800"
                disabled={fetching}
              />
              <FloatingLabelInput
                id="password"
                name="password"
                type="password"
                label="Password"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                error={errors.password}
                inputClassName="bg-transparent"
                labelClassName="bg-white dark:bg-gray-800"
                autoComplete="new-password"
                placeholder="(leave blank to keep unchanged)"
                disabled={fetching}
                alwaysFloatLabel
              />
              <FloatingLabelInput
                id="email"
                name="email"
                type="email"
                label="Email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                error={errors.email}
                inputClassName="bg-transparent"
                labelClassName="bg-white dark:bg-gray-800"
                disabled={fetching}
              />
              <FloatingLabelSelect
                id="data_time_format"
                name="data_time_format"
                label="Date Time Format *"
                value={form.data_time_format}
                onChange={e => handleChange('data_time_format', e.target.value)}
                error={errors.data_time_format}
                disabled={fetching}
              >
                <option value="">Select Format</option>
                {DATE_TIME_FORMATS.map(fmt => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </FloatingLabelSelect>

              {/* 2FA Switch */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Two-Factor Authentication
                </label>
                <button
                  type="button"
                  onClick={() => handle2FAToggle(!form.is_2fa_enabled)}
                  disabled={generating2FA || fetching}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.is_2fa_enabled
                      ? 'bg-sky-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  } ${generating2FA || fetching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.is_2fa_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </form>
          </div>

          {/* 右侧 2FA 内容 */}
          {form.is_2fa_enabled && twoFactorData && (
            <div className="max-w-sm border-l border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-mono break-all">
                      {twoFactorData.secret}
                    </code>
                    <CopyButton
                      value={twoFactorData.secret}
                      copied={copiedSecret === twoFactorData.secret}
                      onCopied={() => {
                        setCopiedSecret(twoFactorData.secret);
                        setTimeout(() => setCopiedSecret(null), 2000);
                      }}
                      title="Copy Secret Key"
                    />
                    <button
                      type="button"
                      onClick={handleRegenerate2FA}
                      disabled={generating2FA}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 focus:outline-none disabled:opacity-50"
                      title="Regenerate Secret Key"
                    >
                      <ArrowPathIcon
                        className={`h-4 w-4 ${generating2FA ? 'animate-spin' : ''}`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Scan the QR code below with your authenticator app, or
                    manually enter this secret key.
                  </p>
                </div>

                <div>
                  <div className="flex justify-center">
                    <img
                      src={twoFactorData.qrCode}
                      alt="2FA QR Code"
                      className="w-32 h-32 border border-gray-300 dark:border-gray-500 rounded-lg"
                    />
                  </div>
                </div>

                {/* 验证区域 */}
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <FloatingLabelInput
                        id="verificationToken"
                        name="verificationToken"
                        label="Verify 6-digit token"
                        value={verificationToken}
                        onChange={e => {
                          const value = e.target.value;
                          if (value.length <= 6) {
                            setVerificationToken(value);
                          }
                        }}
                        inputClassName="bg-white dark:bg-gray-600"
                        labelClassName="bg-gray-50 dark:bg-gray-700"
                        placeholder=""
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyToken}
                      disabled={isVerifying || !verificationToken.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-500 disabled:cursor-not-allowed h-10"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                  <div className="mt-2">
                    {isVerified && (
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <CheckIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm">Verified</span>
                      </div>
                    )}
                    {verificationError && (
                      <div className="flex items-center text-red-600 dark:text-red-400">
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm">{verificationError}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            disabled={loading || fetching}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={
              loading || fetching || (form.is_2fa_enabled && !isVerified)
            }
            className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
