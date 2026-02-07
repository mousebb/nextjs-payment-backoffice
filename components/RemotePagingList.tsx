'use client';

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import ActionsDropdown, { ActionItem } from './ActionsDropdown';
import CommonSelect from './CommonSelect';
import CustomDateRangePicker from './CustomDateRangePicker';
import {
  MagnifyingGlassCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { ListColumn } from '../types/list';
import CustomCheckbox from './CustomCheckbox';
import { PlusIcon } from '@heroicons/react/24/solid';

interface RemotePagingListProps<T> {
  listTitle?: string;
  showSearchBar?: boolean;
  columns: ListColumn<T>[];
  data: T[];
  totalItems: number;
  isLoading: boolean;
  error?: string | null;
  searchPlaceholder?: string;
  searchTerm: string;
  onSearchTermChange: (v: string) => void;
  filters?: React.ReactNode;
  actions?: ActionItem[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortColumn: string;
  sortOrder: 'ASC' | 'DESC';
  onSort: (column: string) => void;
  showCheckboxColumn?: boolean;
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectRow?: (id: string, checked: boolean) => void;
  isAllOnPageSelected?: boolean;
  isIndeterminate?: boolean;
  renderToolbarExtra?: React.ReactNode;
  onRefresh?: () => void;
  onRowClick?: (row: T) => void;
  addButton?: { label: string; onClick: () => void; icon?: React.ReactNode };
}

function RemotePagingList<T extends { [key: string]: any }>({
  listTitle,
  showSearchBar = true,
  columns,
  data,
  totalItems,
  isLoading,
  error,
  searchTerm,
  searchPlaceholder,
  onSearchTermChange,
  filters,
  actions,
  currentPage,
  totalPages,
  onPageChange,
  sortColumn,
  sortOrder,
  onSort,
  showCheckboxColumn = false,
  selectedIds,
  onSelectAll,
  onSelectRow,
  isAllOnPageSelected,
  isIndeterminate,
  renderToolbarExtra,
  onRefresh,
  onRowClick,
  addButton,
}: RemotePagingListProps<T>) {
  const [inputValue, setInputValue] = useState(searchTerm);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInputValue(searchTerm);
  }, [searchTerm]);

  // 新增：输入/粘贴后自动防抖搜索
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (inputValue !== searchTerm) {
        onSearchTermChange(inputValue);
      }
    }, 1000);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [inputValue]);

  // 监听全局刷新事件
  useEffect(() => {
    const handleGlobalRefresh = () => {
      if (onRefresh) {
        onRefresh();
      }
    };

    window.addEventListener('refreshBasicData', handleGlobalRefresh);

    return () => {
      window.removeEventListener('refreshBasicData', handleGlobalRefresh);
    };
  }, [onRefresh]);

  // 渲染表头
  const renderHeader = () => (
    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs leading-normal">
      {showCheckboxColumn && (
        <th className="py-3 px-2 font-normal">
          <CustomCheckbox
            isRound={false}
            checked={isAllOnPageSelected || false}
            indeterminate={isIndeterminate || false}
            onChange={e => onSelectAll?.(e.target.checked)}
          />
        </th>
      )}
      {columns.map(col => (
        <th
          key={col.key as string}
          className={`py-3 px-2 font-normal cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group whitespace-nowrap ${col.align ? `text-${col.align}` : ''}`}
          onClick={col.sortable ? () => onSort(col.key as string) : undefined}
          title={col.titleTooltip}
        >
          <div
            className={`flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-between'}`}
          >
            {col.title}
            {col.sortable && (
              <span
                className={`${col.align === 'right' ? 'ml-2' : col.align === 'center' ? 'ml-2' : 'ml-2'} opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                {sortColumn === col.key ? (
                  sortOrder === 'ASC' ? (
                    <ChevronUpIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  )
                ) : (
                  <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                )}
              </span>
            )}
          </div>
        </th>
      ))}
    </tr>
  );

  // 渲染表体
  const renderBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td
            colSpan={columns.length + (showCheckboxColumn ? 1 : 0)}
            className="py-6 px-4 text-center text-gray-500 dark:text-gray-400"
          >
            Loading...
          </td>
        </tr>
      );
    }
    if (error) {
      return (
        <tr>
          <td
            colSpan={columns.length + (showCheckboxColumn ? 1 : 0)}
            className="py-6 px-4 text-center text-red-500 dark:text-red-400"
          >
            {error}
          </td>
        </tr>
      );
    }
    if (!data || data.length === 0) {
      return (
        <tr>
          <td
            colSpan={columns.length + (showCheckboxColumn ? 1 : 0)}
            className="py-6 px-4 text-center text-gray-500 dark:text-gray-400"
          >
            No data found.
          </td>
        </tr>
      );
    }
    return data.map((row, idx) => (
      <tr
        key={row.id || idx}
        className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 ${onRowClick ? 'cursor-pointer' : ''}`}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
      >
        {showCheckboxColumn && (
          <td className="py-3 px-4">
            <CustomCheckbox
              checked={selectedIds?.has(row.id) || false}
              onChange={e => onSelectRow?.(row.id, e.target.checked)}
            />
          </td>
        )}
        {columns.map(col => (
          <td
            key={col.key as string}
            className={`py-3 px-2 whitespace-nowrap ${col.align ? `text-${col.align}` : ''}`}
          >
            {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
          </td>
        ))}
      </tr>
    ));
  };

  // 渲染分页
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage, endPage;
    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
      const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
      if (currentPage <= maxPagesBeforeCurrent) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - maxPagesBeforeCurrent;
        endPage = currentPage + maxPagesAfterCurrent;
      }
    }
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-1 mx-1 rounded-md text-sm font-medium ${currentPage === i ? 'bg-sky-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
        >
          {i}
        </button>
      );
    }
    return (
      <div className="flex justify-between items-center mt-0 px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Page {currentPage} of {totalPages} (Total: {totalItems})
        </div>
        <div className="flex">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-md text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />{' '}
            <span className="hidden sm:block ml-2">Previous</span>
          </button>
          <span className="hidden sm:block">
            {startPage > 1 && (
              <button
                onClick={() => onPageChange(1)}
                className="px-3 py-1 mx-1 rounded-md text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                1
              </button>
            )}
            {startPage > 2 && (
              <span className="px-3 py-1 text-gray-500 dark:text-gray-400">
                ...
              </span>
            )}
            {pageNumbers}
            {endPage < totalPages - 1 && (
              <span className="px-3 py-1 text-gray-500 dark:text-gray-400">
                ...
              </span>
            )}
            {endPage < totalPages && (
              <button
                onClick={() => onPageChange(totalPages)}
                className="px-3 py-1 mx-1 rounded-md text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                {totalPages}
              </button>
            )}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-md text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <span className="hidden sm:block mr-2">Next</span>{' '}
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    );
  };

  // 渲染工具栏
  const renderToolbar = () => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex-1">
        {listTitle && !showSearchBar && (
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            {listTitle}
          </h3>
        )}
        {showSearchBar && (
          <div className="flex flex-wrap mt-2 items-center w-full md:space-x-2">
            <div className="relative mb-2 md:flex-1 w-full md:w-auto">
              <input
                type="text"
                placeholder={searchPlaceholder || 'Search...'}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onPaste={e => setInputValue(e.currentTarget.value)}
                className="w-full px-2.5 py-1.5 pr-14 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 font-normal"
              />
              {inputValue && setInputValue && (
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                  onClick={() => setInputValue('')}
                  tabIndex={-1}
                  aria-label="Clear search"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              )}
              {/* 搜索按钮可移除或保留但不强制点击 */}
              {/* <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                  onClick={() => onSearchTermChange(inputValue)}
                  tabIndex={-1}
                  aria-label="Confirm search"
                >
                  <MagnifyingGlassCircleIcon className="h-5 w-5" />
                </button> */}
            </div>
            {filters}
            {renderToolbarExtra}
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2 ml-4">
        {addButton && (
          <button
            onClick={addButton.onClick}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addButton.icon || <PlusIcon className="h-5 w-5" />}
            {/* <span className="hidden sm:block ml-2">{addButton.label}</span> */}
          </button>
        )}
        {actions && actions.length > 0 && (
          <ActionsDropdown actions={actions} isLoading={isLoading} />
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
      {renderToolbar()}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead>{renderHeader()}</thead>
          <tbody className="text-gray-700 dark:text-gray-300 text-sm">
            {renderBody()}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );
}

export default RemotePagingList;
