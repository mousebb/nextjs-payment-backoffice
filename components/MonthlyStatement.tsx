import React, { useEffect, useState } from 'react';
import CommonSelect from './CommonSelect';
import ActionsDropdown from './ActionsDropdown';
import ToastNotify from './ToastNotify';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { authFetch } from '@/lib/utils';
import { getBasicData } from '@/lib/basic-data.service';
import { API_ROUTES } from '@/constants/apiRoutes';
import { CONFIG } from '@/constants/config';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import CustomStackedBar from './CustomStackedBar';
import { useBasicData } from '@/hooks/useBasicData';

interface AccountInfo {
  merchant_account_id: string;
  currency_code: string;
  monthly_income: string;
  monthly_outflow: string;
  monthly_fee: string;
  monthly_adjustment_credit: string;
  income_rate: string;
  outflow_rate: string;
  fee_rate: string;
  adjustment_credit_rate: string;
}

interface MerchantInfo {
  merchant_id: string;
  merchant_name: string;
  accounts: AccountInfo[];
}

interface MonthlyStatementData {
  month: string;
  merchants: MerchantInfo[];
}

const MonthlyStatement: React.FC = () => {
  // State
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState<string>(defaultMonth);
  const [allMerchants, setAllMerchants] = useState<any[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<string>('');
  const [data, setData] = useState<MonthlyStatementData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();
  // Fetch merchant list on mount
  useEffect(() => {
    getBasicData('merchants', API_ROUTES.MERCHANTS_ACCESSIBLE).then(
      setAllMerchants
    );
  }, []);

  // Fetch data when month or merchant changes
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [month, selectedMerchant]);

  // Fetch monthly statement
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [year, m] = month.split('-');
      const params = new URLSearchParams();
      params.append('year', year);
      params.append('month', m);
      if (selectedMerchant) params.append('merchant_id', selectedMerchant);
      const url =
        CONFIG.API_BASE_URL +
        API_ROUTES.STATEMENT_MONTHLY +
        '?' +
        params.toString();
      const response = await authFetch(url);
      if (!response) throw new Error('No response');
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || 'Failed to fetch data');
      setData(result || null);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!data || !data.merchants || data.merchants.length === 0) {
      ToastNotify.error('No data to export');
      return;
    }
    const rows: any[] = [];
    data.merchants.forEach(merchant => {
      merchant.accounts.forEach(account => {
        rows.push({
          month: data.month,
          merchant: merchant.merchant_name,
          currency: account.currency_code,
          monthly_income: account.monthly_income,
          monthly_outflow: account.monthly_outflow,
          monthly_fee: account.monthly_fee,
          monthly_adjustment_credit: account.monthly_adjustment_credit,
        });
      });
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    saveAs(blob, 'monthly_statement.csv');
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!data || !data.merchants || data.merchants.length === 0) {
      ToastNotify.error('No data to export');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    const columns = [
      'Currency',
      'Monthly Income',
      'Monthly Outflow',
      'Monthly Fee',
      'Monthly Adjustment Credit',
    ];
    let currentY = 14;
    data.merchants.forEach((merchant, idx) => {
      doc.text(`Merchant: ${merchant.merchant_name}`, 14, currentY);
      const rows: any[] = [];
      merchant.accounts.forEach(account => {
        rows.push([
          account.currency_code,
          account.monthly_income,
          account.monthly_outflow,
          account.monthly_fee,
          account.monthly_adjustment_credit,
        ]);
      });
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: currentY + 4,
        styles: { fontSize: 8, overflow: 'linebreak' },
        headStyles: { fillColor: [33, 150, 243] },
        margin: { left: 14, right: 14 },
      });
      currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 10;
    });
    doc.save('monthly_statement.pdf');
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
      disabled:
        isLoading || !data || !data.merchants || data.merchants.length === 0,
    },
    {
      label: 'Export PDF',
      onClick: handleExportPDF,
      disabled:
        isLoading || !data || !data.merchants || data.merchants.length === 0,
    },
  ];

  // Table rendering
  const renderTable = () => {
    if (isLoading)
      return <div className="p-6 text-center text-gray-500">Loading...</div>;
    if (error)
      return <div className="p-6 text-center text-red-500">{error}</div>;
    if (!data || !data.merchants || data.merchants.length === 0)
      return <div className="p-6 text-center text-gray-400">No data</div>;
    return (
      <div className="space-y-6">
        {data.merchants.map(merchant => (
          <div
            key={merchant.merchant_id}
            className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4"
          >
            <h3 className="text-lg font-semibold mb-2 text-gray-600 dark:text-gray-300">
              {merchant.merchant_name}
            </h3>
            {merchant.accounts.length === 0 ? (
              <div className="text-gray-400">No account data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-none">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs leading-normal">
                      <th className="px-3 py-2 text-left">Currency</th>
                      <th className="px-3 py-2 text-right">Income</th>
                      <th className="px-3 py-2 text-right">Outflow</th>
                      <th className="px-3 py-2 text-right">Fee</th>
                      <th className="px-3 py-2 text-right">
                        Adjustment Credit
                      </th>
                      <th className="px-3 py-2 text-left">Rate Distribution</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 dark:text-gray-300 text-sm">
                    {merchant.accounts.map(account => (
                      <tr
                        key={account.merchant_account_id}
                        className="border-b border-gray-200 dark:border-gray-700  transition duration-150"
                      >
                        <td className="px-3 py-2">{account.currency_code}</td>
                        <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                          {account.monthly_income}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                          {account.monthly_outflow}
                        </td>
                        <td className="px-3 py-2 text-right text-fuchsia-600 dark:text-fuchsia-400">
                          {account.monthly_fee}
                        </td>
                        <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                          {account.monthly_adjustment_credit}
                        </td>
                        <td className="py-4 px-4 align-middle w-[35%]">
                          <CustomStackedBar
                            segments={[
                              {
                                rate: account.income_rate,
                                color: 'green',
                                textColor: 'green',
                                label: 'Income',
                              },
                              {
                                rate: account.outflow_rate,
                                color: 'red',
                                textColor: 'red',
                                label: 'Outflow',
                              },
                              {
                                rate: account.fee_rate,
                                color: 'fuchsia',
                                textColor: 'fuchsia',
                                label: 'Fee',
                              },
                              {
                                rate: account.adjustment_credit_rate,
                                color: 'blue',
                                textColor: 'blue',
                                label: 'Adjustment Credit',
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
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
                Monthly Statement
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
            <DatePicker
              id="month"
              name="month"
              selected={new Date(month)}
              onChange={v => setMonth(format(v || new Date(), 'yyyy-MM'))}
              dateFormat="yyyy-MM"
              showMonthYearPicker
              className={`flex items-center py-1.5 w-full md:w-auto pl-2 max-md:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-sky-500 focus:border-sky-500`}
              wrapperClassName="w-full relative"
              placeholderText={'YYYY-MM'}
              popperClassName="z-[9999] !important"
              popperPlacement="bottom-start"
              popperContainer={({ children }) => (
                <div className="custom-datepicker-container">{children}</div>
              )}
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

export default MonthlyStatement;
