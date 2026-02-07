// useNotificationSSE.ts
import { API_ROUTES } from '@/constants/apiRoutes';
import { CONFIG } from '@/constants/config';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';

export function useNotificationSSE() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected' | 'error'
  >('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  const isIntentionalClose = useRef(false);
  const { isAuthenticated } = useAuth();

  // 1. 提到外部
  const fetchUnreadSummary = useCallback(async () => {
    try {
      const res = await fetch(
        CONFIG.API_BASE_URL + API_ROUTES.NOTIFICATION_UNREAD_SUMMARY,
        {
          credentials: 'include',
        }
      );
      const data = await res.json();
      setUnreadCount(data.unreadCount);
      setLatest(data.latest);
    } catch (e) {
      console.error('Failed to fetch unread summary', e);
    }
  }, []);

  const connectSSE = useCallback(() => {
    // 如果用户未认证，不建立连接
    if (!isAuthenticated) {
      console.log('🔒 User not authenticated, skipping SSE connection');
      setConnectionStatus('disconnected');
      return;
    }

    // 清理之前的连接
    if (eventSourceRef.current) {
      isIntentionalClose.current = true;
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // 清理重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus('connecting');

    try {
      const es = new EventSource(
        CONFIG.API_BASE_URL + API_ROUTES.NOTIFICATION_SSE,
        {
          withCredentials: true,
        }
      );

      eventSourceRef.current = es;

      es.onopen = () => {
        console.log('✅ SSE connection opened');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0; // 重置重连次数
        isIntentionalClose.current = false;
        // 连接成功后获取最新的未读消息数量
        fetchUnreadSummary();
      };

      es.onmessage = event => {
        try {
          const payload = JSON.parse(event.data);
          console.log('📩 New SSE notification:', payload);
          setUnreadCount(payload.unreadCount ?? 0);
          setLatest(payload.latest ?? null);
        } catch (err) {
          console.error('❌ Failed to parse SSE message:', event.data);
        }
      };

      es.onerror = err => {
        // 检查是否是故意关闭
        if (isIntentionalClose.current) {
          return;
        }

        setIsConnected(false);
        setConnectionStatus('disconnected');
        es.close();

        // 检查连接状态，判断是否是服务器重启等正常断开
        const isNormalDisconnect = es.readyState === EventSource.CLOSED;

        if (isNormalDisconnect) {
          // 服务器重启等正常断开，不显示错误日志
          console.log(
            '🔄 SSE connection closed (server restart or normal disconnect)'
          );
        } else {
          // 真正的连接错误
          console.error('❌ SSE connection error:', err);
          setConnectionStatus('error');
        }

        // 重连逻辑
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay =
            baseReconnectDelay * Math.pow(2, reconnectAttempts.current); // 指数退避
          console.log(
            `🔄 Reconnecting SSE in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectSSE();
          }, delay);
        } else {
          console.warn(
            '⚠️ SSE max reconnection attempts reached, switching to polling mode'
          );
          setConnectionStatus('error');
          // 可以在这里添加用户提示或降级到轮询
        }
      };
    } catch (error) {
      console.error('❌ Failed to create SSE connection:', error);
      setIsConnected(false);
      setConnectionStatus('error');
    }
  }, [isAuthenticated]);

  // 手动关闭连接
  const disconnectSSE = useCallback(() => {
    isIntentionalClose.current = true;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttempts.current = 0;
  }, []);

  // 手动重连
  const reconnectSSE = useCallback(() => {
    reconnectAttempts.current = 0;
    connectSSE();
  }, [connectSSE]);

  useEffect(() => {
    fetchUnreadSummary();
    connectSSE();

    // 清理函数
    return () => {
      isIntentionalClose.current = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [fetchUnreadSummary, connectSSE]);

  // 监听认证状态变化
  useEffect(() => {
    if (isAuthenticated) {
      // 用户已认证，尝试连接SSE
      console.log('🔓 User authenticated, connecting SSE');
      reconnectAttempts.current = 0; // 重置重连次数
      connectSSE();
    } else {
      // 用户未认证，断开SSE连接
      console.log('🔒 User not authenticated, disconnecting SSE');
      disconnectSSE();
    }
  }, [isAuthenticated, connectSSE, disconnectSSE]);

  useEffect(() => {
    const handler = () => {
      fetchUnreadSummary();
      // 如果连接断开，尝试重连
      if (!isConnected && reconnectAttempts.current < maxReconnectAttempts) {
        connectSSE();
      }
    };
    window.addEventListener('refreshNotifications', handler);
    return () => window.removeEventListener('refreshNotifications', handler);
  }, [fetchUnreadSummary, connectSSE, isConnected]);

  // 监听token刷新事件
  useEffect(() => {
    const handleTokenRefreshed = () => {
      console.log('🔄 Token refreshed, reconnecting SSE');
      reconnectAttempts.current = 0; // 重置重连次数
      // 先获取最新的未读消息数量
      fetchUnreadSummary();
      // 然后重新连接SSE
      connectSSE();
    };
    window.addEventListener('tokenRefreshed', handleTokenRefreshed);
    return () => window.removeEventListener('tokenRefreshed', handleTokenRefreshed);
  }, [connectSSE, fetchUnreadSummary]);

  return {
    unreadCount,
    latest,
    isConnected,
    connectionStatus,
    disconnectSSE,
    reconnectSSE,
  };
}
