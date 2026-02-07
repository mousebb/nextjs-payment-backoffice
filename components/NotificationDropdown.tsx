import React, { useState, useEffect, useRef } from 'react';
import { API_ROUTES } from '../constants/apiRoutes';
import {
  ACCESS_LOG_TYPE,
  CONFIG,
  WEB_ACTION_METHODS,
} from '../constants/config';
import { authFetch, formatDateByUser, recordAccessLog } from '@/lib/utils';
import {
  Cog6ToothIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  EnvelopeOpenIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from './AuthContext';
import ToastNotify from './ToastNotify';
import NotificationDetailModal from './NotificationDetailModal';
import { useNotificationSSE } from '@/hooks/useNotificationSSE';

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender_avatar?: string;
  sender_name?: string;
  type?: string; // Added type for icon rendering
}

interface NotificationDropdownProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onViewAll?: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  open,
  anchorRef,
  onClose,
  onViewAll,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [markingAll, setMarkingAll] = useState(false);
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailNotification, setDetailNotification] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.NOTIFICATION_PERSONAL + `?limit=5`
      );
      if (!res || !res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(Array.isArray(data.data) ? data.data : []);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  // 计算弹层位置
  useEffect(() => {
    if (open && anchorRef.current && dropdownRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const dropdownWidth = 384;
      let left = anchorRect.left + window.scrollX;
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }
      setDropdownStyle({
        position: 'fixed',
        top: anchorRect.bottom + 8,
        minWidth: 320,
        width: dropdownWidth,
        zIndex: 9999,
      });
    }
  }, [open, anchorRef]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, anchorRef]);

  // 使用本地计算的 unreadCount，而不是全局的
  const localUnreadCount = notifications.filter(n => !n.is_read).length;
  // const { unreadCount: globalUnreadCount } = useNotificationSSE();

  // 调试信息
  useEffect(() => {
    // if (open) {
    //   console.log('🔔 NotificationDropdown - localUnreadCount:', localUnreadCount);
    // }
  }, [open, localUnreadCount]);

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    const unread = notifications.filter(n => !n.is_read);
    const startTime = Date.now();
    try {
      await Promise.all(
        unread.map(n =>
          authFetch(
            CONFIG.API_BASE_URL +
              API_ROUTES.NOTIFICATIONS_READ.replace(':id', n.id),
            { method: 'POST' }
          )
        )
      );
      fetchNotifications();
      // 延迟触发事件，确保状态更新完成
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      }, 100);
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to mark all as read');
    } finally {
      await recordAccessLog({
        path: `/notifications`,
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.UPDATE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: 200,
        request: JSON.stringify({ id: unread.map(n => n.id), is_read: true }),
        response: '',
        duration_ms: Date.now() - startTime,
      });
      setMarkingAll(false);
    }
  };

  // Mark single as read
  const handleMarkAsRead = async (id: string) => {
    const startTime = Date.now();
    let res: Response | null = null;
    try {
      res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.NOTIFICATIONS_READ.replace(':id', id),
        { method: 'POST' }
      );
      if (res && res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
        );
        // 延迟触发事件，确保状态更新完成
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshNotifications'));
        }, 100);
      }
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to mark as read');
    } finally {
      await recordAccessLog({
        path: `/notifications`,
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.UPDATE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({ id, is_read: true }),
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });
    }
  };

  const fetchNotificationDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await authFetch(
        CONFIG.API_BASE_URL +
          API_ROUTES.NOTIFICATIONS_DETAILS.replace(':id', id)
      );
      if (!res || !res.ok)
        throw new Error('Failed to fetch notification detail');
      const data = await res.json();
      setDetailNotification(data);
      setDetailModalOpen(true);
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to fetch notification detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const renderTypeIcon = (n: Notification) => {
    switch (n.type) {
      case 'system':
        return (
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600">
            <Cog6ToothIcon className="h-5 w-5" />
          </span>
        );
      case 'info':
        return (
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
            <InformationCircleIcon className="h-5 w-5" />
          </span>
        );
      case 'warning':
        return (
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <ExclamationTriangleIcon className="h-5 w-5" />
          </span>
        );
      case 'personal':
        return (
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <IdentificationIcon className="h-5 w-5" />
          </span>
        );
      default:
        return (
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <InformationCircleIcon className="h-5 w-5" />
          </span>
        );
    }
  };

  if (!open) return null;

  return (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="scrollbar absolute right-4 mt-2 w-96 max-w-[95vw] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700">
        <div className="font-semibold text-lg text-gray-800 dark:text-gray-100">
          Notifications
        </div>
        <div className="flex items-center space-x-2">
          {localUnreadCount > 0 && (
            <span className="bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full">
              {localUnreadCount} New
            </span>
          )}
          <button
            className="ml-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-sky-600 dark:hover:text-sky-400"
            onClick={handleMarkAllAsRead}
            disabled={markingAll || localUnreadCount === 0}
            title="Mark all as read"
          >
            <EnvelopeOpenIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
        {loading ? (
          <div className="py-8 text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-400">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-gray-400">No notifications</div>
        ) : (
          notifications.map(n => (
            <button
              key={n.id}
              className={`w-full flex items-start px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition relative ${!n.is_read ? 'bg-sky-50 dark:bg-gray-900/30' : ''}`}
              onClick={async () => {
                if (!n.is_read) await handleMarkAsRead(n.id);
                await fetchNotificationDetail(n.id);
              }}
              disabled={detailLoading}
            >
              <div className="mr-3 mt-1">{renderTypeIcon(n)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  {n.title.length > 30 ? n.title.slice(0, 30) + '...' : n.title}
                  {!n.is_read && (
                    <span className="ml-2 inline-block h-2 w-2 rounded-full bg-sky-400" />
                  )}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-sm truncate">
                  {n.content}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {formatDateByUser(
                    n.created_at,
                    user?.metadata?.data_time_format
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <button
          className="w-full py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition"
          onClick={() => {
            if (onViewAll) onViewAll();
          }}
        >
          View All Notifications
        </button>
      </div>
      <NotificationDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        notification={detailNotification}
      />
    </div>
  );
};

export default NotificationDropdown;
