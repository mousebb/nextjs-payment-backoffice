import { SOURCE_ACTION } from '@/constants/config';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { ClockIcon } from '@heroicons/react/24/outline';
import { XCircleIcon } from '@heroicons/react/24/outline';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

export const AmountStyleBadge = ({
  content,
  action,
}: {
  content: string;
  action: string;
}) => {
  if (!content || !action) {
    return <span className="text-gray-400">-</span>;
  }

  const amount = parseFloat(content);
  const actionLower = action.toLowerCase();

  const isNegative =
    !isNaN(amount) &&
    (amount < 0 ||
      actionLower === SOURCE_ACTION.DEBIT ||
      actionLower === SOURCE_ACTION.RESERVE_DEBIT);

  let colorClasses = isNegative
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-emerald-600 dark:text-emerald-400';

  if (actionLower === SOURCE_ACTION.FREEZE) {
    colorClasses = 'text-cyan-400 dark:text-cyan-400';
  }

  return <span className={`font-medium ${colorClasses}`}>{content}</span>;
};

export const TransactionTypeBadge = ({ type }: { type: string }) => {
  if (!type) return <span className="text-gray-400">-</span>;

  let colorClasses = '';

  switch (type.toLowerCase()) {
    case 'payment':
      colorClasses =
        'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400';
      break;
    case 'refund':
      colorClasses =
        'bg-amber-100 text-amber-700 dark:bg-amber-700 dark:bg-opacity-25 dark:text-amber-400';
      break;
    case 'chargeback':
      colorClasses =
        'bg-orange-100 text-orange-700 dark:bg-orange-700 dark:bg-opacity-25 dark:text-orange-400';
      break;
    case 'withdrawal':
      colorClasses =
        'bg-rose-100 text-rose-700 dark:bg-rose-700 dark:bg-opacity-25 dark:text-rose-400';
      break;
    case 'fee':
      colorClasses =
        'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-700 dark:bg-opacity-25 dark:text-fuchsia-400';
      break;
    case 'reserve':
      colorClasses =
        'bg-lime-100 text-lime-700 dark:bg-lime-700 dark:bg-opacity-25 dark:text-lime-400';
      break;
    case 'release':
      colorClasses =
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:bg-opacity-25 dark:text-indigo-400';
      break;
    case 'adjustment':
      colorClasses =
        'bg-teal-100 text-teal-600 dark:bg-teal-700 dark:bg-opacity-25 dark:text-teal-400';
      break;
    default:
      colorClasses =
        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400';
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}
    >
      {type.toUpperCase()}
    </span>
  );
};

export const TransactionStatusBadge = ({
  status,
  isSmallSize = false,
}: {
  status: string;
  isSmallSize?: boolean;
}) => {
  let colorClasses = '';
  let text = status.charAt(0).toUpperCase() + status.slice(1);
  let IconComponent = null;
  const iconSize = isSmallSize ? 'h-3 w-3' : 'h-4 w-4';
  const badgePadding = isSmallSize ? 'px-2 py-0.5' : 'px-3 py-1';
  const badgeTextSize = isSmallSize ? 'text-xs' : 'text-sm';

  switch (status.toLowerCase()) {
    case 'success':
      colorClasses =
        'bg-green-100 text-green-700 dark:bg-green-700 dark:bg-opacity-25 dark:text-green-400';
      IconComponent = <CheckCircleIcon className={`${iconSize} mr-1`} />;
      break;
    case 'pending':
      colorClasses =
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-500 dark:bg-opacity-25 dark:text-yellow-400';
      IconComponent = <ClockIcon className={`${iconSize} mr-1`} />;
      break;
    case 'failed':
      colorClasses =
        'bg-red-100 text-red-700 dark:bg-red-700 dark:bg-opacity-25 dark:text-red-400';
      IconComponent = <XCircleIcon className={`${iconSize} mr-1`} />;
      break;
    case 'submitted':
      colorClasses =
        'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400';
      IconComponent = <PaperAirplaneIcon className={`${iconSize} mr-1`} />;
      break;
    default:
      colorClasses =
        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400';
      IconComponent = <InformationCircleIcon className={`${iconSize} mr-1`} />;
  }

  return (
    <span
      className={`inline-flex items-center ${badgePadding} rounded-full ${badgeTextSize}  ${colorClasses}`}
    >
      {IconComponent}
      {text}
    </span>
  );
};
