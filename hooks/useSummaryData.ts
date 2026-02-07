import { useState, useCallback } from 'react';
import { CONFIG } from '@/constants/config';

export function useSummaryData({
  apiRoute,
  accessibleMerchantIds,
  summaryTimeParams,
  authFetch,
  checkUserAccess,
}: {
  apiRoute: string;
  accessibleMerchantIds?: string[] | string | null;
  summaryTimeParams?: string;
  authFetch: typeof fetch;
  checkUserAccess: () => { shouldProceed: boolean; error?: string };
}) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 权限检查
    const accessCheck = checkUserAccess();
    if (!accessCheck.shouldProceed) {
      setError(accessCheck.error || 'No access');
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      let summaryApiUrl = CONFIG.API_BASE_URL + apiRoute;
      let merchantIdParamValue: string | null = null;

      if (accessibleMerchantIds) {
        if (Array.isArray(accessibleMerchantIds)) {
          if (accessibleMerchantIds.length > 0) {
            merchantIdParamValue = accessibleMerchantIds.join(',');
          }
        } else if (typeof accessibleMerchantIds === 'string') {
          merchantIdParamValue = accessibleMerchantIds;
        }
      }

      const paramsArr: string[] = [];
      if (merchantIdParamValue) {
        paramsArr.push(
          `merchant_id=${encodeURIComponent(merchantIdParamValue)}`
        );
      }
      if (summaryTimeParams) {
        paramsArr.push(summaryTimeParams);
      }
      if (paramsArr.length > 0) {
        summaryApiUrl += `?${paramsArr.join('&')}`;
      }

      const response = await authFetch(summaryApiUrl);

      if (!response) throw new Error('No response');
      let result: any;
      try {
        result = await response.json();
      } catch {
        result = { message: 'Failed to fetch summary' };
      }
      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }
      setSummary(result);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [
    apiRoute,
    accessibleMerchantIds,
    summaryTimeParams,
    authFetch,
    checkUserAccess,
  ]);

  return {
    summary,
    loading,
    error,
    fetchSummary,
    setSummary,
    setError,
    setLoading,
  };
}
