// components/StackedBar.tsx
import React from 'react';

function formatNumber(value: string | number, fraction = 1): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '0' : num.toFixed(fraction);
}

type BarSegmentProps = {
  rate: string;
  color: string;
  textColor: string;
  label: string;
};

const BarSegment = ({ rate, color, textColor, label }: BarSegmentProps) => {
  const percentage = parseFloat(rate || '0');
  if (percentage === 0) return null;
  const width = percentage < 3 ? 3 : percentage;
  return (
    <div
      style={{ width: `${width}%` }}
      className={`bg-${color}-100 dark:bg-${color}-700 dark:bg-opacity-25 flex items-center justify-center h-full overflow-hidden whitespace-nowrap`}
      title={`${label}: ${formatNumber(rate, 1)}%`}
    >
      <span
        className={`text-${textColor}-600 dark:text-${textColor}-400 text-xs font-medium px-0.5`}
      >
        {formatNumber(rate, 1)}%
      </span>
    </div>
  );
};

type StackedBarProps = {
  segments: BarSegmentProps[];
  title?: string;
  heightClass?: string; // e.g. "h-6 md:h-7"
  backgroundClass?: string; // default bg color
};

const StackedBar: React.FC<StackedBarProps> = ({
  segments,
  title,
  heightClass = 'h-6 md:h-7',
  backgroundClass = 'bg-gray-200 dark:bg-gray-600',
}) => {
  return (
    <div
      className={`flex ${heightClass} rounded-md overflow-hidden w-full ${backgroundClass}`}
      title={title}
    >
      {segments.map((seg, idx) => (
        <BarSegment key={idx} {...seg} />
      ))}
    </div>
  );
};

export default StackedBar;
