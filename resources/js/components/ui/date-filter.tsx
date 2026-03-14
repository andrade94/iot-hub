import * as React from 'react';
import { format } from 'date-fns';
import { DateRangePicker, DateRange } from './date-range-picker';
import { DatePresets } from './date-presets';
import { Button } from './button';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { CalendarDays, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateFilterProps {
  dateRange?: DateRange;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  showPresets?: boolean;
  showClear?: boolean;
}

export function DateFilter({
  dateRange,
  onDateRangeChange,
  label = 'Date Range',
  placeholder = 'Select date range',
  className,
  showPresets = true,
  showClear = true,
}: DateFilterProps) {
  const [open, setOpen] = React.useState(false);

  const handlePresetSelect = (preset: DateRange) => {
    onDateRangeChange(preset);
    setOpen(false);
  };

  const handleClear = () => {
    onDateRangeChange(undefined);
  };

  const hasDateRange = dateRange?.from || dateRange?.to;

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'flex-1 justify-start text-left font-normal',
                !hasDateRange && 'text-muted-foreground'
              )}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              {hasDateRange ? (
                dateRange?.to ? (
                  `${format(dateRange.from!, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                ) : (
                  format(dateRange.from!, 'dd/MM/yyyy')
                )
              ) : (
                placeholder
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              {showPresets && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Quick select</h4>
                  <DatePresets onPresetSelect={handlePresetSelect} />
                </div>
              )}
              <div>
                <h4 className="font-medium text-sm mb-2">Custom range</h4>
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={(range) => {
                    onDateRangeChange(range);
                    if (range?.from && range?.to) {
                      setOpen(false);
                    }
                  }}
                  placeholder="Select custom range"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {showClear && hasDateRange && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleClear}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}