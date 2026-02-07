import React, { forwardRef, useEffect } from 'react';
import { useNotificationSSE } from '@/hooks/useNotificationSSE';
import {
  BellAlertIcon,
  BellIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline';

interface NotificationIndicatorProps {
  onClick?: () => void;
}

const NotificationIndicator = forwardRef<
  HTMLButtonElement,
  NotificationIndicatorProps
>(({ onClick }, ref) => {
  const { unreadCount, connectionStatus } = useNotificationSSE();

  // 添加调试日志
  useEffect(() => {
    // console.log('🔔 NotificationIndicator - unreadCount changed:', unreadCount, 'connectionStatus:', connectionStatus);
  }, [unreadCount, connectionStatus]);

  // 根据连接状态选择图标和样式
  const getIconAndStyle = (unreadCount: number) => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: (
            <BellIcon
              className={`h-6 w-6 ${unreadCount > 0 ? 'shake-once' : ''}`}
            />
          ),
          className:
            'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
        };
      case 'connecting':
        return {
          icon: <BellIcon className="h-6 w-6 animate-pulse" />,
          className:
            'text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300',
        };
      case 'disconnected':
      case 'error':
        return {
          icon: <SignalSlashIcon className="h-6 w-6" />,
          className:
            'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300',
        };
      default:
        return {
          icon: <BellIcon className="h-6 w-6" />,
          className:
            'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
        };
    }
  };

  const { icon, className } = getIconAndStyle(unreadCount);

  return (
    <button
      ref={ref}
      className={`relative p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${className}`}
      onClick={onClick}
      aria-label={`Show notifications (${connectionStatus})`}
      title={`Notifications - ${connectionStatus} (${unreadCount} unread)`}
    >
      {icon}
      {/* 强制显示红点，添加更多调试信息 */}
      {unreadCount > 0 && (
        <span
          className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800 z-10"
          style={{
            display: 'block',
            visibility: 'visible',
            opacity: 1,
          }}
        />
      )}
      {/* 连接状态指示器 */}
      {/* {connectionStatus !== 'connected' && (
        <span className="absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full bg-gray-400" />
      )} */}
    </button>
  );
});

NotificationIndicator.displayName = 'NotificationIndicator';

export default NotificationIndicator;
