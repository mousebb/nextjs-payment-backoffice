'use client';

import {
  MagnifyingGlassIcon,
  XMarkIcon,
  UsersIcon, // Merchant List
  CurrencyDollarIcon, // Payment List
  BuildingLibraryIcon, // Bank List
  ShieldCheckIcon, // Roles
  UserPlusIcon, // Add Merchant
  ArrowUturnLeftIcon, // Refund List
  ArrowDownOnSquareIcon, // Withdrawal List
  ShieldExclamationIcon, // Chargeback List
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch } from '@/lib/utils';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult?: (
    type: 'payment' | 'refund' | 'withdrawal' | 'account-transaction',
    id: string,
    data?: any
  ) => void;
}

interface SearchItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  category: string;
  href?: string;
}

// Category: Popular Searches / Key Actions
const popularSearches: SearchItem[] = [
  {
    id: 'merchant-list',
    label: 'Merchant List',
    icon: UsersIcon,
    category: 'Popular Searches',
    href: '/merchants',
  },
  {
    id: 'payment-list',
    label: 'Payment List',
    icon: CurrencyDollarIcon,
    category: 'Popular Searches',
    href: '/payments',
  },
  {
    id: 'bank-list',
    label: 'Bank List',
    icon: BuildingLibraryIcon,
    category: 'Popular Searches',
    href: '/banks',
  },
  {
    id: 'roles',
    label: 'Roles',
    icon: ShieldCheckIcon,
    category: 'Popular Searches',
    href: '/roles',
  },
];

// Category: Apps / Management Modules
const apps: SearchItem[] = [
  {
    id: 'payment-list',
    label: 'Payment List',
    icon: CurrencyDollarIcon,
    category: 'Management Modules',
  },
  {
    id: 'withdrawal-list',
    label: 'Withdrawal List',
    icon: ArrowDownOnSquareIcon,
    category: 'Management Modules',
  },
  {
    id: 'refund-list',
    label: 'Refund List',
    icon: ArrowUturnLeftIcon,
    category: 'Management Modules',
  },
  {
    id: 'account-transaction-list',
    label: 'Account Transaction List',
    icon: BuildingLibraryIcon,
    category: 'Management Modules',
  },
];

const allItems = [...popularSearches, ...apps];

