import React, { useEffect, useRef } from 'react';

interface CustomCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  isRound?: boolean;
  justifyContent?: 'start' | 'center' | 'end';
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  label,
  disabled = false,
  className,
  isRound = true,
  justifyContent = 'center',
}) => {
  const id = React.useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const justifyClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  }[justifyContent];

  return (
    <div className={`flex ${justifyClass}`}>
      <label
        htmlFor={id}
        className={`flex items-center gap-2 cursor-pointer select-none ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        } ${className}`}
      >
        <input
          ref={inputRef}
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={disabled ? undefined : onChange}
        />
        <div
          className={`relative w-4 h-4 ${isRound ? 'rounded-full' : 'rounded'} border flex items-center justify-center transition-all duration-200
            ${
              disabled
                ? 'bg-gray-200 border-gray-300'
                : checked || indeterminate
                  ? 'bg-sky-400 border-sky-400 dark:bg-sky-600 dark:border-sky-600'
                  : 'bg-gray-50 border-gray-300'
            }`}
        >
          <span
            className={`text-white text-[10px] leading-none transition-opacity duration-200 dark:text-sky-200 ${
              checked && !indeterminate ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ lineHeight: 1 }}
          >
            ✔
          </span>
          {/* 半选时显示中划线 */}
          {indeterminate && (
            <span className="absolute left-1/2 top-1/2 w-2 h-[2px] bg-white rounded-sm -translate-x-1/2 -translate-y-1/2"></span>
          )}
        </div>
        {label && (
          <span className={`${disabled ? 'text-gray-400' : ''} text-sm`}>
            {label}
          </span>
        )}
      </label>
    </div>
  );
};

export default CustomCheckbox;
