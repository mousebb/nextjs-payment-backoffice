import React from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
  XCircleIcon,
  DocumentCheckIcon,
  MinusCircleIcon,
} from '@heroicons/react/24/outline';

// Summary item type
export interface SummaryItem {
  count: string;
  amount: string;
  rate?: string;
}

export interface TransactionSummaryBlock {
  title: string;
  summaryData: Record<string, SummaryItem>;
  typeLabels: Record<string, string>;
  loading?: boolean;
}

export interface TransactionSummaryProps {
  blocks: TransactionSummaryBlock[];
  formatRateForStatCard: (rate?: string) => string;
  period?: 'daily' | 'weekly' | 'monthly';
}

// Icon/color map for demo（可根据实际类型扩展）
const typeIconMap: Record<string, React.ReactNode> = {
  pending: (
    <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
  ),
  success: (
    <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
  ),
  failed: (
    <XCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
  ),
  cancelled: (
    <InformationCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-400" />
  ),
  submitted: (
    <PaperAirplaneIcon className="h-5 w-5 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
  ),
};
const typeBgMap: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-700 dark:bg-opacity-25',
  success: 'bg-green-100 dark:bg-green-700 dark:bg-opacity-25',
  failed: 'bg-red-100 dark:bg-red-700 dark:bg-opacity-25',
  cancelled: 'bg-gray-100 dark:bg-gray-600 dark:bg-opacity-25',
  submitted: 'bg-blue-100 dark:bg-blue-600 dark:bg-opacity-25',
};

const TransactionSummary: React.FC<TransactionSummaryProps> = ({
  blocks,
  formatRateForStatCard,
  period,
}) => (
  <div className="space-y-6">
    {blocks.map((block, idx) => (
      <div key={block.title || idx}>
        {/* <div className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-200">{block.title}</div> */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {Object.entries(block.summaryData).map(([type, item]) => {
            // 判断是否为 withdrawal 区块
            const isWithdrawal = idx === 1;
            // 选择 icon 和 bg
            let icon, bg;
            if (isWithdrawal) {
              // withdrawal 专属
              if (type === 'success') {
                icon = (
                  <DocumentCheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 dark:text-violet-400" />
                );
                bg = 'bg-violet-100 dark:bg-violet-600 dark:bg-opacity-25';
              } else if (type === 'failed') {
                icon = (
                  <MinusCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                );
                bg = 'bg-orange-100 dark:bg-orange-600 dark:bg-opacity-25';
              } else if (type === 'submitted') {
                icon = (
                  <PaperAirplaneIcon className="h-5 w-5 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                );
                bg = 'bg-blue-100 dark:bg-blue-600 dark:bg-opacity-25';
              } else {
                icon = (
                  <InformationCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                );
                bg = 'bg-gray-100 dark:bg-gray-600 dark:bg-opacity-25';
              }
            } else {
              // payment 默认
              if (type === 'pending') {
                icon = (
                  <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
                );
                bg = 'bg-yellow-100 dark:bg-yellow-700 dark:bg-opacity-25';
              } else if (type === 'success') {
                icon = (
                  <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                );
                bg = 'bg-green-100 dark:bg-green-700 dark:bg-opacity-25';
              } else if (type === 'failed') {
                icon = (
                  <XCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
                );
                bg = 'bg-red-100 dark:bg-red-700 dark:bg-opacity-25';
              } else if (type === 'submitted') {
                icon = (
                  <PaperAirplaneIcon className="h-5 w-5 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                );
                bg = 'bg-blue-100 dark:bg-blue-600 dark:bg-opacity-25';
              } else {
                icon = (
                  <InformationCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                );
                bg = 'bg-gray-100 dark:bg-gray-600 dark:bg-opacity-25';
              }
            }
            return (
              <div
                key={type}
                className={`bg-white dark:bg-gray-800 p-3 sm:p-5 rounded-lg shadow flex items-center justify-between min-w-0`}
              >
                <div className="min-w-0">
                  <p className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100 flex items-baseline break-words">
                    {block.loading ? '...' : (item?.count ?? '0')}
                    <span className="ml-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {block.loading ? '' : formatRateForStatCard(item?.rate)}
                    </span>
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-words">
                    {block.typeLabels[type] || type}
                  </p>
                </div>
                <div
                  className={`p-2 sm:p-2.5 ${bg} rounded-md ${block.loading ? 'animate-pulse' : ''}`}
                >
                  {icon}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

export default TransactionSummary;
