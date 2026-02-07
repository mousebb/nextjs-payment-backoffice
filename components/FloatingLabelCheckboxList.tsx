import React, { forwardRef, useState, useMemo } from 'react';
import CustomCheckbox from './CustomCheckbox';

interface CheckboxOption {
  id: string;
  name: string;
  code?: string;
  [key: string]: any;
}

interface FloatingLabelCheckboxListProps {
  label: string;
  options: CheckboxOption[];
  selectedValues: string[];
  onChange: (value: string, checked: boolean) => void;
  renderOptionLabel?: (option: CheckboxOption) => React.ReactNode;
  error?: string;
  maxHeight?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  labelClassName?: string;
  containerClassName?: string;
}

const FloatingLabelCheckboxList = forwardRef<
  HTMLDivElement,
  FloatingLabelCheckboxListProps
>(
  (
    {
      label,
      options,
      selectedValues,
      onChange,
      renderOptionLabel,
      error,
      maxHeight = 'max-h-32',
      disabled = false,
      loading = false,
      emptyMessage = 'No options available',
      className = '',
      labelClassName = 'bg-white dark:bg-gray-800',
      containerClassName = '',
    },
    ref
  ) => {
    // 使用 useMemo 确保 ID 在组件生命周期内保持一致
    const id = useMemo(
      () => `checkbox-list-${Math.random().toString(36).substr(2, 9)}`,
      []
    );
    const hasContent = options.length > 0;

    const baseContainerClass =
      'block px-4 px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 rounded-lg border appearance-none dark:text-white dark:focus:border-sky-500 focus:outline-none focus:ring-0 focus:border-sky-600 peer';
    const borderClass = error
      ? 'border-red-300 dark:border-red-600'
      : 'border-gray-300 dark:border-gray-600';
    const baseLabelClass =
      'rounded-md absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform origin-[0] px-2 z-10 start-1 peer-focus:text-sky-600 peer-focus:dark:text-sky-500';
    const [checked, setChecked] = useState(false);
    return (
      <div className={`relative ${className}`} ref={ref}>
        <div
          className={`${maxHeight} scrollbar overflow-y-auto ${baseContainerClass} ${borderClass} ${containerClassName} ${disabled && 'bg-gray-50 dark:bg-gray-700'}`}
          tabIndex={0}
        >
          {/* Floating Label */}
          <label
            htmlFor={id}
            className={`${baseLabelClass} ${
              hasContent
                ? 'scale-90 -translate-y-4 top-2 start-3'
                : 'scale-100 top-1/2 -translate-y-1/2 peer-focus:scale-90 peer-focus:-translate-y-4 peer-focus:top-2 start-3'
            } ${labelClassName}`}
          >
            {label}
          </label>

          {/* Checkbox Container */}
          <div className={`bg-transparent`}>
            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading options...
              </p>
            ) : options.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </p>
            ) : (
              <div className="space-y-2">
                {options.map(option => (
                  <label
                    key={option.id}
                    className="flex items-center space-x-2"
                  >
                    <CustomCheckbox
                      checked={selectedValues.includes(option.id)}
                      onChange={() =>
                        onChange(option.id, !selectedValues.includes(option.id))
                      }
                      disabled={disabled}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {renderOptionLabel
                        ? renderOptionLabel(option)
                        : `${option.name}${option.code ? ` (${option.code})` : ''}`}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

FloatingLabelCheckboxList.displayName = 'FloatingLabelCheckboxList';

export default FloatingLabelCheckboxList;
