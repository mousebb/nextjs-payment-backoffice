import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';
import { fetchBasicData } from '@/lib/basic-data.service';

export const useBasicData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const userRef = useRef(user);
  const isRefreshingRef = useRef(false);

  // 保证 userRef 始终是最新的
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return; // 避免并发刷新
    isRefreshingRef.current = true;
    setIsLoading(true);
    try {
      await fetchBasicData(userRef.current); // 用 ref 避免闭包引用旧值
    } catch (err) {
      console.error('Failed to fetch basic data', err);
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // 第一次加载时自动拉取
    refresh();

    // 监听全局事件触发 refresh
    const handleRefresh = () => {
      refresh();
    };

    window.addEventListener('refreshBasicData', handleRefresh);
    return () => window.removeEventListener('refreshBasicData', handleRefresh);
  }, [refresh]);

  return { isLoading, refresh };
};
