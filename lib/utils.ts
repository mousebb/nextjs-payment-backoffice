import { toZonedTime, format } from 'date-fns-tz';
import { endOfWeek, parseISO, startOfWeek } from 'date-fns';
import {
  CONFIG,
  ENUM_CONFIG,
  ACCESS_LOG_TYPE,
  COLOR_BADGE_LIST,
  SOURCE_ACTION,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import type { User } from '@/types/user';
import { format as formatDateFns } from 'date-fns';

// Custom zonedTimeToUtc
export function zonedTimeToUtc(date: Date, timeZone: string): Date {
  const zoned = toZonedTime(date, timeZone);
  const diff = date.getTime() - zoned.getTime();
  return new Date(date.getTime() - diff);
}

export const getStartOfLocalDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const getEndOfLocalDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

export const getStartOfNdaysAgoInUTCString = (daysAgo: number): string => {
  const localDate = new Date();
  localDate.setDate(localDate.getDate() - daysAgo);
  const startOfTargetLocalDay = getStartOfLocalDay(localDate);
  return startOfTargetLocalDay.toISOString();
};

export const getEndOfTodayInUTCString = (): string => {
  const localDate = new Date();
  const endOfTodayLocal = getEndOfLocalDay(localDate);
  return endOfTodayLocal.toISOString();
};

/**
 * Get the UTC start and end time of a day in a specific timezone
 * @param date Target date (Date object or string)
 * @param timeZone Timezone (e.g. 'Asia/Shanghai'), default is local timezone
 */
export function getUtcDayRange(
  date: Date | string,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const localStart = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0,
    0,
    0,
    0
  );
  const localEnd = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999
  );

  return {
    utcStart: zonedTimeToUtc(localStart, timeZone),
    utcEnd: zonedTimeToUtc(localEnd, timeZone),
  };
}

/**
 * Get the UTC start and end time of any local time range in a specific timezone
 * @param date Local start time (Date object or string)
 * @param isStart if true, return the start of the day, otherwise return the end of the day
 * @param timeZone Timezone (e.g. 'Asia/Shanghai'), default is local timezone
 */
export function getUtcDate(
  date: Date | string,
  isStart: boolean,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const timeConfig = isStart
    ? { h: 0, m: 0, s: 0, ms: 0 }
    : { h: 23, m: 59, s: 59, ms: 999 };
  const localDate = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    timeConfig.h,
    timeConfig.m,
    timeConfig.s,
    timeConfig.ms
  );
  // return zonedTimeToUtc(localDate, timeZone);
  return localDate;
}

export function getClientDateTime(
  date: string,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
) {
  const zonedTime = toZonedTime(parseISO(date), timeZone);
  const formattedTime = format(zonedTime, 'yyyy-MM-dd HH:mm:ss', {
    timeZone: timeZone,
  });

  return formattedTime;
}

export function getUtcMonthRange(date = new Date()) {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth(); // 0-based

  const utcStart = new Date(Date.UTC(utcYear, utcMonth, 1, 0, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(utcYear, utcMonth + 1, 0, 23, 59, 59, 999)); // 本月最后一天

  return { utcStart, utcEnd };
}

export const getSummaryPeriodRange = (
  summaryPeriod: 'daily' | 'weekly' | 'monthly'
) => {
  const today = new Date();
  if (summaryPeriod === 'monthly') {
    const { utcStart, utcEnd } = getUtcMonthRange();
    return { start: utcStart.toISOString(), end: utcEnd.toISOString() };
  } else if (summaryPeriod === 'weekly') {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    return { start: weekStart.toISOString(), end: weekEnd.toISOString() };
  } else {
    const { utcStart, utcEnd } = getUtcDayRange(today);
    return { start: utcStart.toISOString(), end: utcEnd.toISOString() };
  }
};

export const formatDate = (
  dateString: string | undefined,
  options?: Intl.DateTimeFormatOptions
) => {
  if (!dateString) return 'N/A';
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  try {
    return new Intl.DateTimeFormat('en-US', {
      ...defaultOptions,
      ...options,
    }).format(new Date(dateString));
  } catch (e) {
    return dateString;
  }
};

// 用于暂存 refresh 后的 csrfToken
let lastCsrfToken: string | undefined = undefined;
// 全局 refresh token 锁，仅 401 场景下生效
let refreshPromise: Promise<{ user: User | null; csrfToken?: string }> | null =
  null;

export async function refreshAccessToken(): Promise<{
  user: User | null;
  csrfToken?: string;
}> {
  if (refreshPromise) {
    // 已有 refresh 请求在进行，等待其完成
    return refreshPromise;
  }
  refreshPromise = (async () => {
    try {
      const csrfToken = Cookies.get('csrf_token');
      console.debug(
        '[refreshAccessToken] before refresh, csrfToken:',
        csrfToken
      );
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
      }
      const response = await fetch(
        CONFIG.API_BASE_URL + API_ROUTES.REFRESH_AUTH,
        {
          method: 'POST',
          headers,
          credentials: 'include',
        }
      );
      if (!response.ok) return { user: null };
      // 等待 cookie 写入
      await new Promise(r => setTimeout(r, 50));
      const user = await refreshUserInfo();
      return { user };
    } catch (e) {
      console.error('[refreshAccessToken] error:', e);
      return { user: null };
    } finally {
      refreshPromise = null; // 无论成功失败都释放锁
    }
  })();
  return refreshPromise;
}

/**
 * Refresh user information from server
 * @returns Promise<User | null> User data or null if failed
 */
