import {
  MagnifyingGlassIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon, // For System theme, though we are not implementing it now
  ChevronDownIcon, // For dropdown indicator
  LanguageIcon, // Added LanguageIcon
  Bars3Icon,
  ArrowPathRoundedSquareIcon,
  UserIcon,
  UserCircleIcon,
  ArrowRightCircleIcon,
} from '@heroicons/react/24/outline';
import { useTheme, Theme } from '@/components/ThemeContext'; // Import useTheme
import { useState, useEffect, useRef } from 'react'; // Import hooks
import SearchModal from './SearchModal'; // Import the new SearchModal
import { clearBasicDataCache } from '@/lib/basic-data.service';
import ToastNotify from './ToastNotify';
import { useTransition } from 'react';
import { Locale } from '@/i18n/config';
import { setUserLocale } from '@/lib/locale';
import { LOCALE_LABELS } from '@/constants/locales';
import { useAuth } from './AuthContext';
import ProfileModal from './ProfileModal';
import TabBar from './TabBar';
import { TabItem } from './TabBar';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import NotificationIndicator from './NotificationIndicator';
import NotificationDropdown from './NotificationDropdown';
import { useTranslations } from 'next-intl';

interface TopbarProps {
  onOpenSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  sidebarHovering?: boolean;
  onSelectSearchResult?: (
    type: 'payment' | 'refund' | 'withdrawal' | 'account-transaction',
    id: string,
    data?: any
  ) => void;
  tabs: TabItem[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  closeTab: (id: string) => void;
  openTab: (tab: TabItem) => void;
}

const Topbar = ({
  onOpenSidebar,
  isSidebarCollapsed,
  sidebarHovering,
  onSelectSearchResult,
  tabs,
  activeTabId,
  setActiveTabId,
  closeTab,
  openTab,
}: TopbarProps) => {
  const { theme, setTheme } = useTheme();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false); // State for language dropdown
  const langDropdownRef = useRef<HTMLDivElement>(null); // Ref for language dropdown
  const [currentLang, setCurrentLang] = useState<string>(getInitialLang()); // State for current language
  const [isScrolled, setIsScrolled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { logoutSync, user } = useAuth();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const t = useTranslations();

  const toggleLangDropdown = () => setIsLangDropdownOpen(!isLangDropdownOpen); // Toggle for language dropdown

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const openSearchModal = () => setIsSearchModalOpen(true);
  const closeSearchModal = () => setIsSearchModalOpen(false);

  const handleLanguageChange = (newLang: string) => {
    setCurrentLang(newLang);
    setIsLangDropdownOpen(false);
    console.log(`Language changed to: ${newLang}`);
    const locale = newLang as Locale;
    startTransition(() => {
      setUserLocale(locale);
    });
  };

  // Refresh basic data TODO: May remove this later
  // const handleRefreshBasicData = async () => {
  //   setIsRefreshing(true);
  //   try {
  //     // 清除基础数据缓存
  //     clearBasicDataCache();

  //     // 触发全局刷新事件，通知所有组件刷新数据
  //     window.dispatchEvent(new CustomEvent('refreshBasicData'));

  //     ToastNotify.success('Basic data refreshed successfully');
  //   } catch (error) {
  //     ToastNotify.error('Failed to refresh basic data');
  //   } finally {
  //     setIsRefreshing(false);
  //   }
  // };

  // Close dropdowns if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 用户菜单点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const leftClass =
    !isSidebarCollapsed || sidebarHovering ? 'sm:left-64' : 'sm:left-20';
  return (
    <header
      className={`fixed top-0 ${leftClass} left-0 right-0 z-40 flex items-center h-16 px-4 md:px-1 transition-all duration-300 
        ${
          isScrolled
            ? `bg-white shadow-md rounded-lg dark:bg-gray-800 mr-2 ml-2 
            dark:shadow-[0_4px_6px_-1px_rgba(255,255,255,0.1),0_2px_4px_-2px_rgba(255,255,255,0.06)]`
            : ''
        }`}
    >
      {/* 菜单按钮：仅小屏显示 */}
      {onOpenSidebar && (
        <button
          className="md:hidden mr-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <Bars3Icon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
        </button>
      )}
      <div className="flex items-center space-x-3 md:space-x-4 overflow-hidden">
        {/* <button 
          onClick={openSearchModal}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Search (Ctrl+K)"
        >
          <MagnifyingGlassIcon className="h-6 w-6" />
        </button> */}
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          setActiveTabId={(id: string) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', id);
            router.push(`${pathname}?${params.toString()}`, { scroll: false });

            // 立即更新状态（防止延迟渲染）
            setActiveTabId(id);
          }}
          closeTab={closeTab}
          isMobile={isScrolled}
        />
      </div>
      <div className="flex-grow"></div>
      <div className="flex items-center space-x-3 md:space-x-4">
        <div className="relative" ref={langDropdownRef}>
          <button
            onClick={toggleLangDropdown}
            className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Change language"
          >
            <LanguageIcon className="h-6 w-6" />
            <ChevronDownIcon className="w-4 h-4 ml-1 text-gray-400 dark:text-gray-500" />
          </button>
          {isLangDropdownOpen && (
            <div className="absolute right-0 mt-2 min-w-24 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-30 border border-gray-200 dark:border-gray-700">
              {Object.entries(LOCALE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleLanguageChange(key)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center 
                    ${currentLang === key ? 'bg-sky-100 dark:bg-sky-600 text-sky-700 dark:text-sky-200' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <SunIcon className="h-6 w-6" />
          ) : (
            <MoonIcon className="h-6 w-6" />
          )}
        </button>
        {/* Refresh basic data TODO: May remove this later*/}
        {/* <button 
          onClick={handleRefreshBasicData}
          disabled={isRefreshing}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh basic data"
        >
          <ArrowPathRoundedSquareIcon className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button> */}
        <button
          onClick={openSearchModal}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Search (Ctrl+K)"
        >
          <MagnifyingGlassIcon className="h-6 w-6" />
        </button>

        <NotificationIndicator
          ref={bellRef}
          onClick={() => setNotificationOpen(v => !v)}
        />
        <NotificationDropdown
          open={isNotificationOpen}
          anchorRef={bellRef}
          onClose={() => setNotificationOpen(false)}
          onViewAll={() => {
            setNotificationOpen(false); // 关闭下拉
            openTab({
              id: 'notifications',
              type: 'notifications',
              title: t('Sidebar.notifications'),
            }); // 保证Tab存在
          }}
        />

        {/* 用户头像按钮及下拉菜单 */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setIsUserDropdownOpen(v => !v)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
            title="User menu"
          >
            <UserIcon className="h-6 w-6" />
          </button>
          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 min-w-24 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-30 border border-gray-200 dark:border-gray-700">
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-700 dark:hover:bg-opacity-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setIsUserDropdownOpen(false);
                  setIsProfileModalOpen(true);
                }}
              >
                <UserCircleIcon className="h-5 w-5 mr-3" /> Profile
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-700 dark:hover:bg-opacity-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setIsUserDropdownOpen(false);
                  logoutSync();
                }}
              >
                <ArrowRightCircleIcon className="h-5 w-5 mr-3" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={closeSearchModal}
        onSelectResult={onSelectSearchResult}
      />
      {/* 用户Profile弹窗 */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
};

const getInitialLang = () => {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : 'en';
  }
  return 'en';
};

export default Topbar;
