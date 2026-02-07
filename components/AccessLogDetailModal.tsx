import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatDateByUser } from '@/lib/utils';
import { useAuth } from './AuthContext';

const SHORT_FIELDS = [
  'username',
  'user_id',
  'role_name',
  'merchant_id',
  'type',
  'method',
  'status_code',
  'ip_address',
  'duration_ms',
  'tag',
  'created_at',
];
const LONG_FIELDS = ['path', 'user_agent', 'query_params', 'body'];

// 字段名美化：下划线转空格，首字母大写
function formatFieldLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const AccessLogDetailModal = ({
  isOpen,
  onClose,
  log,
}: {
  isOpen: boolean;
  onClose: () => void;
  log: any;
}) => {
  const { user } = useAuth();

  if (!isOpen || !log) return null;
  // 过滤掉 id 字段
  const shortEntries = SHORT_FIELDS.filter(
    f => log[f] !== undefined && log[f] !== null
  ).map(f => [f, log[f]]);
  const longEntries = LONG_FIELDS.filter(
    f => log[f] !== undefined && log[f] !== null
  ).map(f => [f, log[f]]);
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 transform transition-all overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Access Log Detail
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <div className="scrollbar p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* 顶部两列短字段 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-4">
            {shortEntries.map(([key, value]) => (
              <div key={key} className="flex flex-col mb-1">
                <div className="text-xs text-gray-500 mb-0.5">
                  {formatFieldLabel(key)}
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-100 break-all">
                  {key === 'created_at'
                    ? formatDateByUser(value, user?.metadata?.data_time_format)
                    : String(value)}
                </div>
              </div>
            ))}
          </div>
          {/* 长字段滚动展示 */}
          {longEntries.map(([key, value]) => (
            <div key={key} className="mb-2">
              <div className="text-xs text-gray-500 mb-1">
                {formatFieldLabel(key)}
              </div>
              <pre className="scrollbar bg-gray-100 dark:bg-gray-900 rounded p-2 text-xs max-h-40 overflow-y-auto whitespace-pre-wrap break-all border border-gray-200 dark:border-gray-700">
                {typeof value === 'object'
                  ? JSON.stringify(value, null, 2)
                  : String(value)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccessLogDetailModal;
