import React, { useEffect, useState } from 'react';
import { CONFIG } from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, formatDateByUser } from '@/lib/utils';
import { AmountStyleBadge, TransactionTypeBadge } from './Common';
import { useAuth } from './AuthContext';

// Account transaction type
interface AccountTransaction {
  id: string;
  source_type: string;
  source_action: string;
  amount: string;
  currency_code: string;
  balance_after: string;
  reserved_balance_after: string;
  created_at: string;
}

interface AccountDetailsProps {
  sourceId: string;
  sourceType?: string; // 'payment', 'withdrawal', 'refund' etc.
  title?: string;
  include_related_types?: string;
  refreshTrigger?: number;
}

const AccountDetails: React.FC<AccountDetailsProps> = ({
  sourceId,
  sourceType = 'payment',
  title = 'Account Details',
  include_related_types = '',
  refreshTrigger = 0,
}) => {
  const { user } = useAuth();
  const [accountTxs, setAccountTxs] = useState<AccountTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch account transactions
  const fetchAccountTxs = async () => {
    if (!sourceId) return;
    setIsLoading(true);
    setError(null);
    const include_related_types_str = include_related_types
      ? `&include_related_types=${include_related_types}`
      : '';
    try {
      const res = await authFetch(
        CONFIG.API_BASE_URL +
          API_ROUTES.MERCHANT_ACCOUNTS_TRANSACTIONS +
          `?source_id=${sourceId}${include_related_types_str}`
      );
      if (res && res.ok) {
        const result = await res.json();
        setAccountTxs(result.data || []);
      } else {
        setAccountTxs([]);
        setError('Failed to fetch account transactions');
      }
    } catch {
      setAccountTxs([]);
      setError('Failed to fetch account transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountTxs();
  }, [sourceId, refreshTrigger]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : accountTxs.length === 0 ? (
          <div className="text-center text-gray-400">
            No account transactions
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400">
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Action</th>
                  <th className="px-2 py-1 text-right">Amount</th>
                  <th className="px-2 py-1 text-left">Currency</th>
                  <th className="px-2 py-1 text-right">Bal.After</th>
                  <th className="px-2 py-1 text-right">Res.After</th>
                  <th className="px-2 py-1 text-left">Created At</th>
                </tr>
              </thead>
              <tbody>
                {accountTxs.map(tx => (
                  <tr
                    key={tx.id}
                    className="border-t border-gray-100 dark:border-gray-700"
                  >
                    <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                      <TransactionTypeBadge type={tx.source_type} />
                    </td>
                    <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                      {tx.source_action}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <AmountStyleBadge
                        content={tx.amount}
                        action={tx.source_action}
                      />
                    </td>
                    <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                      {tx.currency_code}
                    </td>
                    <td className="px-2 py-2 text-right text-gray-900 dark:text-gray-100">
                      {tx.balance_after}
                    </td>
                    <td className="px-2 py-2 text-right text-gray-900 dark:text-gray-100">
                      {tx.reserved_balance_after}
                    </td>
                    <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                      {formatDateByUser(
                        tx.created_at,
                        user?.metadata?.data_time_format
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountDetails;
