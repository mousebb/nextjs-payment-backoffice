import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface OptionType {
  [key: string]: any;
}

interface CommonSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: OptionType[];
  valueKey?: string; // Field name in option used as value, default is 'id'
  labelKey?: string; // Field name in option used as label, default is 'name'
  placeholder?: string;
  className?: string;
}

const CommonSelect: React.FC<CommonSelectProps> = ({
  value,
  onChange,
  options,
  valueKey = 'id',
  labelKey = 'name',
  placeholder = 'Please select',
  className = '',
}) => {
  return (
    <div className={`w-full md:w-auto relative md:mr-0 ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none w-full mb-2 md:w-auto pl-2 pr-6 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-normal"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt[valueKey]} value={opt[valueKey]}>
            {opt[labelKey]}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-3 right-2 flex text-gray-600 dark:text-gray-200">
        <ChevronDownIcon className="w-3 h-3" />
      </div>
    </div>
  );
};

export default CommonSelect;
