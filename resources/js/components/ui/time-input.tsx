import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import * as React from 'react';

interface TimeInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function clamp(val: number, min: number, max: number): number {
    if (val > max) return min;
    if (val < min) return max;
    return val;
}

function parseTime(value: string): { hours: number; minutes: number } {
    const [h, m] = (value || '00:00').split(':').map(Number);
    return { hours: isNaN(h) ? 0 : clamp(h, 0, 23), minutes: isNaN(m) ? 0 : clamp(m, 0, 59) };
}

export function TimeInput({ value, onChange, disabled, className }: TimeInputProps) {
    const { hours, minutes } = parseTime(value);
    const hourRef = React.useRef<HTMLInputElement>(null);
    const minRef = React.useRef<HTMLInputElement>(null);
    const [focusedField, setFocusedField] = React.useState<'hours' | 'minutes' | null>(null);

    function emit(h: number, m: number) {
        onChange(`${pad(h)}:${pad(m)}`);
    }

    function adjustHours(delta: number) {
        emit(clamp(hours + delta, 0, 23), minutes);
    }

    function adjustMinutes(delta: number) {
        emit(hours, clamp(minutes + delta, 0, 59));
    }

    function handleHourKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'ArrowUp') { e.preventDefault(); adjustHours(1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); adjustHours(-1); }
        else if (e.key === 'ArrowRight' && hourRef.current?.selectionStart === 2) {
            e.preventDefault();
            minRef.current?.focus();
            minRef.current?.select();
        }
    }

    function handleMinKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'ArrowUp') { e.preventDefault(); adjustMinutes(1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); adjustMinutes(-1); }
        else if (e.key === 'ArrowLeft' && minRef.current?.selectionStart === 0) {
            e.preventDefault();
            hourRef.current?.focus();
            hourRef.current?.select();
        }
    }

    function handleHourChange(e: React.ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
        const n = parseInt(raw, 10);
        if (raw === '') { emit(0, minutes); return; }
        if (!isNaN(n)) {
            emit(Math.min(n, 23), minutes);
            if (raw.length === 2 || n > 2) {
                minRef.current?.focus();
                minRef.current?.select();
            }
        }
    }

    function handleMinChange(e: React.ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
        const n = parseInt(raw, 10);
        if (raw === '') { emit(hours, 0); return; }
        if (!isNaN(n)) emit(hours, Math.min(n, 59));
    }

    function handleWheel(field: 'hours' | 'minutes', e: React.WheelEvent) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        if (field === 'hours') adjustHours(delta);
        else adjustMinutes(delta);
    }

    const isFocused = focusedField !== null;

    return (
        <div
            className={cn(
                'inline-flex items-center gap-0 rounded-lg border bg-background/50 transition-all duration-150',
                'shadow-xs shadow-black/[0.03] dark:shadow-black/[0.15]',
                isFocused
                    ? 'border-ring ring-2 ring-ring/20 shadow-sm bg-background'
                    : 'border-input hover:border-border/80 hover:shadow-sm',
                disabled && 'pointer-events-none opacity-50',
                className,
            )}
        >
            {/* Clock icon */}
            <div className="flex items-center pl-3 pr-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>

            {/* Hours */}
            <div className="relative flex items-center">
                <input
                    ref={hourRef}
                    type="text"
                    inputMode="numeric"
                    value={pad(hours)}
                    onChange={handleHourChange}
                    onKeyDown={handleHourKeyDown}
                    onWheel={(e) => handleWheel('hours', e)}
                    onFocus={() => { setFocusedField('hours'); hourRef.current?.select(); }}
                    onBlur={() => setFocusedField(null)}
                    disabled={disabled}
                    className={cn(
                        'w-7 bg-transparent text-center font-mono text-sm tabular-nums text-foreground outline-none',
                        'selection:bg-primary/20',
                    )}
                    maxLength={2}
                    aria-label="Hours"
                />
                <div className="flex flex-col -ml-0.5">
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => adjustHours(1)}
                        className="flex h-3 w-4 items-center justify-center text-muted-foreground/30 transition-colors hover:text-primary"
                    >
                        <ChevronUp className="h-2.5 w-2.5" />
                    </button>
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => adjustHours(-1)}
                        className="flex h-3 w-4 items-center justify-center text-muted-foreground/30 transition-colors hover:text-primary"
                    >
                        <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                </div>
            </div>

            {/* Separator */}
            <span className={cn(
                'font-mono text-sm tabular-nums transition-colors',
                isFocused ? 'text-primary' : 'text-muted-foreground/40',
            )}>
                :
            </span>

            {/* Minutes */}
            <div className="relative flex items-center">
                <input
                    ref={minRef}
                    type="text"
                    inputMode="numeric"
                    value={pad(minutes)}
                    onChange={handleMinChange}
                    onKeyDown={handleMinKeyDown}
                    onWheel={(e) => handleWheel('minutes', e)}
                    onFocus={() => { setFocusedField('minutes'); minRef.current?.select(); }}
                    onBlur={() => setFocusedField(null)}
                    disabled={disabled}
                    className={cn(
                        'w-7 bg-transparent text-center font-mono text-sm tabular-nums text-foreground outline-none',
                        'selection:bg-primary/20',
                    )}
                    maxLength={2}
                    aria-label="Minutes"
                />
                <div className="flex flex-col -ml-0.5 mr-2">
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => adjustMinutes(1)}
                        className="flex h-3 w-4 items-center justify-center text-muted-foreground/30 transition-colors hover:text-primary"
                    >
                        <ChevronUp className="h-2.5 w-2.5" />
                    </button>
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => adjustMinutes(-1)}
                        className="flex h-3 w-4 items-center justify-center text-muted-foreground/30 transition-colors hover:text-primary"
                    >
                        <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