export async function refreshUserInfo(): Promise<User | null> {
  try {
    const response = await authFetch(
      CONFIG.API_BASE_URL + API_ROUTES.USER_INFO
    );
    if (!response) {
      // authFetch 返回 null 表示 CSRF token 过期，已经自动跳转到登录页面
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const userData = await response.json();
    const newUser: User = {
      id: userData.id || '',
      username: userData.username || '',
      email: userData.email || '',
      created_at: userData.created_at || new Date().toISOString(),
      accessible_merchant_ids: userData.accessible_merchant_ids || null,
      roles: userData.roles || [],
      permissions: userData.permissions || [],
      ip_address: userData.ip_address || '',
      metadata: userData.metadata || '',
    };

    return newUser;
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    return null;
  }
}

/**
 * Global logout method for CSRF token expiration
 */
const globalLogout = async () => {
  if (typeof window !== 'undefined') {
    try {
      // 调用登出接口
      await fetch(CONFIG.API_BASE_URL + API_ROUTES.LOGOUT_AUTH, {
        method: 'POST',
        credentials: 'include', // 包含 cookies
      });
    } catch (error) {
      console.error('Failed to call logout API in globalLogout:', error);
      // 即使 API 调用失败，也要继续执行本地登出逻辑
    }
    
    // 清除 CSRF token cookie
    Cookies.remove('csrf_token');
    // 跳转到登录页面
    window.location.href = '/login';
  }
};

// Global refresh lock
let isRefreshing = false;
let pendingRequests: (() => Promise<Response | null>)[] = [];

/**
 * fetch wrapper that automatically handles CSRF token expiration
 * @param input fetch url or Request object
 * @param init fetch init options
 * @returns fetch Response or null
 */
export async function authFetch(
  input: RequestInfo,
  init: RequestInit = {},
  retry = true
): Promise<Response | null> {
  try {
    const csrfToken = lastCsrfToken || Cookies.get('csrf_token');
    console.debug('[authFetch] csrfToken:', csrfToken);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string>) || {}),
    };
    if (csrfToken) {
      headers['X-CSRF-TOKEN'] = csrfToken;
    }
    const response = await fetch(input, {
      ...init,
      headers,
      credentials: 'include',
    });
    // access token 过期（401）
    if (response.status === 401 && retry) {
      // 只允许一个 refresh 请求，其它 401 请求等待
      const { user, csrfToken: newCsrfToken } = await refreshAccessToken();
      if (user) {
        lastCsrfToken = newCsrfToken;
        // 触发token刷新成功事件，通知SSE重新连接
        window.dispatchEvent(new CustomEvent('tokenRefreshed'));
        const retryRes = await authFetch(input, init, false);
        lastCsrfToken = undefined; // 用完后清空
        return retryRes;
      } else {
        globalLogout().catch(error => {
          console.error('Global logout failed:', error);
        });
        return null;
      }
    }
    lastCsrfToken = undefined; // 正常请求后清空
    // csrf token 失效（403）
    if (response.status === 403) {
      try {
        const clonedResponse = response.clone();
        const errorData = await clonedResponse.json();
        if (errorData.message?.includes('CSRF token')) {
          globalLogout().catch(error => {
            console.error('Global logout failed:', error);
          });
          return null;
        }
      } catch {
        globalLogout().catch(error => {
          console.error('Global logout failed:', error);
        });
        return null;
      }
    }
    return response;
  } catch (error) {
    console.error('authFetch error:', error);
    return null;
  }
}

export const logger = {
  info: (...args: any[]) => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.error(...args);
    }
  },
};

export const maskedLongID = (id: string) => {
  return id.length > 12
    ? `${id.substring(0, 6)}...${id.substring(id.length - 4)}`
    : id;
};

/**
 * 记录 access log
 * @param log { path, type, method, user_id, ip_address, user_agent, status_code, duration_ms }
 * @returns Promise<void>
 */
export async function recordAccessLog({
  path,
  type = ACCESS_LOG_TYPE.WEB,
  method,
  user_id,
  ip_address,
  user_agent,
  status_code = 200,
  request,
  response,
  duration_ms = 0,
}: {
  path: string;
  type?: string;
  method: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  status_code?: number;
  request?: string;
  response?: string;
  duration_ms?: number;
}) {
  // 自动获取 user_agent
  if (!user_agent && typeof window !== 'undefined') {
    user_agent = window.navigator.userAgent;
  }

  try {
    await authFetch(CONFIG.API_BASE_URL + API_ROUTES.ACCESS_LOGS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        type,
        method,
        user_id,
        ip_address,
        user_agent,
        status_code,
        body: {
          request,
          response,
        },
        duration_ms,
      }),
    });
  } catch (e) {
    logger.error('[recordAccessLog] failed', e);
  }
}

/**
 * 根据用户自定义格式格式化日期
 * @param dateString 日期字符串
 * @param user 用户对象，需包含 metadata.data_time_format
 * @returns 格式化后的日期字符串
 */
export const formatDateByUser = (
  dateString: string,
  data_time_format?: string
) => {
  try {
    const fmt = data_time_format || 'yyyy-MM-dd HH:mm:ss';
    // 兼容大写 Y/M/D/H -> y/M/d/H
    return formatDateFns(
      new Date(dateString),
      fmt
        .replace(/Y/g, 'y')
        .replace(/D/g, 'd')
        .replace(/H/g, 'H')
        .replace(/m/g, 'm')
        .replace(/s/g, 's')
    );
  } catch (e) {
    return dateString;
  }
};

export const getBadgeColor = (code: string) => {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % COLOR_BADGE_LIST.length;
  return COLOR_BADGE_LIST[idx];
};

export function maskSensitiveFields(
  obj: any,
  fields: string[] = ['password']
): any {
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveFields(item, fields));
  } else if (obj && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (fields.includes(key.toLowerCase())) {
        newObj[key] = '******';
      } else {
        newObj[key] = maskSensitiveFields(obj[key], fields);
      }
    }
    return newObj;
  }
  return obj;
}
