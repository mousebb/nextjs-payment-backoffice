import React, { useEffect, useState } from 'react';
import CustomDateRangePicker from './CustomDateRangePicker';
import CommonSelect from './CommonSelect';
import { authFetch, getUtcDate } from '@/lib/utils';
import { getBasicData } from '@/lib/basic-data.service';
import { API_ROUTES } from '@/constants/apiRoutes';
import { CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@react-types/shared';
import { CONFIG } from '@/constants/config';
import ToastNotify from './ToastNotify';
import ActionsDropdown from './ActionsDropdown';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomStackedBar from './CustomStackedBar';
import { useBasicData } from '@/hooks/useBasicData';

interface AccountInfo {
  merchant_account_id: string;
  currency_code: string;
  total_credit: string;
  total_debit: string;
  total_frozen: string;
  total_unfrozen: string;
  total_fees: string;
  credit_rate: string;
  debit_rate: string;
  frozen_rate: string;
  unfrozen_rate: string;
  fees_rate: string;
}

interface MerchantInfo {
  merchant_id: string;
  merchant_name: string;
  accounts: AccountInfo[];
}

// The API returns: Record<string, MerchantInfo[]>, where key is date string
interface DailyStatementData {
  [date: string]: MerchantInfo[];
}

const DailyStatement: React.FC = () => {
  // Date range state
  const today = new CalendarDate(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate()
  );
  const [dateRange, setDateRange] = useState<RangeValue<CalendarDate>>({
    start: today.subtract({ days: 4 }),
    end: today,
  });
  // Merchant selection state
  const [allMerchants, setAllMerchants] = useState<any[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<string>('');
  // Data state
  const [data, setData] = useState<DailyStatementData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // Helper: calculate days between two CalendarDate
  function getDaysBetween(
    start: CalendarDate | null | undefined,
    end: CalendarDate | null | undefined
  ) {
    if (!start || !end) return 0;
    const s = new Date(start.year, start.month - 1, start.day);
    const e = new Date(end.year, end.month - 1, end.day);
    return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  // Fetch merchant list on mount
  useEffect(() => {
    getBasicData('merchants', API_ROUTES.MERCHANTS_ACCESSIBLE).then(
      setAllMerchants
    );
  }, []);

  // Auto fetch on mount, and when dateRange or selectedMerchant changes
  useEffect(() => {
    // Only fetch if date range is valid
    if (dateRange.start && dateRange.end) {
      const days = getDaysBetween(dateRange.start, dateRange.end);
      if (
        days > parseInt(process.env.NEXT_PUBLIC_DAILY_STATEMENT_LIMIT || '7')
      ) {
        ToastNotify.error(
          `Max ${process.env.NEXT_PUBLIC_DAILY_STATEMENT_LIMIT} days allowed`
        );
        return;
      }
      fetchData();
    }
    // eslint-disable-next-line
  }, [dateRange, selectedMerchant]);

  // Query API
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) {
        params.append(
          'start',
          getUtcDate(dateRange.start.toString(), true).toISOString()
        );
      }
      if (dateRange.end) {
        params.append(
          'end',
          getUtcDate(dateRange.end.toString(), false).toISOString()
        );
      }
      if (selectedMerchant) {
        params.append('merchant_id', selectedMerchant);
      }
      const url =
        CONFIG.API_BASE_URL +
        API_ROUTES.STATEMENT_DAILY +
        '?' +
        params.toString();
      const response = await authFetch(url);
      if (!response) throw new Error('No response');
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || 'Failed to fetch data');
      setData(result || {});
    } catch (e: any) {
      setError(e.message || 'Unknown error');
      setData({});
    } finally {
      setIsLoading(false);
    }
  };

  // 导出 CSV
  const handleExportCSV = () => {
    if (!data || Object.keys(data).length === 0) {
      ToastNotify.error('No data to export');
      return;
    }
    // 扁平化数据
    const rows: any[] = [];
    Object.entries(data).forEach(([date, merchants]) => {
      merchants.forEach(merchant => {
        merchant.accounts.forEach(account => {
          rows.push({
            date,
            merchant: merchant.merchant_name,
            currency: account.currency_code,
            total_credit: account.total_credit,
            total_debit: account.total_debit,
            total_frozen: account.total_frozen,
            total_unfrozen: account.total_unfrozen,
            total_fees: account.total_fees,
          });
        });
      });
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    saveAs(blob, 'daily_statement.csv');
  };

  // 导出 PDF
  const handleExportPDF = () => {
    if (!data || Object.keys(data).length === 0) {
      ToastNotify.error('No data to export');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    const columns = [
      'Merchant',
      'Currency',
      'Total Credit',
      'Total Debit',
      'Total Frozen',
      'Total Unfrozen',
      'Total Fees',
    ];
    let currentY = 14;
    Object.entries(data)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([date, merchants], idx) => {
        // Add date title
        doc.text(`Date: ${date}`, 14, currentY);
        // Prepare rows
        const rows: any[] = [];
        merchants.forEach(merchant => {
          merchant.accounts.forEach(account => {
            rows.push([
              merchant.merchant_name,
              account.currency_code,
              account.total_credit,
              account.total_debit,
              account.total_frozen,
              account.total_unfrozen,
              account.total_fees,
            ]);
          });
        });
        // Add table, startY: currentY + 4
        autoTable(doc, {
          head: [columns],
          body: rows,
          startY: currentY + 4,
          styles: { fontSize: 8, overflow: 'linebreak' },
          headStyles: { fillColor: [33, 150, 243] },
          margin: { left: 14, right: 14 },
        });
        // 计算下一个分组的起始Y坐标
        currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 10;
        // 如果超出页面高度，autoTable 会自动分页，无需手动 addPage
      });
    doc.save('daily_statement.pdf');
  };

  // ActionsDropdown actions
  const actions = [
    {
      label: 'Refresh',
      onClick: () => fetchData(),
      disabled: isLoading,
    },
    {
      label: 'Export CSV',
      onClick: handleExportCSV,
      disabled: isLoading || !data || Object.keys(data).length === 0,
    },
    {
      label: 'Export PDF',
      onClick: handleExportPDF,
      disabled: isLoading || !data || Object.keys(data).length === 0,
    },
  ];

  // Table rendering
  const renderTable = () => {
    if (isLoading)
      return <div className="p-6 text-center text-gray-500">Loading...</div>;
    if (error)
      return <div className="p-6 text-center text-red-500">{error}</div>;
    if (!data || Object.keys(data).length === 0)
      return <div className="p-6 text-center text-gray-400">No data</div>;
    // Sort dates descending
    const sortedDates = Object.keys(data).sort((a, b) => b.localeCompare(a));
    return (
      <div className="space-y-6">
        {sortedDates.map(date => (
          <div
            key={date}
            className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4"
          >
            <h3 className="text-lg font-semibold mb-2 text-gray-600 dark:text-gray-300">
              {date}
            </h3>
            {data[date].length === 0 ? (
              <div className="text-gray-400">No merchant data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-none">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs leading-normal">
                      <th className="px-3 py-2 text-left">Merchant</th>
                      <th className="px-3 py-2 text-left">Currency</th>
                      <th className="px-3 py-2 text-right">Total Credit</th>
                      <th className="px-3 py-2 text-right">Total Debit</th>
                      <th className="px-3 py-2 text-right">Total Frozen</th>
                      <th className="px-3 py-2 text-right">Total Unfrozen</th>
                      <th className="px-3 py-2 text-right">Total Fees</th>
                      <th className="px-3 py-2 text-left">Rate Distribution</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 dark:text-gray-300 text-sm">
                    {data[date].map(merchant =>
                      merchant.accounts.map(account => (
                        <tr
                          key={
                            merchant.merchant_id + account.merchant_account_id
                          }
                          className="border-b border-gray-200 dark:border-gray-700  transition duration-150"
                        >
                          <td className="px-3 py-2">
                            {merchant.merchant_name}
                          </td>
                          <td className="px-3 py-2">{account.currency_code}</td>
                          <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                            {account.total_credit}
                          </td>
                          <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                            {account.total_debit}
                          </td>
                          <td className="px-3 py-2 text-right text-sky-600 dark:text-sky-400">
                            {account.total_frozen}
                          </td>
                          <td className="px-3 py-2 text-right text-yellow-600 dark:text-yellow-400">
                            {account.total_unfrozen}
                          </td>
                          <td className="px-3 py-2 text-right text-fuchsia-600 dark:text-fuchsia-400">
                            {account.total_fees}
                          </td>
                          <td className="py-4 px-4 align-middle w-[35%]">
                            <CustomStackedBar
                              segments={[
                                {
                                  rate: account.credit_rate,
                                  color: 'green',
                                  textColor: 'green',
                                  label: 'Credit',
                                },
                                {
                                  rate: account.debit_rate,
                                  color: 'red',
                                  textColor: 'red',
                                  label: 'Debit',
                                },
                                {
                                  rate: account.frozen_rate,
                                  color: 'sky',
                                  textColor: 'sky',
                                  label: 'Frozen',
                                },
                                {
                                  rate: account.unfrozen_rate,
                                  color: 'yellow',
                                  textColor: 'yellow',
                                  label: 'Unfrozen',
                                },
                                {
                                  rate: account.fees_rate,
                                  color: 'fuchsia',
                                  textColor: 'fuchsia',
                                  label: 'Fees',
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center w-full md:space-x-2">
          <div className="relative md:flex-1 w-full md:w-auto">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 ml-3 hidden md:block flex-shrink-0">
                Daily Statement
              </h3>
            </div>
          </div>
          <div className="w-full md:w-auto relative ">
            {allMerchants.length > 1 && (
              <CommonSelect
                value={selectedMerchant}
                onChange={v => setSelectedMerchant(v)}
                options={allMerchants}
                placeholder="Select merchant"
                className="mt-2"
              />
            )}
          </div>
          <div className="w-full md:w-auto relative ">
            <CustomDateRangePicker
              value={dateRange}
              className="mt-2 w-full"
              onChange={v => {
                if (v && v.start && v.end) {
                  const days = getDaysBetween(v.start, v.end);
                  if (
                    days >
                    parseInt(
                      process.env.NEXT_PUBLIC_DAILY_STATEMENT_LIMIT || '7'
                    )
                  ) {
                    ToastNotify.error(
                      `Max ${process.env.NEXT_PUBLIC_DAILY_STATEMENT_LIMIT} days allowed`
                    );
                    return;
                  }
                }
                setDateRange(v);
              }}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 pl-2">
          <ActionsDropdown actions={actions} />
        </div>
      </div>
      {renderTable()}
    </div>
  );
};

export default DailyStatement;
