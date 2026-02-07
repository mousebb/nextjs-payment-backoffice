'use client';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { useAuth } from '@/components/AuthContext';
import { useEffect, useRef, useState } from 'react';
import MerchantList from '@/components/MerchantList';
import AccessDenied from '@/components/AccessDenied';
import dynamic from 'next/dynamic';
import {
  ACCESS_LOG_TYPE,
  DEFAULT_PAGE_SIZE,
  VIEW_LOG_WHITELIST,
  WEB_ACTION_METHODS,
} from '@/constants/config';
import { useAppRouter } from '@/hooks/useAppRouter';
import { usePermission } from '@/hooks/usePermission';
import { useTranslations } from 'next-intl';
import WithdrawalList from './_WithdrawalList';
import RefundList from './_RefundList';
import { viewMap } from '@/views/config';
import { TabItem } from './TabBar';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { recordAccessLog } from '@/lib/utils';
import TransactionList from './TransactionList';

// 动态导入大组件，避免 chunk entry 报错
const PaymentDetail = dynamic(() => import('@/components/PaymentDetail'), {
  ssr: false,
});
const MerchantDetail = dynamic(() => import('@/components/MerchantDetail'), {
  ssr: false,
});
const WithdrawalDetail = dynamic(
  () => import('@/components/WithdrawalDetail'),
  { ssr: false }
);
const PaymentList = dynamic(() => import('@/components/_PaymentList'), {
  ssr: false,
});
const DashboardContent = dynamic(
  () => import('@/components/DashboardContent'),
  { ssr: false }
);
// 其它大组件如有需要也可 dynamic

