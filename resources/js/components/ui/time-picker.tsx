import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

export interface TimePickerProps {
  time?: string; // Format: "HH:MM"
  onTimeChange?: (time: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function TimePicker({
  time,
  onTimeChange,
  placeholder = 'Seleccionar hora',
  disabled = false,
  className,
  id,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hours, setHours] = React.useState<string>(time?.split(':')[0] || '12');
  const [minutes, setMinutes] = React.useState<string>(time?.split(':')[1] || '00');

  // Generate hour options (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0')
  );

  // Generate minute options (every 15 minutes)
  const minuteOptions = ['00', '15', '30', '45'];

  React.useEffect(() => {
    if (time) {
      const [h, m] = time.split(':');
      setHours(h || '12');
      setMinutes(m || '00');
    }
  }, [time]);

  const handleApply = () => {
    const newTime = `${hours}:${minutes}`;
    onTimeChange?.(newTime);
    setOpen(false);
  };

  const handleClear = () => {
    onTimeChange?.(undefined);
    setHours('12');
    setMinutes('00');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !time && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {time || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Hora</Label>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {hourOptions.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Minutos</Label>
              <Select value={minutes} onValueChange={setMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minuteOptions.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              Limpiar
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="flex-1"
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
