import React from 'react';

export interface ListColumn<T> {
  key: keyof T | string;
  title: string | React.ReactNode;
  titleTooltip?: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

export interface FilterField {
  key: string;
  placeholder?: string;
  value?: string;
}

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  itemName?: string;
}

interface AddButtonConfig {
  label: string;
  onClick: () => void;
}

export interface ActionDropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

// 为了向后兼容，保留原有的类型别名
export type RemotePagingListColumn<T> = ListColumn<T>;
