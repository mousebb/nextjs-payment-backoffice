'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import ToastNotify from './ToastNotify';
import { clearBasicDataCache } from '@/lib/basic-data.service';
import { createPortal } from 'react-dom';

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  // 新增 radio group 支持
  type?: 'radio-group';
  value?: string;
  options?: { label: string; value: string }[];
  onChange?: (val: string) => void;
}

interface ActionsDropdownProps {
  actions: ActionItem[];
  triggerIcon?: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  itemClassName?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
}

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({
  actions,
  triggerIcon,
  isLoading,
  disabled = false,
  itemClassName = 'w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed',
  buttonClassName = 'p-2 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed',
  dropdownClassName = 'bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700 w-auto whitespace-nowrap min-w-[120px]',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  const toggleDropdown = () => {
    if (!isLoading && !disabled) {
      if (!isOpen && dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        });
      }
      setIsOpen(!isOpen);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 检查点击是否在下拉菜单内部
      const target = event.target as Element;
      const dropdownElement = document.querySelector(
        '[data-dropdown="actions-dropdown"]'
      );

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        dropdownElement &&
        !dropdownElement.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen && dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        });
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  // Refresh basic data
  const handleRefreshBasicData = async () => {
    setIsRefreshing(true);
    try {
      // 清除基础数据缓存
      clearBasicDataCache();

      // 触发全局刷新事件，通知所有组件刷新数据
      window.dispatchEvent(new CustomEvent('refreshBasicData'));
    } catch (error) {
      ToastNotify.error('Failed to refresh basic data');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!actions || actions.length === 0) {
    // 当没有 actions 时，仍然显示一个禁用的按钮
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          title="Actions"
          disabled={true}
          className={`${buttonClassName} opacity-50 cursor-not-allowed`}
        >
          {triggerIcon || <EllipsisVerticalIcon className="h-5 w-5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        title="Actions"
        disabled={isLoading || disabled}
        className={`${buttonClassName} ${isLoading || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {triggerIcon || <EllipsisVerticalIcon className="h-5 w-5" />}
      </button>
      {isOpen && createPortal(
        <div 
          className={dropdownClassName} 
          data-dropdown="actions-dropdown"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            right: dropdownPosition.right,
            zIndex: 9999
          }}
        >
          {/* 先找出 refresh 按钮和其它按钮 */}
          {(() => {
            const refreshIndex = actions.findIndex(
              a => a.label.toLowerCase() === 'refresh'
            );
            const refreshAction =
              refreshIndex !== -1 ? actions[refreshIndex] : null;
            const otherActions = actions.filter((_, i) => i !== refreshIndex);
            const renderAction = (action: ActionItem, index: number) => {
              if (action.type === 'radio-group' && action.options) {
                return (
                  <div key={index} className="px-4 py-2">
                    {/* <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{action.label}</div> */}
                    {action.options.map(opt => (
                      <label
                        key={opt.value}
                        className="flex items-center cursor-pointer py-1"
                      >
                        <input
                          type="radio"
                          name={`dropdown-radio-${index}`}
                          value={opt.value}
                          checked={action.value === opt.value}
                          onChange={() => {
                            if (action.onChange) action.onChange(opt.value);
                            setIsOpen(false);
                          }}
                          className="form-radio h-4 w-4 text-sky-600 border-gray-300 focus:ring-sky-500"
                        />
                        <span
                          className={
                            'ml-3 text-sm ' +
                            (action.value === opt.value
                              ? 'text-sky-600 font-semibold'
                              : 'text-gray-700 dark:text-gray-300')
                          }
                        >
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                );
              }
              // 普通按钮
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (action.onClick && !action.disabled) {
                      action.onClick();
                    }
                    setIsOpen(false); // Close dropdown after action
                    if (action.label.toLowerCase() === 'refresh') {
                      handleRefreshBasicData();
                      ToastNotify.info('Refreshed');
                    }
                  }}
                  className={
                    action.icon ? itemClassName + ' pr-3' : itemClassName
                  }
                  disabled={action.disabled || isLoading}
                >
                  {action.icon &&
                    (React.isValidElement(action.icon)
                      ? React.cloneElement(
                          action.icon as React.ReactElement<any>,
                          {
                            className:
                              'h-4 w-4 mr-2.5 ' +
                              ((action.icon as React.ReactElement<any>).props
                                .className || ''),
                          }
                        )
                      : action.icon)}
                  {action.label}
                </button>
              );
            };
            // 渲染 refresh 按钮在最上面
            return (
              <>
                {refreshAction && renderAction(refreshAction, -1)}
                {otherActions.map((action, i) => renderAction(action, i))}
              </>
            );
          })()}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ActionsDropdown;
