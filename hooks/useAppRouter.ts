import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { authFetch } from '@/lib/utils';
import { API_ROUTES } from '@/constants/apiRoutes';
import { useAuth } from '@/components/AuthContext';
import { ACCESS_LOG_TYPE, CONFIG } from '@/constants/config';

/**
 * 自定义useAppRouter，push前自动插入access log
 * push(url, method, options?)
 *
 * 使用示例：
 * const { push } = useAppRouter();
 * push('/dashboard', 'GET'); // 跳转到 /dashboard，记录 access log
 * push('/merchants', 'POST'); // 跳转到 /merchants，记录 access log
 */
export function useAppRouter() {
  const router = useRouter();
  const { user } = useAuth();

  // 获取user_id、ip、user_agent等（可根据实际项目调整获取方式）
  const getUserInfo = () => {
    let user_id = '';
    let ip_address = '';
    let user_agent = '';
    if (typeof window !== 'undefined') {
      user_agent = window.navigator.userAgent;
      // ip一般需后端提供，这里留空或通过接口获取
    }
    // 从 useAuth 中获取 user_id
    user_id = user?.id || '';
    ip_address = user?.ip_address || '';
    return { user_id, ip_address, user_agent };
  };

  // push方法，method参数必填
  const push = useCallback(
    async (url: string, method: string, options?: any) => {
      const { user_id, ip_address, user_agent } = getUserInfo();
      const start = Date.now();

      let status_code = 200;
      let duration_ms = 0;

      // 跳转页面
      try {
        router.push(url, options);

        // 等待页面加载完成
        await new Promise<void>(resolve => {
          // 监听页面加载完成
          const onLoad = () => {
            resolve();
            window.removeEventListener('DOMContentLoaded', onLoad);
            window.removeEventListener('load', onLoad);
            window.removeEventListener('popstate', onLoad);
          };

          // 兼容不同场景
          window.addEventListener('DOMContentLoaded', onLoad, { once: true });
          window.addEventListener('load', onLoad, { once: true });
          window.addEventListener('popstate', onLoad, { once: true });

          // 兜底：2秒后强制resolve，防止卡死
          setTimeout(() => resolve(), 2000);
        });

        status_code = 200;
      } catch (e) {
        status_code = 400;
      }
      duration_ms = Date.now() - start;

      // 只提交一次日志
      try {
        await authFetch(CONFIG.API_BASE_URL + API_ROUTES.ACCESS_LOGS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: url,
            type: ACCESS_LOG_TYPE.WEB,
            method,
            user_id,
            ip_address,
            user_agent,
            status_code,
            duration_ms,
          }),
        });
      } catch {}

      // 注意：如果你希望日志写入和页面跳转并发，可以把日志写入放到跳转前
    },
    [router, user]
  );

  // 其它router方法可按需封装
  return { ...router, push };
}
