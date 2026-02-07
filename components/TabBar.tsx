import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface TabItem {
  id: string;
  type: string;
  title: string;
  props?: Record<string, any>;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  closeTab: (id: string) => void;
  isMobile?: boolean;
}

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  setActiveTabId,
  closeTab,
  isMobile,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showArrows, setShowArrows] = useState(false);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);

  useEffect(() => {
    const checkOverflow = () => {
      const el = scrollRef.current;
      if (el) {
        setShowArrows(el.scrollWidth > el.clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [tabs.length]);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' });
  };

  return (
    <div
      className={clsx(
        'relative w-full hidden md:flex items-center pl-1 pr-2',
        isMobile
          ? 'bg-white rounded-lg dark:bg-gray-800 mr-3 ml-3'
          : 'bg-gray-100 dark:bg-gray-900'
      )}
    >
      {/* 左箭头 */}
      {showArrows && (
        <button onClick={scrollLeft} className="z-10 px-2 ">
          <ChevronLeftIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </button>
      )}

      {/* 滚动区域 */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto no-scrollbar">
        <div
          className={`flex space-x-2 py-1 ${showArrows ? '' : 'px-4'} text-gray-600 dark:text-gray-400`}
        >
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            const showClose = isActive || hoveredTabId === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                onMouseEnter={() => setHoveredTabId(tab.id)}
                onMouseLeave={() => setHoveredTabId(null)}
                className={clsx(
                  'relative flex items-center flex-shrink-0 py-1 rounded truncate',
                  isActive ? 'font-bold px-2' : 'text-sm',
                  isMobile
                    ? isActive
                      ? 'bg-gray-100 dark:bg-gray-900 px-2'
                      : 'bg-white dark:bg-gray-800'
                    : isActive
                      ? 'bg-white dark:bg-gray-700 px-2'
                      : 'bg-gray-100 dark:bg-gray-900'
                )}
              >
                <span
                  className="truncate"
                  title={tab.title.length > 20 ? tab.title : ''}
                >
                  {tab.title.length > 20
                    ? tab.title.slice(0, 20) + '...'
                    : tab.title}
                </span>

                {/* 预留固定宽度的关闭按钮容器 */}
                <span
                  className="ml-2 flex items-center justify-center"
                  // 保证宽高和按钮大小相同，且固定占位
                >
                  <span
                    onClick={e => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="text-gray-400 hover:text-red-700 cursor-pointer select-none"
                    style={{
                      opacity: showClose ? 1 : 0,
                      pointerEvents: showClose ? 'auto' : 'none',
                    }}
                  >
                    ×
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右箭头 */}
      {showArrows && (
        <button onClick={scrollRight} className="z-10 px-2">
          <ChevronRightIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </button>
      )}
    </div>
  );
};

export default TabBar;