export default function ClientMainPage() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { can } = usePermission();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarHovering, setSidebarHovering] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const t = useTranslations();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [tabs, setTabs] = useState<TabItem[]>([
    { id: 'dashboard', type: 'dashboard', title: t('Sidebar.dashboard') },
  ]);

  // --- dashboard period 状态 ---
  const searchTab = searchParams.get('tab');
  const searchPeriod = searchParams.get('period');
  const [activeTabId, setActiveTabId] = useState(searchTab || 'dashboard');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>(
    searchPeriod === 'weekly' || searchPeriod === 'monthly'
      ? searchPeriod
      : 'daily'
  );

  // --- 监听 searchParams，URL 变化时同步 activeTabId/period ---
  useEffect(() => {
    const tabParam = searchParams.get('tab') || 'dashboard';
    setActiveTabId(tabParam);
    if (tabParam === 'dashboard') {
      const urlPeriod = searchParams.get('period');
      if (
        urlPeriod &&
        (urlPeriod === 'daily' ||
          urlPeriod === 'weekly' ||
          urlPeriod === 'monthly')
      ) {
        setPeriod(urlPeriod);
      }
    }
  }, [searchParams]);

  // --- openTab/closeTab 时才写 URL ---
  async function openTab(tab: TabItem) {
    setTabs(prev => {
      if (!prev.some(t => t.id === tab.id)) {
        return [...prev, tab];
      }
      return prev;
    });
    const params = new URLSearchParams();
    params.set('tab', tab.id);
    params.delete('period'); // 先删掉 period
    if (tab.id === 'dashboard') params.set('period', period);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setActiveTabId(tab.id);

    if (VIEW_LOG_WHITELIST.includes(tab.type)) {
      try {
        await recordAccessLog({
          path: `/${tab.type}`,
          type: ACCESS_LOG_TYPE.WEB,
          method: WEB_ACTION_METHODS.VIEW,
          user_id: user?.id,
          ip_address: user?.ip_address || '',
          status_code: 200,
          request: JSON.stringify({ tabId: tab.id, tabTitle: tab.title }),
          response: '',
          duration_ms: 0,
        });
      } catch (e) {
        // 忽略日志上报异常
      }
    } else {
      // console.log('tab.type', tab.type, 'is not in VIEW_LOG_WHITELIST');
    }
  }

  function closeTab(tabId: string) {
    let fallbackTabId = 'dashboard';
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (newTabs.length > 0) {
        if (activeTabId === tabId) {
          const closedIdx = prev.findIndex(t => t.id === tabId);
          const fallbackTab =
            prev[closedIdx - 1] || prev[closedIdx + 1] || newTabs[0];
          fallbackTabId = fallbackTab.id;
        } else {
          fallbackTabId = activeTabId;
        }
      }
      setActiveTabId(fallbackTabId);
      if (newTabs.length === 0) {
        return [
          { id: 'dashboard', type: 'dashboard', title: t('Sidebar.dashboard') },
        ];
      }
      return newTabs;
    });
    // 在 setTabs 之后做路由跳转
    setTimeout(() => {
      const params = new URLSearchParams();
      params.set('tab', fallbackTabId);
      params.delete('period');
      if (fallbackTabId === 'dashboard') params.set('period', period);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 0);
  }

  const hasMountedRef = useRef(false);
  // --- 新增：监听 activeTabId 变化同步 URL ---
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (activeTabId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', activeTabId);
      params.delete('period'); // 先删掉 period
      if (activeTabId === 'dashboard') params.set('period', period); // 只有 dashboard 才加 period
      // router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  // --- 移除 activeTabId/period 的 useEffect 副作用 ---

  // --- 浏览器前进/后退时自动同步 period 状态 ---
  useEffect(() => {
    const urlPeriod = searchParams.get('period');
    if (
      activeTabId === 'dashboard' &&
      urlPeriod &&
      urlPeriod !== period &&
      (urlPeriod === 'daily' ||
        urlPeriod === 'weekly' ||
        urlPeriod === 'monthly')
    ) {
      setPeriod(urlPeriod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, activeTabId]);

  // 1. 定义 handlePaymentSelect
  const handlePaymentSelect = (paymentId: string) => {
    openTab({
      id: `payment-detail:${paymentId}`,
      type: 'payment-detail',
      title: t('TabBar.payment') + `: ${paymentId}`,
      props: { paymentId },
    });
  };

  const handleMerchantSelect = (merchantId: string, merchantName: string) => {
    openTab({
      id: `merchant-detail:${merchantId}`,
      type: 'merchant-detail',
      title: t('TabBar.merchant') + `: ${merchantName}`,
      props: { merchantId },
    });
  };

  const handleWithdrawalSelect = (withdrawalId: string) => {
    openTab({
      id: `withdrawal-detail:${withdrawalId}`,
      type: 'withdrawal-detail',
      title: t('TabBar.withdrawal') + `: ${withdrawalId}`,
      props: { withdrawalId },
    });
  };

  const handleTransactionSelect = (
    transactionId: string,
    sourceType: 'payment' | 'withdrawal',
    sourceView: string
  ) => {
    if (sourceType === 'payment') {
      handlePaymentSelect(transactionId);
    } else if (sourceType === 'withdrawal') {
      handleWithdrawalSelect(transactionId);
    }
  };

  // Render content for the active tab
  function renderTabContent(tab: TabItem | undefined) {
    if (!tab)
      return (
        <DashboardContent
          onViewTransactionDetail={handleTransactionSelect}
          period={period}
          setPeriod={setPeriod}
        />
      );
    const entry = viewMap[tab.type as keyof typeof viewMap];
    if (!entry)
      return (
        <DashboardContent
          onViewTransactionDetail={handleTransactionSelect}
          period={period}
          setPeriod={setPeriod}
        />
      );
    const [resource, action] = entry.permission;
    if (resource && action && !can(resource, action)) {
      return <AccessDenied onBack={() => setActiveTabId('dashboard')} />;
    }
    const Component = entry.component;
    if (tab.type === 'dashboard') {
      return (
        <DashboardContent
          onViewTransactionDetail={handleTransactionSelect}
          period={period}
          setPeriod={setPeriod}
        />
      );
    }
    if (tab.type === 'merchant-list') {
      return (
        <MerchantList {...tab.props} onViewDetail={handleMerchantSelect} />
      );
    }
    if (tab.type === 'payment-list') {
      return (
        <TransactionList
          type="payment"
          {...tab.props}
          enablePagination={true}
          initialItemsPerPage={DEFAULT_PAGE_SIZE}
          showSearchBar={true}
          onViewTransactionDetail={handlePaymentSelect}
          searchPlaceholder="Search by Payment ID or Order ID..."
        />
      );
    }
    if (tab.type === 'withdrawal-list') {
      return (
        <TransactionList
          type="withdrawal"
          {...tab.props}
          onViewTransactionDetail={handleWithdrawalSelect}
          searchPlaceholder="Search by Withdrawal ID or Order ID..."
        />
      );
    }
    if (tab.type === 'refund-list') {
      return (
        <TransactionList
          type="refund"
          {...tab.props}
          onViewTransactionDetail={handlePaymentSelect}
          searchPlaceholder="Search by Refund ID or Payment ID..."
        />
      );
    }
    if (tab.type === 'payment-detail') {
      return (
        <PaymentDetail
          paymentId={tab.props?.paymentId}
          onBack={() => setActiveTabId('payment-list')}
        />
      );
    }
    if (tab.type === 'withdrawal-detail') {
      return (
        <WithdrawalDetail
          withdrawalId={tab.props?.withdrawalId}
          onBack={() => setActiveTabId('withdrawal-list')}
        />
      );
    }
    if (tab.type === 'merchant-detail') {
      return (
        <MerchantDetail
          merchantId={tab.props?.merchantId}
          onBack={() => setActiveTabId('merchant-list')}
        />
      );
    }

    // 其它组件直接传 props 或空对象
    return <Component {...(tab.props || {})} />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">
          Loading application...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // AuthProvider will handle redirect to /login
  }

  // Example: openTab usage in menu/handlers (to be used in Sidebar, Topbar, etc.)
  // openTab({ id: 'payment-list', type: 'payment-list', title: t('Sidebar.payment-list') });
  // openTab({ id: `payment-detail:${id}`, type: 'payment-detail', title: `Payment ${id.slice(0, 6)}`, props: { paymentId: id } });

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={setIsSidebarCollapsed}
        setHovering={setSidebarHovering}
        openTab={openTab}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        activeTabType={tabs.find(t => t.id === activeTabId)?.type}
      />
      <div className="w-screen overflow-hidden flex-1 flex flex-col transition-all duration-300 ease-in-out pt-16">
        <Topbar
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          sidebarHovering={sidebarHovering}
          tabs={tabs}
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
          closeTab={closeTab}
          openTab={openTab}
        />

        {isGlobalLoading && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-30">
            <div className="flex flex-col items-center">
              <svg
                className="animate-spin h-10 w-10 text-sky-600 mb-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                ></path>
              </svg>
              <span className="text-sky-700 dark:text-sky-300 text-lg font-medium">
                {t('Common.loading')}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-4 overflow-x-auto">
          {renderTabContent(tabs.find(t => t.id === activeTabId))}
        </main>
      </div>
    </div>
  );
}
