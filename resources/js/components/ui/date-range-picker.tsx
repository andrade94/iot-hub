import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface DateRangePickerProps {
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  fromDate?: Date;
  toDate?: Date;
  formatStr?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = 'Seleccionar rango de fechas',
  disabled = false,
  className,
  id,
  fromDate,
  toDate,
  formatStr = 'dd/MM/yyyy',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (selectedRange: DateRange | undefined) => {
    onDateRangeChange?.(selectedRange);
    // Close popover when both dates are selected
    if (selectedRange?.from && selectedRange?.to) {
      setOpen(false);
    }
  };

  const formatDateRange = () => {
    if (!dateRange?.from) {
      return placeholder;
    }
    
    if (dateRange.to) {
      return `${format(dateRange.from, formatStr, { locale: es })} - ${format(dateRange.to, formatStr, { locale: es })}`;
    }
    
    return format(dateRange.from, formatStr, { locale: es });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal',
            !dateRange?.from && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleSelect}
          disabled={(date) => {
            if (fromDate && date < fromDate) return true;
            if (toDate && date > toDate) return true;
            return false;
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}