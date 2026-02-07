import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface FloatingLabelInputProps {
  id: string;
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  step?: string;
  min?: string;
  placeholder?: string;
  disabled?: boolean;
  disabledValue?: string;
  error?: string;
  inputClassName?: string;
  labelClassName?: string;
  autoComplete?: string;
  required?: boolean;
  alwaysFloatLabel?: boolean;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  type = 'text',
  step,
  min,
  placeholder,
  disabled = false,
  disabledValue = '',
  error,
  inputClassName = '',
  labelClassName = '',
  autoComplete,
  required,
  alwaysFloatLabel = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const baseInputClass = `block px-4 px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 rounded-lg border 
          appearance-none bg-white dark:bg-gray-800 dark:hover:bg-gray-800 dark:text-white dark:focus:border-sky-500 focus:outline-none focus:ring-0 
          focus:border-sky-600 peer ${disabled ? 'cursor-not-allowed' : ''}`;
  const borderClass = error
    ? 'border-red-300 dark:border-red-600'
    : 'border-gray-300 dark:border-gray-600';
  const baseLabelClass =
    'bg-white dark:bg-gray-800 rounded-md absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform origin-[0] px-2 z-10 start-3 peer-focus:text-sky-600 peer-focus:dark:text-sky-500';

  const defaultLabelClass = 'bg-white dark:bg-gray-800';
  const hasValue =
    value !== undefined && value !== null && String(value).trim() !== '';
  const finalLabelClass = labelClassName
    ? `${baseLabelClass} ${labelClassName}`
    : `${baseLabelClass} ${defaultLabelClass}`;

  // Show placeholder only when focused and no value, or alwaysFloatLabel with no value
  const shouldShowPlaceholder = alwaysFloatLabel
    ? !value || value === ''
    : isFocused && (!value || value === '');

  return (
    <div className="relative">
      {disabled && (
        <input
          id={id + '_display'}
          name={name + '_display'}
          value={disabledValue || value}
          onChange={() => {}} // noop, not editable
          disabled={true}
          className={`${baseInputClass} ${borderClass} bg-gray-50 dark:bg-gray-700 cursor-not-allowed`}
        />
      )}
      {!disabled && (
        <div className="relative">
          <input
            type={
              type === 'password' ? (showPassword ? 'text' : 'password') : type
            }
            id={id}
            name={name}
            className={`${baseInputClass} ${borderClass} ${inputClassName}`}
            placeholder=" "
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            step={step}
            min={min}
            autoComplete={autoComplete}
            required={required}
          />
          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-4 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      )}
      <label
        htmlFor={id}
        className={
          `${baseLabelClass} ` +
          (alwaysFloatLabel
            ? 'scale-90 -translate-y-4 top-2 start-3'
            : hasValue || isFocused
              ? 'scale-90 -translate-y-4 top-2 start-3'
              : 'scale-100 top-1/2 -translate-y-1/2 peer-focus:scale-90 peer-focus:-translate-y-4 peer-focus:top-2 start-3') +
          (labelClassName ? labelClassName : defaultLabelClass)
        }
      >
        {label}
      </label>
      {/* Custom placeholder with animation */}
      {placeholder && (
        <div
          className={`absolute px-2 left-2.5 top-4 text-sm text-gray-400 dark:text-gray-500 pointer-events-none transition-opacity duration-200 ${
            shouldShowPlaceholder ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {placeholder}
        </div>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default FloatingLabelInput;
