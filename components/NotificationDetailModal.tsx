import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatDateByUser } from '@/lib/utils';
import { useAuth } from './AuthContext';

const BOTTOM_FIELDS = [
  'type',
  'is_broadcast',
  'created_at',
  'expires_at',
  'read_at',
];

function formatFieldLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const NotificationDetailModal = ({
  isOpen,
  onClose,
  notification,
}: {
  isOpen: boolean;
  onClose: () => void;
  notification: any;
}) => {
  const { user } = useAuth();
  if (!isOpen || !notification) return null;
  const bottomEntries = BOTTOM_FIELDS.filter(
    f => notification[f] !== undefined && notification[f] !== null
  ).map(f => [f, notification[f]]);
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
            Notification Detail
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <div className="scrollbar p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">Title</div>
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100 break-all">
              {notification.title}
            </div>
          </div>
          {/* Content */}
          {notification.content && (
            <div className="mb-2">
              <div className="text-xs text-gray-500 mb-1">Content</div>
              <div className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-line break-all">
                {notification.content}
              </div>
            </div>
          )}
          {/* Metadata */}
          {notification.metadata && (
            <div className="mb-2">
              <div className="text-xs text-gray-500 mb-1">Metadata</div>
              <pre className="scrollbar bg-gray-100 dark:bg-gray-900 rounded p-2 text-xs max-h-40 overflow-y-auto whitespace-pre-wrap break-all border border-gray-200 dark:border-gray-700">
                {typeof notification.metadata === 'object'
                  ? JSON.stringify(notification.metadata, null, 2)
                  : String(notification.metadata)}
              </pre>
            </div>
          )}
          {/* Bottom info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4">
            {bottomEntries.map(([key, value]) => (
              <div key={key} className="flex flex-col mb-1">
                <div className="text-xs text-gray-500 mb-0.5">
                  {formatFieldLabel(key)}
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-100 break-all">
                  {key === 'created_at' ||
                  key === 'expires_at' ||
                  key === 'read_at'
                    ? formatDateByUser(value, user?.metadata?.data_time_format)
                    : key === 'is_broadcast'
                      ? value
                        ? 'Yes'
                        : 'No'
                      : String(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailModal;