const SearchModal = ({ isOpen, onClose, onSelectResult }: SearchModalProps) => {
  const t = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<SearchItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchType, setSearchType] = useState<
    'payment' | 'withdrawal' | 'refund'
  >('payment');
  const [includeAccountTransaction, setIncludeAccountTransaction] =
    useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // 关闭对话框时清理搜索状态
  const handleClose = () => {
    setSearchTerm('');
    setFilteredItems([]);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(''); // Reset search term when modal opens
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredItems([]);
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase();
      setFilteredItems(
        allItems.filter(
          item =>
            item.label.toLowerCase().includes(lowerSearchTerm) ||
            item.category.toLowerCase().includes(lowerSearchTerm)
        )
      );
    }
  }, [searchTerm]);

  useEffect(() => {
    let ignore = false;
    const doSearch = async () => {
      setSearchResult(null);
      setSearchError('');
      if (!searchTerm.trim()) {
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      try {
        let url = '';
        let notFoundMsg = '';
        if (includeAccountTransaction) {
          url = `${CONFIG.API_BASE_URL}${API_ROUTES.MERCHANT_ACCOUNTS_TRANSACTIONS}?source_type=${searchType}&source_id=${encodeURIComponent(searchTerm.trim())}`;
          notFoundMsg = 'No account transaction found';
        } else if (searchType === 'payment') {
          url = `${CONFIG.API_BASE_URL}${API_ROUTES.PAYMENTS}?payment_id=${encodeURIComponent(searchTerm.trim())}`;
          notFoundMsg = 'No payment found';
        } else if (searchType === 'refund') {
          url = `${CONFIG.API_BASE_URL}${API_ROUTES.REFUNDS}?refund_id=${encodeURIComponent(searchTerm.trim())}`;
          notFoundMsg = 'No refund found';
        } else if (searchType === 'withdrawal') {
          url = `${CONFIG.API_BASE_URL}${API_ROUTES.WITHDRAWALS}?withdrawal_id=${encodeURIComponent(searchTerm.trim())}`;
          notFoundMsg = 'No withdrawal found';
        } else {
          setSearchLoading(false);
          return;
        }
        const res = await authFetch(url);
        if (!res || !res.ok) {
          setSearchResult(null);
          setSearchError(notFoundMsg);
        } else {
          const result = await res.json();
          const arr = Array.isArray(result.data) ? result.data : [];
          if (arr.length > 0) {
            setSearchResult(arr);
            setSearchError('');
          } else {
            setSearchResult(null);
            setSearchError(notFoundMsg);
          }
        }
      } catch {
        setSearchResult(null);
        setSearchError('Search failed');
      } finally {
        setSearchLoading(false);
      }
    };
    if (
      (searchType === 'payment' && searchTerm.trim()) ||
      (searchType === 'refund' && searchTerm.trim()) ||
      (searchType === 'withdrawal' && searchTerm.trim())
    ) {
      doSearch();
    } else {
      setSearchResult(null);
      setSearchError('');
    }
    return () => {
      ignore = true;
    };
  }, [searchType, includeAccountTransaction, searchTerm]);

  const handleResultClick = (
    type: 'payment' | 'refund' | 'withdrawal' | 'account-transaction',
    id: string,
    data?: any
  ) => {
    if (onSelectResult) {
      onSelectResult(type, id, data);
    }
    handleClose();
  };

  if (!isOpen) return null;

  const renderItems = (items: SearchItem[]) => {
    return items.map(item => (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          if (onSelectResult) {
            if (item.id === 'payment-list')
              onSelectResult('payment', '', { view: 'payment-list' });
            else if (item.id === 'withdrawal-list')
              onSelectResult('withdrawal', '', { view: 'withdrawal-list' });
            else if (item.id === 'refund-list')
              onSelectResult('refund', '', { view: 'refund-list' });
            else if (item.id === 'account-transaction-list')
              onSelectResult('account-transaction', '', {
                view: 'account-transactions',
              });
          }
          handleClose();
        }}
        className="flex items-center w-full p-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md group text-left"
      >
        {item.icon ? (
          <item.icon className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500 group-hover:text-sky-500 dark:group-hover:text-sky-400" />
        ) : (
          <div className="w-5 h-5 mr-3"></div>
        )}
        {item.label}
      </button>
    ));
  };

  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, SearchItem[]>
  );

  // 新增：radio group + checkbox UI
  const renderPopularSearchRadio = () => (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2.5">
        Popular Searches
      </h3>
      <div className="flex flex-col space-y-2 px-2.5">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name="searchType"
            value="payment"
            checked={searchType === 'payment'}
            onChange={() => setSearchType('payment')}
            className="form-radio text-sky-600"
          />
          <span className="text-sm">Payment</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name="searchType"
            value="withdrawal"
            checked={searchType === 'withdrawal'}
            onChange={() => setSearchType('withdrawal')}
            className="form-radio text-sky-600"
          />
          <span className="text-sm">Withdrawal</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name="searchType"
            value="refund"
            checked={searchType === 'refund'}
            onChange={() => setSearchType('refund')}
            className="form-radio text-sky-600"
          />
          <span className="text-sm">Refund</span>
        </label>
      </div>
      <div className="mt-3 px-2.5">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={includeAccountTransaction}
            onChange={e => setIncludeAccountTransaction(e.target.checked)}
            className="form-checkbox text-sky-600"
          />
          <span className="text-sm">Account Transaction</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-75 transition-opacity">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl transform transition-all"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center w-full">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="w-full py-1.5 text-base bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            {searchTerm && (
              <button
                type="button"
                className="mr-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                onClick={() => {
                  setSearchTerm('');
                  inputRef.current?.focus();
                }}
                tabIndex={0}
                aria-label="Clear search"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          <div>
            <kbd className="px-1.5 py-0.5 border text-gray-400 border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700">
              Esc
            </kbd>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Close (Esc)"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-2 sm:p-4 max-h-[60vh] overflow-y-auto">
          {searchTerm.trim() === '' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <div>{renderPopularSearchRadio()}</div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2.5">
                  Management Modules
                </h3>
                {renderItems(apps)}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <div>{renderPopularSearchRadio()}</div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2.5">
                    Management Modules
                  </h3>
                  {renderItems(apps)}
                </div>
              </div>
              {searchTerm.trim() &&
                (searchType === 'payment' ||
                  searchType === 'refund' ||
                  searchType === 'withdrawal') && (
                  <div className="mt-2 w-full">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2.5">
                      {t('SearchModal.searchResult')}
                    </h3>
                    <div className="px-2.5 py-2">
                      {searchLoading ? (
                        <span className="text-gray-400 text-sm">
                          {t('SearchModal.searching')}
                        </span>
                      ) : Array.isArray(searchResult) ? (
                        searchResult.map(item => (
                          <button
                            key={item.id || item.source_id}
                            type="button"
                            className="text-sky-600 hover:underline text-sm bg-transparent border-0 p-0 cursor-pointer block w-full text-left"
                            onClick={() => {
                              if (
                                includeAccountTransaction ||
                                item.source_type
                              ) {
                                handleResultClick(
                                  'account-transaction',
                                  item.source_id,
                                  item
                                );
                              } else if (searchType === 'payment') {
                                handleResultClick('payment', item.id, item);
                              } else if (searchType === 'refund') {
                                handleResultClick('refund', item.id, item);
                              } else if (searchType === 'withdrawal') {
                                handleResultClick('withdrawal', item.id, item);
                              }
                            }}
                          >
                            {includeAccountTransaction || item.source_type
                              ? `${item.source_id} (Account Transaction)`
                              : item.id}
                          </button>
                        ))
                      ) : searchError ? (
                        <span className="text-red-500 text-sm">
                          {searchType === 'payment' && includeAccountTransaction
                            ? t('SearchModal.notFoundAccountTransaction')
                            : searchType === 'payment'
                              ? t('SearchModal.notFoundPayment')
                              : searchType === 'refund'
                                ? t('SearchModal.notFoundRefund')
                                : searchType === 'withdrawal'
                                  ? t('SearchModal.notFoundWithdrawal')
                                  : searchError}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
