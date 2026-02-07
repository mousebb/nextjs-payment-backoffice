import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parse } from 'date-fns';

interface FloatingLabelMonthPickerProps {
  id: string;
  name: string;
  label: string;
  value: string | null; // 'YYYY-MM'
  onChange: (value: string | null) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string; // 'YYYY-MM'
  max?: string; // 'YYYY-MM'
  className?: string;
  labelClassName?: string;
}

const FloatingLabelMonthPicker: React.FC<FloatingLabelMonthPickerProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  error,
  placeholder = '',
  disabled = false,
  required = false,
  min,
  max,
  className = '',
  labelClassName = '',
}) => {
  // 将 'YYYY-MM' 转为 Date
  const parseMonth = (val: string | null) =>
    val ? parse(val, 'yyyy-MM', new Date()) : null;
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    parseMonth(value)
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setSelectedDate(parseMonth(value));
  }, [value]);

  const handleChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      onChange(format(date, 'yyyy-MM'));
    } else {
      onChange(null);
    }
  };

  const hasValue = !!selectedDate;
  const baseInputClass = `block px-4 px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 rounded-lg border appearance-none bg-white dark:bg-gray-800 dark:text-white dark:focus:border-sky-500 focus:outline-none focus:ring-0 focus:border-sky-600 peer ${disabled ? 'cursor-not-allowed' : ''}`;
  const borderClass = error
    ? 'border-red-300 dark:border-red-600'
    : 'border-gray-300 dark:border-gray-600';
  const baseLabelClass =
    'bg-white dark:bg-gray-800 rounded-md absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform origin-[0] px-2 z-10 start-3 peer-focus:text-sky-600 peer-focus:dark:text-sky-500';
  const defaultLabelClass = 'bg-white dark:bg-gray-800';
  const finalLabelClass = labelClassName
    ? `${baseLabelClass} ${labelClassName}`
    : `${baseLabelClass} ${defaultLabelClass}`;

  // 处理 min/max
  const minDate: Date | undefined = min
    ? parseMonth(min) || undefined
    : undefined;
  const maxDate: Date | undefined = max
    ? parseMonth(max) || undefined
    : undefined;

  return (
    <div className={`relative ${className}`}>
      <DatePicker
        id={id}
        name={name}
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="yyyy-MM"
        showMonthYearPicker
        className={`${baseInputClass} ${borderClass}`}
        wrapperClassName="w-full"
        placeholderText={isFocused ? placeholder : ''}
        disabled={disabled}
        required={required}
        minDate={minDate}
        maxDate={maxDate}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoComplete="off"
        popperClassName="z-[9999] !important"
        popperPlacement="bottom-start"
      />
      <label
        htmlFor={id}
        className={
          `${baseLabelClass} ` +
          (isFocused || hasValue
            ? 'scale-90 -translate-y-4 top-2 start-3'
            : 'scale-100 top-1/2 -translate-y-1/2 peer-focus:scale-90 peer-focus:-translate-y-4 peer-focus:top-2 start-3') +
          (labelClassName ? labelClassName : defaultLabelClass)
        }
      >
        {label}
      </label>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default FloatingLabelMonthPicker;
