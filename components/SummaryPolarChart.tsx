import React from 'react';
import ReactApexChart from 'react-apexcharts';
import colors from 'tailwindcss/colors';

interface SummaryItem {
  count: string;
}

interface SummaryPolarChartProps {
  paymentSummary: Record<string, SummaryItem>;
  withdrawalSummary: Record<string, SummaryItem>;
}

const colorPalette = [
  colors.yellow[400],
  colors.green[400],
  colors.red[400],
  colors.blue[400],
  colors.violet[400],
  colors.orange[400],
];

const SummaryPolarChart: React.FC<SummaryPolarChartProps> = ({
  paymentSummary,
  withdrawalSummary,
}) => {
  // Merge payment and withdrawal data
  const categories: string[] = [];
  const series: number[] = [];
  const strokeColor = colors.gray[300]; // 深色背景下用深灰，浅色用白色

  Object.entries(paymentSummary || {}).forEach(([key, item]) => {
    categories.push(`Payment ${key.charAt(0).toUpperCase() + key.slice(1)}`);
    series.push(Number(item.count === '0' ? 0.01 : item.count));
  });
  Object.entries(withdrawalSummary || {}).forEach(([key, item]) => {
    categories.push(`Withdrawal ${key.charAt(0).toUpperCase() + key.slice(1)}`);
    series.push(Number(item.count === '0' ? 0.01 : item.count));
  });

  const options = {
    chart: { type: 'polarArea' as const },
    labels: categories,
    legend: { show: false }, // 隐藏内置legend
    stroke: { width: 0 },
    fill: { opacity: 0.8, colors: colorPalette },
    colors: colorPalette,
    yaxis: { show: false },
    plotOptions: {
      polarArea: {
        rings: {
          strokeWidth: 0,
        },
        spokes: {
          strokeWidth: 1,
        },
      },
    },
  };

  return (
    <div className="flex items-center min-h-[180px] h-[220px] md:h-[180px]">
      <div className="flex-shrink-0">
        <ReactApexChart
          options={options}
          series={series}
          type="polarArea"
          height={180}
          width={180}
        />
      </div>
      <div className="flex flex-col justify-center ml-6 space-y-2">
        {categories.map((label, idx) => (
          <div key={label} className="flex items-center space-x-2">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{
                backgroundColor: colorPalette[idx % colorPalette.length],
              }}
            />
            <span className="text-gray-700 dark:text-gray-200 text-sm">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummaryPolarChart;
