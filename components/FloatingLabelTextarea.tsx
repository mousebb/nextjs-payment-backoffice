import React, { forwardRef, useState } from 'react';

interface FloatingLabelTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  textareaClassName?: string;
  labelClassName?: string;
  alwaysFloatLabel?: boolean;
  placeholder?: string;
}

const FloatingLabelTextarea = forwardRef<
  HTMLTextAreaElement,
  FloatingLabelTextareaProps
>(
  (
    {
      label,
      error,
      textareaClassName = '',
      labelClassName = '',
      className = '',
      value,
      alwaysFloatLabel = false,
      placeholder,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const id =
      props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const hasValue = value && String(value).trim() !== '';

    const baseTextareaClass =
      'scrollbar block px-4 px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 rounded-lg border appearance-none bg-white dark:bg-gray-800 dark:text-white dark:focus:border-sky-500 focus:outline-none focus:ring-0 focus:border-sky-600 peer';
    const borderClass = error
      ? 'border-red-300 dark:border-red-600'
      : 'border-gray-300 dark:border-gray-600';
    const baseLabelClass =
      'bg-white dark:bg-gray-800 rounded-md absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform origin-[0] px-2 z-10 start-1 peer-focus:text-sky-600 peer-focus:dark:text-sky-500';

    // 只在聚焦且无输入内容时显示 placeholder
    const shouldShowPlaceholder = isFocused && (!value || value === '');

    return (
      <div className={`relative ${className}`}>
        <textarea
          ref={ref}
          id={id}
          className={`${baseTextareaClass} ${borderClass} ${textareaClassName}`}
          placeholder=" "
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        <label
          htmlFor={id}
          className={`${baseLabelClass} ${
            alwaysFloatLabel
              ? 'scale-90 -translate-y-4 top-2 start-3'
              : hasValue
                ? 'scale-90 -translate-y-4 top-2 start-3'
                : 'scale-100 top-1/2 -translate-y-1/2 peer-focus:scale-90 peer-focus:-translate-y-4 peer-focus:top-2 start-3'
          } ${labelClassName}`}
        >
          {label}
        </label>
        {/* 自定义 placeholder 带动画 */}
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
  }
);

FloatingLabelTextarea.displayName = 'FloatingLabelTextarea';

export default FloatingLabelTextarea;
