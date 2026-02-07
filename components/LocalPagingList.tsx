//Fake pagination, get full list from api
import React from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XCircleIcon,
  CheckIcon,
  NoSymbolIcon,
  PlusIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import ActionsDropdown from './ActionsDropdown';
import { ENUM_CONFIG } from '../constants/config';
import { ListColumn, ActionDropdownItem } from '../types/list';

interface AddButtonConfig {
  label: string;
  onClick: () => void;
}

interface LocalPagingListProps<T> {
  titleIcon?: React.ReactNode;
  listTitle?: string;
  columns: ListColumn<T>[];
  rawData: T[];
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  filterFunction?: (item: T, searchTerm: string) => boolean;
  sortColumn?: string;
  sortOrder?: ENUM_CONFIG.ASC | ENUM_CONFIG.DESC;
  onSort?: (column: string) => void;
  itemsPerPage?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  error?: string | null;
  addButton?: AddButtonConfig;
  actions?: ActionDropdownItem[];
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  onFilteredDataChange?: (filteredData: T[]) => void;
  onRefresh?: () => void;
  showSearchBar?: boolean;
  filters?: React.ReactNode;
  rowPadding?: string;
}

function LocalPagingList<T extends { [key: string]: any }>({
  titleIcon,
  listTitle,
  columns,
  rawData,
  searchTerm = '',
  onSearchTermChange,
  filterFunction,
  sortColumn,
  sortOrder,
  onSort,
  itemsPerPage = 10,
  currentPage = 1,
  onPageChange,
  isLoading,
  error,
  addButton,
  actions,
  onRowClick,
  searchPlaceholder = 'Search...',
  onFilteredDataChange,
  onRefresh,
  showSearchBar = true,
  filters,
  rowPadding = 'py-3',
}: LocalPagingListProps<T>) {
  // Filter
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return rawData;
    if (filterFunction)
      return rawData.filter(item => filterFunction(item, searchTerm));
    // 默认模糊匹配所有字段
    const lower = searchTerm.toLowerCase();
    return rawData.filter(item =>
      Object.values(item).some(val => {
        if (val == null) return false;
        if (typeof val === 'string') return val.toLowerCase().includes(lower);
        if (typeof val === 'number') return val.toString().includes(lower);
        if (typeof val === 'boolean') return val.toString().includes(lower);
        if (Array.isArray(val)) {
          return val.some(v => {
            if (v == null) return false;
            if (typeof v === 'string') return v.toLowerCase().includes(lower);
            if (typeof v === 'object' && v.name)
              return v.name.toLowerCase().includes(lower);
            return v.toString().toLowerCase().includes(lower);
          });
        }
        if (typeof val === 'object' && val.name)
          return val.name.toLowerCase().includes(lower);
        return false;
      })
    );
  }, [rawData, searchTerm, filterFunction]);

  // Sort
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return filteredData;
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let aValue: any = (a as any)[sortColumn];
      let bValue: any = (b as any)[sortColumn];

      // 处理 null/undefined 值
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // 处理数组类型
      if (Array.isArray(aValue))
        aValue = aValue.map(x => x?.name || x || '').join(', ');
      if (Array.isArray(bValue))
        bValue = bValue.map(x => x?.name || x || '').join(', ');

      // 处理布尔类型
      if (typeof aValue === 'boolean') aValue = aValue ? 1 : 0;
      if (typeof bValue === 'boolean') bValue = bValue ? 1 : 0;

      // 转换为字符串进行比较
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (aValue < bValue) return sortOrder === ENUM_CONFIG.ASC ? -1 : 1;
      if (aValue > bValue) return sortOrder === ENUM_CONFIG.ASC ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortColumn, sortOrder]);

  // Pagination
  const totalPages =
    itemsPerPage > 0 ? Math.ceil(sortedData.length / itemsPerPage) : 1;
  const pagedData = React.useMemo(() => {
    if (!itemsPerPage || itemsPerPage <= 0) return sortedData;
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // 渲染表头
  const renderHeader = () => (
    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs leading-normal">
      {columns.map(col => (
        <th
          key={col.key as string}
          className={`py-3 pl-4 font-normal ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group' : ''} whitespace-nowrap ${col.align ? `text-${col.align}` : ''}`}
          onClick={
            onSort && col.sortable !== false
              ? () => onSort(col.key as string)
              : undefined
          }
          title={col.titleTooltip}
        >
          <div
            className={`flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-between'}`}
          >
            {col.title}
            {col.sortable !== false && (
              <span
                className={`${col.align === 'right' ? 'ml-2' : col.align === 'center' ? 'ml-2' : 'ml-2'} opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                {sortColumn === col.key ? (
                  sortOrder === ENUM_CONFIG.ASC ? (
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

  // 通用状态Badge
  function StatusBadge({ enabled }: { enabled: boolean }) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          enabled
            ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:bg-opacity-25 dark:text-green-500'
            : 'bg-red-100 text-red-700 dark:bg-red-700 dark:bg-opacity-25 dark:text-red-400'
        }`}
      >
        {enabled ? (
          <CheckIcon className="h-3.5 w-3.5 mr-1" />
        ) : (
          <NoSymbolIcon className="h-3.5 w-3.5 mr-1" />
        )}
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
    );
  }

  // 渲染表体
  const renderBody = () => {
    if (isLoading) {
      return [
        <tr key="loading">
          <td
            colSpan={columns.length}
            className="py-6 pl-4 text-center text-gray-500 dark:text-gray-400"
          >
            Loading...
          </td>
        </tr>,
      ];
    }
    if (error) {
      return [
        <tr key="error">
          <td
            colSpan={columns.length}
            className="py-6 pl-4 text-center text-red-500 dark:text-red-400"
          >
            {error}
          </td>
        </tr>,
      ];
    }
    if (!pagedData || pagedData.length === 0) {
      return [
        <tr key="no-data">
          <td
            colSpan={columns.length}
            className="py-6 pl-4 text-center text-gray-500 dark:text-gray-400"
          >
            No data found.
          </td>
        </tr>,
      ];
    }
    return pagedData.map((row, idx) => (
      <tr
        key={row.id || idx}
        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 "
        // onClick={onRowClick ? () => onRowClick(row) : undefined}
      >
        {columns.map(col => (
          <td
            key={col.key as string}
            className={`${rowPadding} pl-4 whitespace-nowrap ${col.align ? `text-${col.align}` : ''}`}
          >
            {col.render ? (
              col.render(row[col.key], row)
            ) : col.key === 'enabled' || col.key === 'status' ? (
              <StatusBadge enabled={!!row[col.key]} />
            ) : (
              row[col.key]
            )}
          </td>
        ))}
      </tr>
    ));
  };

  // 渲染工具栏
  const renderToolbar = () => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex-1">
        {listTitle && !showSearchBar && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {listTitle}
          </h3>
        )}
        {showSearchBar && (
          <div className="flex flex-wrap mt-2 items-center w-full md:space-x-2">
            <div className="relative mb-2 md:flex-1 w-full md:w-auto">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => {
                  if (onSearchTermChange) {
                    onSearchTermChange(e.target.value);
                    // Reset to first page when searching
                    if (onPageChange) {
                      onPageChange(1);
                    }
                  }
                }}
                className="w-full px-2.5 py-1.5 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-normal"
              />
              {searchTerm && onSearchTermChange && (
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                  onClick={() => onSearchTermChange('')}
                  tabIndex={-1}
                  aria-label="Clear search"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            {filters}
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2 ml-4">
        {addButton && (
          <button
            onClick={addButton.onClick}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        )}
        {actions && actions.length > 0 && <ActionsDropdown actions={actions} />}
      </div>
    </div>
  );

  // 渲染分页
  const renderPagination = () => {
    if (!onPageChange || totalPages <= 1) return null;
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
      <div className="flex justify-between items-center mt-0 pl-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Page {currentPage} of {totalPages}
          {typeof sortedData.length === 'number' && (
            <> (Total: {sortedData.length})</>
          )}
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

  // 监听全局刷新事件
  React.useEffect(() => {
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

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg flex flex-col">
      {renderToolbar()}
      <div className="flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-left">
            <thead>{renderHeader()}</thead>
            <tbody className="text-gray-700 dark:text-gray-300 text-sm">
              {renderBody()}
            </tbody>
          </table>
        </div>
      </div>
      {renderPagination()}
    </div>
  );
}

export default LocalPagingList;
