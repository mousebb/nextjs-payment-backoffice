// services/basic-data.service.ts

import { CONFIG } from '@/constants/config';
import { API_ROUTES } from '@/constants/apiRoutes';
import { authFetch } from '@/lib/utils';
import type { User } from '@/types/user';

// 缓存过期时间（30分钟）
const BASIC_DATA_CACHE_DURATION = 30 * 60 * 1000;

/**
 * 检查基础数据缓存是否有效
 */
export const isBasicDataCacheValid = (): boolean => {
  if (typeof window === 'undefined') return false;

  const timestamp = sessionStorage.getItem('basicData_timestamp');
  if (!timestamp) return false;

  const cacheTime = parseInt(timestamp, 10);
  const now = Date.now();

  return now - cacheTime < BASIC_DATA_CACHE_DURATION;
};

/**
 * 从 sessionStorage 获取基础数据
 */
export const getBasicDataFromCache = (key: string): any[] => {
  if (typeof window === 'undefined') return [];

  try {
    const data = sessionStorage.getItem(`basicData_${key}`);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error parsing cached data for ${key}:`, error);
    return [];
  }
};

export const fetchBasicData = async (currentUser?: User | null) => {
  try {
    const userToCheck = currentUser;
    const hasUserPermission = userToCheck?.permissions?.some(p =>
      ['user:view', 'all:view', 'all:*'].includes(p)
    );
    const hasRolePermission = userToCheck?.permissions?.some(p =>
      ['role:view', 'all:view', 'all:*'].includes(p)
    );
    const hasAgentPermission = userToCheck?.permissions?.some(p =>
      ['commission_log:edit', 'all:view', 'all:*'].includes(p)
    );
    const hasCurrencyPermission = userToCheck?.permissions?.some(p =>
      ['currency:view', 'all:view', 'all:*'].includes(p)
    );
    const hasTransactionMethodPermission = userToCheck?.permissions?.some(p =>
      ['transaction_method:view', 'all:view', 'all:*'].includes(p)
    );

    const resMerchants = await authFetch(
      CONFIG.API_BASE_URL + API_ROUTES.MERCHANTS_ACCESSIBLE
    );
    if (resMerchants?.ok) {
      const data = await resMerchants.json();
      sessionStorage.setItem(
        'basicData_merchants',
        JSON.stringify(Array.isArray(data) ? data : [])
      );
    }

    const resBanks = await authFetch(
      CONFIG.API_BASE_URL + API_ROUTES.BANKS_ACCESSIBLE
    );
    if (resBanks?.ok) {
      const data = await resBanks.json();
      sessionStorage.setItem(
        'basicData_banks',
        JSON.stringify(Array.isArray(data) ? data : [])
      );
    }

    if (hasCurrencyPermission) {
      const resCurrencies = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.CURRENCIES
      );
      if (resCurrencies?.ok) {
        const data = await resCurrencies.json();
        sessionStorage.setItem(
          'basicData_currencies',
          JSON.stringify(Array.isArray(data) ? data : [])
        );
      }
    }

    if (hasTransactionMethodPermission) {
      const resMethods = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.TRANSACTION_METHODS + '?enabled=true'
      );
      if (resMethods?.ok) {
        const data = await resMethods.json();
        sessionStorage.setItem(
          'basicData_methods',
          JSON.stringify(Array.isArray(data) ? data : [])
        );
      }
    }

    if (hasUserPermission) {
      const resUsers = await authFetch(CONFIG.API_BASE_URL + API_ROUTES.USERS);
      if (resUsers?.ok) {
        const data = await resUsers.json();
        sessionStorage.setItem(
          'basicData_users',
          JSON.stringify(Array.isArray(data) ? data : [])
        );
      }
    }

    if (hasRolePermission) {
      const resRoles = await authFetch(CONFIG.API_BASE_URL + API_ROUTES.ROLES);
      if (resRoles?.ok) {
        const data = await resRoles.json();
        sessionStorage.setItem(
          'basicData_roles',
          JSON.stringify(Array.isArray(data) ? data : [])
        );
      }
    }

    if (hasAgentPermission) {
      const resAgents = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.AGENTS
      );
      if (resAgents?.ok) {
        const data = await resAgents.json();
        sessionStorage.setItem(
          'basicData_agents',
          JSON.stringify(Array.isArray(data) ? data : [])
        );
      }
    }

    sessionStorage.setItem('basicData_timestamp', Date.now().toString());
  } catch (err) {
    console.error('Error fetching basic data:', err);
    throw err;
  }
};

export const clearBasicDataCache = (keys?: string[]): void => {
  if (typeof window === 'undefined') return;

  const allKeys = [
    'basicData_merchants',
    'basicData_banks',
    'basicData_currencies',
    'basicData_methods',
    'basicData_users',
    'basicData_roles',
    'basicData_timestamp',
    'basicData_agents',
  ];

  const keysToRemove = keys ? keys.map(k => `basicData_${k}`) : allKeys;

  for (const key of keysToRemove) {
    sessionStorage.removeItem(key);
  }
};

export const getBasicData = async (
  key: string,
  apiUrl: string
): Promise<any[]> => {
  // 如果缓存有效，直接返回缓存数据
  if (isBasicDataCacheValid()) {
    const cachedData = getBasicDataFromCache(key);
    if (cachedData.length > 0) {
      return cachedData;
    }
  }

  // 缓存无效或为空，从服务器获取
  try {
    const response = await authFetch(apiUrl);
    if (!response) return [];

    if (!response.ok) {
      console.error(`Failed to fetch ${key}:`, response.status);
      return [];
    }

    const data = await response.json();
    const result = Array.isArray(data) ? data : [];

    // 更新缓存
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`basicData_${key}`, JSON.stringify(result));
      sessionStorage.setItem('basicData_timestamp', Date.now().toString());
    }

    return result;
  } catch (error) {
    console.error(`Error fetching ${key}:`, error);
    return [];
  }
};
