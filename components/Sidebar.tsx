'use client';

import React, { useState, useEffect, useMemo } from 'react';
// import Link from 'next/link'; // Link component might not be needed for all items if using navigation functions
import {
  HomeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  CreditCardIcon,
  CogIcon,
  ArrowsRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusSmallIcon,
  PlusCircleIcon,
  CurrencyDollarIcon,
  ArrowPathRoundedSquareIcon,
  MapIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  ShareIcon,
  EllipsisVerticalIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useTranslations } from 'next-intl';
import { TabItem } from './TabBar';

interface SubMenuItem {
  key: string; // 必须为必填
  name: string;
  path: string; // Path for highlighting, still useful
  action?: () => void; // Optional action for navigation
  icon?: React.ReactElement<{ className?: string }> | null; // Adjusted icon type
}

interface MenuItem extends SubMenuItem {
  subItems?: SubMenuItem[];
}

// menuItems will be defined inside the component to use navigation functions

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: (isCollapsed: boolean) => void;
  setHovering?: (hovering: boolean) => void;
  openTab: (tab: TabItem) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  activeTabType?: string;
}

const Sidebar = ({
  isCollapsed,
  onToggleCollapse,
  setHovering,
  openTab,
  isMobileOpen = false,
  onCloseMobile,
  activeTabType,
  ...props
}: SidebarProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const { logout, isLoading: authIsLoading, isAuthenticated, user } = useAuth();
  const { can } = usePermission();
  const [isHovering, setIsHovering] = useState(false);
  const [isManualCollapse, setIsManualCollapse] = useState(false);
  const t = useTranslations();
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      {
        key: 'dashboard',
        name: t('Sidebar.dashboard'),
        path: '/',
        icon: <HomeIcon />,
        action: () =>
          openTab({
            id: 'dashboard',
            type: 'dashboard',
            title: t('Sidebar.dashboard'),
          }),
      },
    ];

    if (can('statement', 'view')) {
      const statementsSubItems = [
        {
          key: 'statements-daily',
          name: t('Sidebar.statements-daily'),
          path: '/?view=statements-daily',
          action: () =>
            openTab({
              id: 'statements-daily',
              type: 'statements-daily',
              title: 'Daily Statement',
            }),
          icon: null,
        },
        {
          key: 'statements-monthly',
          name: t('Sidebar.statements-monthly'),
          path: '/?view=statements-monthly',
          action: () =>
            openTab({
              id: 'statements-monthly',
              type: 'statements-monthly',
              title: 'Monthly Statement',
            }),
          icon: null,
        },
        {
          key: 'statements-income',
          name: t('Sidebar.statements-income'),
          path: '/?view=statements-income',
          action: () =>
            openTab({
              id: 'statements-income',
              type: 'statements-income',
              title: 'Income Statement',
            }),
          icon: null,
        },
      ];
      if (statementsSubItems.length > 0) {
        items.push({
          key: 'statements',
          name: t('Sidebar.statements'),
          path: '/statements',
          icon: <DocumentTextIcon />,
          subItems: statementsSubItems,
        });
      }
    }

    if (can('commission_log', 'view')) {
      const commissionSubItems = [
        {
          key: 'commission-logs',
          name: t('Sidebar.commission-logs'),
          path: '/?view=commission-logs',
          action: () =>
            openTab({
              id: 'commission-logs',
              type: 'commission-logs',
              title: 'Commission Logs',
            }),
          icon: null,
        },
        {
          key: 'settlement',
          name: t('Sidebar.settlement'),
          path: '/?view=settlement',
          action: () =>
            openTab({
              id: 'settlement',
              type: 'settlement',
              title: 'Settlement',
            }),
          icon: null,
        },
      ];

      items.push({
        key: 'commission',
        name: t('Sidebar.commission'),
        path: '/commission',
        icon: <BanknotesIcon />,
        subItems: commissionSubItems,
      });
    }

    // 商户相关菜单
    if (can('merchant', 'view')) {
      const merchantSubItems = [
        {
          key: 'merchant-list',
          name: t('Sidebar.merchant-list'),
          path: '/?view=merchant-list',
          action: () =>
            openTab({
              id: 'merchant-list',
              type: 'merchant-list',
              title: t('Sidebar.merchant-list'),
            }),
          icon: null,
        },
      ];
      if (can('merchant_account', 'view')) {
        merchantSubItems.push({
          key: 'merchant-accounts',
          name: t('Sidebar.merchant-accounts'),
          path: '/?view=merchant-accounts',
          action: () =>
            openTab({
              id: 'merchant-accounts',
              type: 'merchant-accounts',
              title: t('Sidebar.merchant-accounts'),
            }),
          icon: null,
        });
      }

      items.push({
        key: 'merchants',
        name: t('Sidebar.merchants'),
        path: '/merchants',
        icon: <UserGroupIcon />,
        subItems: merchantSubItems,
      });
    }

    // 账户交易菜单 - 独立显示，不依赖 merchant:view 权限
    if (can('merchant_account_transaction', 'view')) {
      items.push({
        key: 'account-transactions',
        name: t('Sidebar.account-transactions'),
        path: '/?view=account-transactions',
        icon: <ArrowsRightLeftIcon />,
        action: () =>
          openTab({
            id: 'account-transactions',
            type: 'account-transactions',
            title: t('Sidebar.account-transactions'),
          }),
      });
    }

    // 网关相关菜单
    if (can('gateway', 'view')) {
      const gatewaySubItems = [
        {
          key: 'gateway-list',
          name: t('Sidebar.gateway-list'),
          path: '/?view=gateways',
          action: () =>
            openTab({
              id: 'gateway-list',
              type: 'gateway-list',
              title: t('Sidebar.gateway-list'),
            }),
          icon: null,
        },
      ];
      if (can('gateway_status_code', 'view')) {
        gatewaySubItems.push({
          key: 'gateway-status-codes',
          name: t('Sidebar.gateway-status-codes'),
          path: '/?view=gateway-status-codes',
          action: () =>
            openTab({
              id: 'gateway-status-codes',
              type: 'gateway-status-codes',
              title: t('Sidebar.gateway-status-codes'),
            }),
          icon: null,
        });
      }

      items.push({
        key: 'gateways',
        name: t('Sidebar.gateways'),
        path: '/gateways',
        icon: <MapIcon />,
        subItems: gatewaySubItems,
      });
    }

    // 其他管理菜单
    if (can('bank', 'view')) {
      items.push({
        key: 'banks',
        name: t('Sidebar.banks'),
        path: '/?view=banks',
        icon: <BuildingLibraryIcon />,
        action: () =>
          openTab({ id: 'banks', type: 'banks', title: t('Sidebar.banks') }),
      });
    }
    if (can('router', 'view')) {
      items.push({
        key: 'routers',
        name: t('Sidebar.routers'),
        path: '/?view=routers',
        icon: <ShareIcon />,
        action: () =>
          openTab({
            id: 'routers',
            type: 'routers',
            title: t('Sidebar.routers'),
          }),
      });
    }

    // Rules 菜单
    const rulesSubItems = [];
    if (can('rule', 'view')) {
      rulesSubItems.push({
        key: 'rule-list',
        name: t('Sidebar.rule-list'),
        path: '/?view=rule-list',
        action: () =>
          openTab({
            id: 'rule-list',
            type: 'rule-list',
            title: t('Sidebar.rule-list'),
          }),
        icon: null,
      });
    }
    if (can('transaction_rule', 'view')) {
      rulesSubItems.push({
        key: 'transaction-rules',
        name: t('Sidebar.transaction-rules'),
        path: '/?view=transaction-rules',
        action: () =>
          openTab({
            id: 'transaction-rules',
            type: 'transaction-rules',
            title: t('Sidebar.transaction-rules'),
          }),
        icon: null,
      });
    }
    if (rulesSubItems.length > 0) {
      items.push({
        key: 'rules',
        name: t('Sidebar.rules'),
        path: '/rules',
        icon: <ShieldExclamationIcon />,
        subItems: rulesSubItems,
      });
    }

    // 交易相关菜单
    const transactionSubItems = [];
    if (can('payment', 'view')) {
      transactionSubItems.push({
        key: 'payment-list',
        name: t('Sidebar.payment-list'),
        path: '/?view=payments',
        action: () =>
          openTab({
            id: 'payment-list',
            type: 'payment-list',
            title: t('Sidebar.payment-list'),
          }),
        icon: null,
      });
    }
    if (can('withdrawal', 'view')) {
      transactionSubItems.push({
        key: 'withdrawal-list',
        name: t('Sidebar.withdrawal-list'),
        path: '/?view=withdrawals',
        action: () =>
          openTab({
            id: 'withdrawal-list',
            type: 'withdrawal-list',
            title: t('Sidebar.withdrawal-list'),
          }),
        icon: null,
      });
    }
    if (can('refund', 'view')) {
      transactionSubItems.push({
        key: 'refund-list',
        name: t('Sidebar.refund-list'),
        path: '/?view=refunds',
        action: () =>
          openTab({
            id: 'refund-list',
            type: 'refund-list',
            title: t('Sidebar.refund-list'),
          }),
        icon: null,
      });
    }

    // if (can('chargeback', 'view')) {
    //   transactionSubItems.push({ key: 'chargeback-list', name: t('Sidebar.chargeback-list'), path: '/?view=chargebacks', action: navigateToChargebackList, icon: null });
    // }

    if (transactionSubItems.length > 0) {
      items.push({
        key: 'transactions',
        name: t('Sidebar.transactions'),
        path: '/transactions',
        icon: <CreditCardIcon />,
        subItems: transactionSubItems,
      });
    }

    // 设置菜单
    const settingsSubItems = [];
    if (can('access_log', 'view')) {
      settingsSubItems.push({
        key: 'access-logs',
        name: t('Sidebar.access-logs'),
        path: '/?view=access-logs',
        action: () =>
          openTab({
            id: 'access-logs',
            type: 'access-logs',
            title: t('Sidebar.access-logs'),
          }),
        icon: null,
      });
    }
    if (can('notification', 'view')) {
      settingsSubItems.push({
        key: 'notifications',
        name: t('Sidebar.notifications'),
        path: '/?view=notifications',
        action: () =>
          openTab({
            id: 'notifications',
            type: 'notifications',
            title: t('Sidebar.notifications'),
          }),
        icon: null,
      });
    }
    if (can('settlement_method', 'view')) {
      settingsSubItems.push({
        key: 'settlement-methods',
        name: t('Sidebar.settlement-methods'),
        path: '/?view=settlement-methods',
        action: () =>
          openTab({
            id: 'settlement-methods',
            type: 'settlement-methods',
            title: t('Sidebar.settlement-methods'),
          }),
        icon: null,
      });
    }
    if (can('transaction_method', 'view')) {
      settingsSubItems.push({
        key: 'transaction-methods',
        name: t('Sidebar.transaction-methods'),
        path: '/?view=transaction-methods',
        action: () =>
          openTab({
            id: 'transaction-methods',
            type: 'transaction-methods',
            title: t('Sidebar.transaction-methods'),
          }),
        icon: null,
      });
    }
    if (can('currency', 'view')) {
      settingsSubItems.push({
        key: 'currencies',
        name: t('Sidebar.currencies'),
        path: '/?view=currencies',
        action: () =>
          openTab({
            id: 'currencies',
            type: 'currencies',
            title: t('Sidebar.currencies'),
          }),
        icon: null,
      });
    }
    if (can('status_code', 'view')) {
      settingsSubItems.push({
        key: 'status-codes',
        name: t('Sidebar.status-codes'),
        path: '/?view=status-codes',
        action: () =>
          openTab({
            id: 'status-codes',
            type: 'status-codes',
            title: t('Sidebar.status-codes'),
          }),
        icon: null,
      });
    }
    // Roles 和 Permissions 菜单（假设权限为 role:view 和 permission:view）
    if (can('role', 'edit')) {
      settingsSubItems.push({
        key: 'roles',
        name: t('Sidebar.roles'),
        path: '/?view=roles',
        action: () =>
          openTab({ id: 'roles', type: 'roles', title: t('Sidebar.roles') }),
        icon: null,
      });
    }
    if (can('permission', 'view')) {
      settingsSubItems.push({
        key: 'permissions',
        name: t('Sidebar.permissions'),
        path: '/?view=permissions',
        action: () =>
          openTab({
            id: 'permissions',
            type: 'permissions',
            title: t('Sidebar.permissions'),
          }),
        icon: null,
      });
    }
    // Users 菜单（假设权限为 user:view，action 可自定义）
    if (can('user', 'view')) {
      settingsSubItems.push({
        key: 'users',
        name: t('Sidebar.users'),
        path: '/?view=users',
        action: () =>
          openTab({ id: 'users', type: 'users', title: t('Sidebar.users') }),
        icon: null,
      });
    }
    if (settingsSubItems.length > 0) {
      items.push({
        key: 'settings',
        name: t('Sidebar.settings'),
        path: '/settings',
        icon: <CogIcon />,
        subItems: settingsSubItems,
      });
    }

    return items;
  }, [user?.permissions, openTab, t, can]);

  useEffect(() => {
    if (isCollapsed && !isHovering) {
      setOpenMenus({});
    } else if (activeTabType) {
      // 自动展开包含当前激活tab的父菜单
      const newOpenMenus: Record<string, boolean> = {};
      menuItems.forEach(item => {
        if (
          item.subItems &&
          item.subItems.some(sub => sub.key === activeTabType)
        ) {
          newOpenMenus[item.key] = true;
        }
      });
      setOpenMenus(newOpenMenus);
    } else {
      const view = searchParams.get('view');
      const paymentId = searchParams.get('payment');
      const withdrawalId = searchParams.get('withdrawal');
      const sourceView = searchParams.get('sourceView');
      const merchantId = searchParams.get('merchant');
      const newOpenMenus: Record<string, boolean> = {};
      menuItems.forEach(item => {
        if (item.subItems) {
          const isSubItemParentCurrentlyActive = item.subItems.some(sub => {
            if (paymentId) {
              // If on a payment detail page
              if (
                sub.path === '/?view=payments' &&
                sourceView === 'payment-list'
              )
                return true;
            } else if (withdrawalId) {
              // If on a withdrawal detail page
              if (
                sub.path === '/?view=withdrawals' &&
                sourceView === 'withdrawal-list'
              )
                return true;
            } else if (merchantId && view === 'merchant-detail') {
              // If on a merchant detail page
              if (
                sub.path === '/?view=merchant-list' &&
                sourceView === 'merchant-list'
              )
                return true;
            } else {
              // Not on a detail page, check view parameter for list pages
              if (sub.path === '/?view=merchant-list' && view === 'merchants')
                return true;
              if (
                sub.path === '/?view=merchant-accounts' &&
                view === 'merchant-accounts'
              )
                return true;
              if (
                sub.path === '/?view=account-transactions' &&
                view === 'account-transactions'
              )
                return true;
              if (sub.path === '/?view=payments' && view === 'payments')
                return true;
              if (sub.path === '/?view=refunds' && view === 'refunds')
                return true;
              if (sub.path === '/?view=withdrawals' && view === 'withdrawals')
                return true;
              if (sub.path === '/?view=chargebacks' && view === 'chargebacks')
                return true;
              if (sub.path === '/?view=gateways' && view === 'gateways')
                return true;
              if (sub.path === '/?view=rule-list' && view === 'rule-list')
                return true;
              if (
                sub.path === '/?view=transaction-rules' &&
                view === 'transaction-rules'
              )
                return true;
              if (pathname === sub.path) return true; // For paths like /merchants/add
            }
            return false;
          });

          if (isSubItemParentCurrentlyActive) {
            newOpenMenus[item.key] = true;
          } else if (
            item.key === 'dashboard' &&
            paymentId &&
            sourceView === 'dashboard'
          ) {
            // This case is for when a payment detail is shown originating from dashboard, dashboard itself is not a subitem parent
            // But we don't want to collapse other menus in this case.
            // The dashboard itself is handled by isDashboardActive, this useEffect is for opening parent menus.
          }
        }
      });
      setOpenMenus(newOpenMenus);
    }
  }, [pathname, searchParams, isCollapsed, menuItems, activeTabType]);

  const handleToggleMenu = (key: string) => {
    if (showSidebarExpanded) {
      setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleMenuItemClick = (action?: () => void) => {
    if (action) {
      action();
    }
    if (onCloseMobile) onCloseMobile(); // 移动端点击菜单后自动关闭 sidebar
  };

  // 高亮/展开逻辑：根据 activeTabType 判断
  const isSubItemActive = (subItem: SubMenuItem) =>
    subItem.key === activeTabType;
  const isParentItemActive = (item: MenuItem) => {
    // 只在 key 匹配时高亮，dashboard 不特殊处理
    if (item.key === activeTabType) return true;
    if (item.subItems) {
      return item.subItems.some(sub => sub.key === activeTabType);
    }
    return false;
  };

  // Helper function to check if Dashboard should be active
  const isDashboardActive = () => {
    const view = searchParams.get('view');
    const paymentId = searchParams.get('payment');
    const sourceView = searchParams.get('sourceView');

    if (paymentId) {
      // On a payment detail page
      return sourceView === 'dashboard';
    }
    // Original logic: Dashboard is active when on home page without view/payment parameter
    return pathname === '/' && !view && !paymentId;
  };

  // 只在PC端折叠时响应悬停
  const handleMouseEnter = () => {
    if (isCollapsed && window.innerWidth >= 768 && !isManualCollapse)
      setIsHovering(true);
  };
  const handleMouseLeave = () => {
    if (isCollapsed && window.innerWidth >= 768 && !isManualCollapse)
      setIsHovering(false);
  };

  // 折叠/展开按钮点击时，优先手动操作，短暂忽略悬停
  const handleCollapseClick = (toCollapsed: boolean) => {
    setIsManualCollapse(true);
    setIsHovering(false);
    onToggleCollapse(toCollapsed);
    setTimeout(() => setIsManualCollapse(false), 200);
  };

  const showSidebarExpanded = !isCollapsed || isHovering;

  if (authIsLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  // 通用菜单渲染组件
  function SidebarMenuContent({
    showSidebarExpanded,
    menuItems,
    openMenus,
    handleToggleMenu,
    handleMenuItemClick,
    isParentItemActive,
    isSubItemActive,
    logout,
  }: {
    showSidebarExpanded: boolean;
    menuItems: MenuItem[];
    openMenus: Record<string, boolean>;
    handleToggleMenu: (key: string) => void;
    handleMenuItemClick: (action?: () => void) => void;
    isParentItemActive: (item: MenuItem) => boolean;
    isSubItemActive: (subItem: SubMenuItem) => boolean;
    logout: () => void;
  }) {
    return (
      <nav className="flex-grow overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-900">
        <ul>
          {menuItems.map(item => (
            <li key={item.key} className="mb-1">
              {item.subItems ? (
                <>
                  <button
                    onClick={() => handleToggleMenu(item.key)}
                    disabled={!showSidebarExpanded}
                    className={`truncate w-full flex items-center p-2.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none 
                                ${showSidebarExpanded ? 'justify-between' : 'justify-center'}
                                ${
                                  isParentItemActive(item) &&
                                  showSidebarExpanded
                                    ? 'bg-sky-100 dark:bg-sky-700 text-sky-600 dark:text-sky-300'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                  >
                    <div className="flex items-center">
                      {item.icon &&
                        React.cloneElement(item.icon, {
                          className: `h-5 w-5 ${isParentItemActive(item) ? 'text-sky-600 dark:text-sky-300' : ''}`,
                        })}
                      {showSidebarExpanded && (
                        <span className="ml-3 text-sm font-medium">
                          {item.name}
                        </span>
                      )}
                    </div>
                    {showSidebarExpanded &&
                      item.subItems &&
                      (openMenus[item.key] ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      ))}
                  </button>
                  {showSidebarExpanded && openMenus[item.key] && (
                    <ul className="pl-6 mt-1 space-y-1">
                      {item.subItems.map(subItem => (
                        <li key={subItem.key}>
                          <button
                            onClick={() => handleMenuItemClick(subItem.action)}
                            className={`truncate w-full flex items-center py-2 px-3 text-xs rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 
                                        ${
                                          isSubItemActive(subItem)
                                            ? 'bg-sky-100 dark:bg-sky-700 text-sky-600 dark:text-sky-300'
                                            : 'text-gray-600 dark:text-gray-400'
                                        }`}
                          >
                            {subItem.icon &&
                              React.cloneElement(subItem.icon, {
                                className: `h-4 w-4 mr-2 ${isSubItemActive(subItem) ? 'text-sky-500' : ''}`,
                              })}
                            {subItem.icon === null && (
                              <MinusSmallIcon className="h-4 w-4 mr-2 invisible" />
                            )}{' '}
                            {/* Placeholder for alignment if no icon */}
                            <span
                              className={`${subItem.icon === undefined && showSidebarExpanded ? 'ml-0' : ''}`}
                            >
                              {subItem.name}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <button
                  onClick={() => handleMenuItemClick(item.action)}
                  className={`truncate w-full flex items-center p-2.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 
                              ${showSidebarExpanded ? '' : 'justify-center'}
                              ${
                                item.key === activeTabType &&
                                showSidebarExpanded
                                  ? 'bg-sky-100 dark:bg-sky-700 text-sky-600 dark:text-sky-300'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                >
                  {item.icon &&
                    React.cloneElement(item.icon, {
                      className: `h-5 w-5 ${item.key === activeTabType ? 'text-sky-600 dark:text-sky-300' : ''}`,
                    })}
                  {showSidebarExpanded && (
                    <span className="ml-3 text-sm font-medium">
                      {item.name}
                    </span>
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  // sidebarContent为aside内容
  const sidebarContent = (
    <aside
      className={`text-gray-700 dark:text-gray-300 flex flex-col h-full transition-all duration-300 ease-in-out ${showSidebarExpanded ? 'w-64' : 'w-20'} p-4`}
    >
      <div
        className={`flex items-center mb-8 ${showSidebarExpanded ? 'justify-between' : 'justify-center'}`}
      >
        {showSidebarExpanded && (
          <>
            <button
              onClick={() =>
                openTab({
                  id: 'dashboard',
                  type: 'dashboard',
                  title: t('Sidebar.dashboard'),
                })
              }
              className="truncate text-xl font-semibold text-gray-800 dark:text-gray-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              Next.JS Payment
            </button>
            {/* Collapse按钮：PC端显示在右侧 */}
            <button
              onClick={() => handleCollapseClick(!isCollapsed)}
              className="flex items-center p-2.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 
                              justify-center
                              text-gray-700 dark:text-gray-300"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? (
                <ListBulletIcon className="h-4 w-4" />
              ) : (
                <EllipsisVerticalIcon className="h-4 w-4" />
              )}
            </button>
          </>
        )}
        {/* PC端折叠时的展开按钮 */}
        {!showSidebarExpanded && (
          <button
            onClick={() => handleCollapseClick(false)}
            className="flex items-center p-2.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 
                                justify-center
                                text-gray-700 dark:text-gray-300"
            title="Expand Sidebar"
          >
            <ListBulletIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <SidebarMenuContent
        showSidebarExpanded={showSidebarExpanded}
        menuItems={menuItems}
        openMenus={openMenus}
        handleToggleMenu={handleToggleMenu}
        handleMenuItemClick={handleMenuItemClick}
        isParentItemActive={isParentItemActive}
        isSubItemActive={isSubItemActive}
        logout={logout}
      />
    </aside>
  );

  return (
    <>
      {/* PC端Sidebar：静态布局，折叠时支持悬停自动展开 */}
      <div
        className="hidden md:flex h-full"
        onMouseEnter={e => {
          handleMouseEnter();
          if (isCollapsed && typeof setHovering === 'function')
            setHovering(true);
        }}
        onMouseLeave={e => {
          handleMouseLeave();
          if (isCollapsed && typeof setHovering === 'function')
            setHovering(false);
        }}
      >
        {sidebarContent}
      </div>
      {/* 移动端抽屉Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            onClick={onCloseMobile}
          ></div>
          <div className="relative w-64 h-full">
            <aside className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 flex flex-col h-full transition-all duration-300 ease-in-out w-64 p-4 z-50">
              {/* 顶部栏：标题+关闭按钮 */}
              <div className="flex items-center justify-between mb-8">
                <span className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Next.JS Payment
                </span>
                <button
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full focus:outline-none"
                  onClick={onCloseMobile}
                  aria-label="Close sidebar"
                >
                  ✕
                </button>
              </div>
              <SidebarMenuContent
                showSidebarExpanded={true}
                menuItems={menuItems}
                openMenus={openMenus}
                handleToggleMenu={handleToggleMenu}
                handleMenuItemClick={handleMenuItemClick}
                isParentItemActive={isParentItemActive}
                isSubItemActive={isSubItemActive}
                logout={logout}
              />
            </aside>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
