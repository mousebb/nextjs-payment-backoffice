'use client';

import React, { useState } from 'react';
import {
  DateRangePicker,
  Group,
  DateInput,
  DateSegment,
  Button,
  Popover,
  Dialog,
  RangeCalendar,
  CalendarCell,
  CalendarGrid,
  Heading,
} from 'react-aria-components';
import { I18nProvider } from 'react-aria-components';
import { parseDate, CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@react-types/shared';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface MyDateRangePickerProps {
  value?: RangeValue<CalendarDate>;
  onChange?: (v: RangeValue<CalendarDate>) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomDateRangePicker({
  value: controlledValue,
  onChange,
  placeholder = 'Select date range',
  className = 'w-full md:w-auto relative',
}: MyDateRangePickerProps) {
  const today = new CalendarDate(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate()
  );
  const [uncontrolledValue, setUncontrolledValue] = useState<
    RangeValue<CalendarDate>
  >({
    start: today.add({ days: -6 }),
    end: today,
  });

  const value = controlledValue ?? uncontrolledValue;
  const setValue = onChange ?? setUncontrolledValue;

  return (
    <I18nProvider locale="en-US">
      <DateRangePicker
        aria-label="Select date range"
        value={value}
        onChange={v => v && setValue(v)}
        granularity="day"
        className={`${className}`}
      >
        <Group className="flex items-center mb-2 md:w-auto pl-2 pr-2 py-0.5 max-md:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
          <DateInput slot="start" className="bg-transparent outline-none">
            {segment => (
              <DateSegment
                segment={segment}
                className={({ isFocused, isHovered }) =>
                  [
                    'outline-none',
                    isHovered
                      ? 'text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-600 rounded-md'
                      : '',
                    isFocused
                      ? 'bg-gray-600 dark:bg-gray-300 text-gray-100 dark:text-gray-700 rounded-md'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
              />
            )}
          </DateInput>
          <span aria-hidden="true" className="px-1 text-gray-500">
            –
          </span>
          <DateInput slot="end" className="bg-transparent outline-none">
            {segment => (
              <DateSegment
                segment={segment}
                className={({ isFocused, isHovered }) =>
                  [
                    'outline-none',
                    isHovered
                      ? 'text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-600 rounded-md'
                      : '',
                    isFocused
                      ? 'text-gray-100 bg-gray-600 dark:text-gray-700 dark:bg-gray-300 rounded-md'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
              />
            )}
          </DateInput>
          <Button
            aria-label="Toggle Calendar"
            className="max-md:absolute max-md:right-4  ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
          >
            <CalendarDaysIcon className="w-5 h-5" />
          </Button>
        </Group>

        <Popover className="z-50 shadow-2xl">
          <Dialog className="relative w-[250px] md:w-[200px] text-sm rounded-md shadow-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 font-normal p-2">
            <RangeCalendar className="w-full">
              <header className="flex items-center justify-between pb-1">
                <Button
                  slot="previous"
                  className="p-1 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ChevronLeftIcon className="h-4 w-4 mr-1" />
                </Button>
                <Heading />
                <Button
                  slot="next"
                  className="p-1 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </header>

              <CalendarGrid className="px-2 pb-2 w-full">
                {date => (
                  <CalendarCell
                    date={date}
                    className={({
                      isSelectionStart,
                      isSelectionEnd,
                      isSelected,
                      isOutsideMonth,
                      isFocused,
                      isHovered,
                    }) =>
                      [
                        'w-5 h-5 text-center text-sm rounded-full',
                        isSelectionStart
                          ? 'bg-sky-600 dark:bg-sky-300 text-sky-100 dark:text-sky-700'
                          : '',
                        isSelectionEnd
                          ? 'bg-sky-600 dark:bg-sky-300 text-sky-100 dark:text-sky-700'
                          : '',
                        isOutsideMonth ? 'invisible' : '',
                        isSelected && !isSelectionStart && !isSelectionEnd
                          ? 'bg-sky-100 dark:bg-sky-700 text-sky-600 dark:text-sky-300'
                          : '',
                        // isHovered ? "text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-600" : "",
                        // isFocused ? "text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-600" : "",
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }
                  />
                )}
              </CalendarGrid>
            </RangeCalendar>
          </Dialog>
        </Popover>
      </DateRangePicker>
    </I18nProvider>
  );
}
