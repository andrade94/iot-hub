import * as React from 'react';
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface DatePresetsProps {
  onPresetSelect: (dateRange: DateRange) => void;
  className?: string;
}

export interface DatePreset {
  label: string;
  getValue: () => DateRange;
}

export const datePresets: DatePreset[] = [
  {
    label: 'Today',
    getValue: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  {
    label: 'Yesterday',
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    },
  },
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: 'This week',
    getValue: () => {
      const today = new Date();
      return {
        from: startOfWeek(today, { weekStartsOn: 1 }), // Monday start
        to: endOfWeek(today, { weekStartsOn: 1 }),
      };
    },
  },
  {
    label: 'Last week',
    getValue: () => {
      const lastWeek = subWeeks(new Date(), 1);
      return {
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };
    },
  },
  {
    label: 'This month',
    getValue: () => {
      const today = new Date();
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
      };
    },
  },
  {
    label: 'Last month',
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
];

export function DatePresets({ onPresetSelect, className }: DatePresetsProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {datePresets.map((preset) => (
        <Button
          key={preset.label}
          variant="outline"
          size="sm"
          onClick={() => onPresetSelect(preset.getValue())}
          className="h-auto p-2 text-xs"
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}