import React from 'react';
import FloatingLabelInput from './FloatingLabelInput';

interface FloatingLabelSelectProps {
  id: string;
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
  disabledValue?: string;
  error?: string;
  selectClassName?: string;
  labelClassName?: string;
}

const FloatingLabelSelect: React.FC<FloatingLabelSelectProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  children,
  disabled = false,
  disabledValue = '',
  error,
  selectClassName = '',
  labelClassName = '',
}) => {
  const baseSelectClass = `block px-4 px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent 
          rounded-lg border appearance-none dark:text-white dark:bg-gray-800 dark:hover:bg-gray-800 
          dark:focus:border-sky-500 focus:outline-none focus:ring-0 focus:border-sky-600 peer`;
  const borderClass = error
    ? 'border-red-300 dark:border-red-600'
    : 'border-gray-300 dark:border-gray-600';

  const hasValue = value !== '';

  return (
    <div className="relative">
      {disabled && (
        <FloatingLabelInput
          id={id + '_display'}
          name={name + '_display'}
          label={label}
          value={disabledValue}
          disabledValue={disabledValue}
          onChange={() => {}} // 空函数，因为不可编辑
          disabled={true}
          inputClassName="bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
          labelClassName="bg-white dark:bg-gray-800"
        />
      )}
      {!disabled && (
        <>
          <select
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`${baseSelectClass} ${borderClass} ${selectClassName}`}
          >
            <option value=""></option>
            {children}
          </select>
          <label
            htmlFor={id}
            className={`absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform origin-[0] rounded-md bg-white dark:bg-gray-800 px-2 z-10 start-1
            peer-focus:text-sky-600 peer-focus:dark:text-sky-500
            ${
              hasValue
                ? 'scale-90 -translate-y-4 top-2 start-3'
                : 'scale-100 top-1/2 -translate-y-1/2 peer-focus:scale-90 peer-focus:-translate-y-4 peer-focus:top-2 start-3'
            }
            ${labelClassName}`}
          >
            {label}
          </label>
        </>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default FloatingLabelSelect;
