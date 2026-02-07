'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger, authFetch, refreshUserInfo } from '@/lib/utils';
import { clearBasicDataCache } from '@/lib/basic-data.service';
import {
  ACCESS_LOG_TYPE,
  WEB_ACTION_METHODS,
  CONFIG,
} from '@/constants/config';
import { API_ROUTES } from '@/constants/apiRoutes';
import Cookies from 'js-cookie';
import type { User } from '@/types/user';
// import { usePermission } from '@/hooks/usePermission';

interface AuthContextType {
  user: User | null;
  login: (
    username: string,
    password: string,
    twoFactorCode?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  logoutSync: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole: string | null;
  accessibleMerchantIds: string[] | string | null;
  refreshUserInfo: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  // const { can } = usePermission();

  const logout = useCallback(async () => {
    try {
      // 调用登出接口
      await fetch(CONFIG.API_BASE_URL + API_ROUTES.LOGOUT_AUTH, {
        method: 'POST',
        credentials: 'include', // 包含 cookies
      });
    } catch (error) {
      console.error('Failed to call logout API:', error);
      // 即使 API 调用失败，也要继续执行本地登出逻辑
    }

    setUser(null);
    // 清除 CSRF token cookie
    Cookies.remove('csrf_token');
    // 清除基础数据缓存
    clearBasicDataCache();
    if (pathname !== '/login') {
      router.push('/login');
    }
  }, [router, pathname]);

  // 同步版本的 logout，用于向后兼容
  const logoutSync = useCallback(() => {
    logout().catch(error => {
      console.error('Logout failed:', error);
    });
  }, [logout]);

  const refreshUserInfoAndSetState =
    useCallback(async (): Promise<User | null> => {
      const userData = await refreshUserInfo();
      if (userData) {
        setUser(userData);
      } else {
        await logout();
      }
      return userData;
    }, [logout]);

  useEffect(() => {
    const initializeAuth = async () => {
      const publicPaths = ['/login', '/forgot-password'];

      // 如果是公开页面，不需要检查用户信息
      if (publicPaths.includes(pathname)) {
        setIsLoading(false);
        return;
      }

      try {
        // 尝试获取用户信息，如果成功说明已登录
        await refreshUserInfoAndSetState();
      } catch (error) {
        console.error('Error initializing auth:', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, [refreshUserInfoAndSetState, logout, pathname]);

  const login = async (
    username: string,
    password: string,
    twoFactorCode?: string
  ) => {
    const start = Date.now();
    let status_code = 200;
    let duration_ms = 0;

    try {
      const requestBody: any = { username, password };
      if (twoFactorCode && twoFactorCode.trim()) {
        requestBody.two_factor_code = twoFactorCode.trim();
      }

      const response = await fetch(
        CONFIG.API_BASE_URL + API_ROUTES.LOGIN_AUTH,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          credentials: 'include', // 包含 cookies
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // 登录成功后获取 CSRF token
      const csrfToken = Cookies.get('csrf_token');
      // console.log('CSRF Token:', csrfToken);

      // 获取用户信息
      const currentUser = await refreshUserInfoAndSetState();
      // console.log('==========User Info:', currentUser);

      // 获取基础数据并存储到 sessionStorage
      try {
        await fetchBasicData(currentUser);
      } catch (error) {
        console.error('Failed to fetch basic data:', error);
        // 不影响登录流程，只记录错误
      }

      // 记录登录日志
      try {
        await authFetch(CONFIG.API_BASE_URL + API_ROUTES.ACCESS_LOGS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: '/dashboard',
            type: ACCESS_LOG_TYPE.WEB,
            method: WEB_ACTION_METHODS.LOGIN,
            user_id: currentUser?.id || '',
            ip_address: currentUser?.ip_address || '',
            user_agent:
              typeof window !== 'undefined' ? window.navigator.userAgent : '',
            status_code,
            duration_ms,
          }),
        });
      } catch (error) {
        logger.error('Failed to log login access:', error);
      }

      // 跳转到首页 - 等待跳转完成
      await router.push('/', { scroll: false });
    } catch (error) {
      console.error('Failed to login:', error);
      status_code = 400;
      throw error;
    } finally {
      duration_ms = Date.now() - start;
    }
  };

  // 获取基础数据的函数
  const fetchBasicData = async (currentUser?: User | null) => {
    try {
      // 获取商户
      const resMerchants = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.MERCHANTS_ACCESSIBLE
      );
      if (resMerchants && resMerchants.ok) {
        const data = await resMerchants.json();
        sessionStorage.setItem(
          'basicData_merchants',
          JSON.stringify(Array.isArray(data) ? data : [])
        );
      }

      // 获取银行
      const resBanks = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.BANKS_ACCESSIBLE
      );
      if (resBanks && resBanks.ok) {
        const data = await resBanks.json();
        sessionStorage.setItem(
          'basicData_banks',
          JSON.stringify(Array.isArray(data) ? data : [])
        );
      }

      // 获取币种
      const resCurrencies = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.CURRENCIES
      );
      if (resCurrencies && resCurrencies.ok) {
        const data = await resCurrencies.json();
        sessionStorage.setItem(
          'basicData_currencies',
          JSON.stringify(Array.isArray(data) ? data : [])
        );
      }

      // 获取支付方式
      const resMethods = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.TRANSACTION_METHODS + '?enabled=true'
      );
      if (resMethods && resMethods.ok) {
        const data = await resMethods.json();
        sessionStorage.setItem(
          'basicData_methods',
          JSON.stringify(Array.isArray(data) ? data : [])
        );
      }

      // 检查用户权限，决定是否获取用户和角色数据
      const userToCheck = currentUser || user;
      const hasUserPermission = userToCheck?.permissions?.some(
        perm => perm === 'user:view' || perm === 'all:view' || perm === 'all:*'
      );
      const hasRolePermission = userToCheck?.permissions?.some(
        perm => perm === 'role:view' || perm === 'all:view' || perm === 'all:*'
      );
      console.log('hasUserPermission', hasUserPermission);
      console.log('hasRolePermission', hasRolePermission);

      if (hasUserPermission && hasRolePermission) {
        // 获取用户
        const resUsers = await authFetch(
          CONFIG.API_BASE_URL + API_ROUTES.USERS
        );
        if (resUsers && resUsers.ok) {
          const data = await resUsers.json();
          sessionStorage.setItem(
            'basicData_users',
            JSON.stringify(Array.isArray(data) ? data : [])
          );
        }

        // 获取角色
        const resRoles = await authFetch(
          CONFIG.API_BASE_URL + API_ROUTES.ROLES
        );
        if (resRoles && resRoles.ok) {
          const data = await resRoles.json();
          sessionStorage.setItem(
            'basicData_roles',
            JSON.stringify(Array.isArray(data) ? data : [])
          );
        }
      }

      // 设置数据获取时间戳
      sessionStorage.setItem('basicData_timestamp', Date.now().toString());
    } catch (error) {
      console.error('Error fetching basic data:', error);
      throw error;
    }
  };

  const isAuthenticated = !!user;
  const userRole = user?.roles?.includes('admin')
    ? 'admin'
    : user?.roles?.[0] || (isAuthenticated ? 'user' : null);
  const accessibleMerchantIds = user?.accessible_merchant_ids || null;

  const contextValue = useMemo(
    () => ({
      user,
      login,
      logout,
      logoutSync,
      isLoading,
      isAuthenticated,
      userRole,
      accessibleMerchantIds,
      refreshUserInfo: refreshUserInfoAndSetState,
    }),
    [
      user,
      login,
      logout,
      logoutSync,
      isLoading,
      isAuthenticated,
      userRole,
      accessibleMerchantIds,
      refreshUserInfoAndSetState,
    ]
  );

  useEffect(() => {
    const publicPaths = ['/login', '/forgot-password'];
    if (!isLoading && !isAuthenticated && !publicPaths.includes(pathname)) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading && pathname !== '/login' && pathname !== '/forgot-password') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Authenticating...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
