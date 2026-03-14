import * as React from "react"
import { cn } from "@/lib/utils"

interface NumberInputProps extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value?: number | string;
  onChange?: (value: number) => void;
  locale?: string;
}

function NumberInput({ 
  className, 
  value, 
  onChange,
  locale = "es-MX",
  placeholder,
  ...props 
}: NumberInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>("");
  const [isFocused, setIsFocused] = React.useState(false);

  // Format number for display
  const formatNumber = (num: number | string): string => {
    if (!num && num !== 0) return "";
    const parsed = typeof num === "string" ? parseFloat(num.replace(/,/g, "")) : num;
    if (isNaN(parsed)) return "";
    
    // Don't format while focused (typing)
    if (isFocused) {
      return parsed.toString();
    }
    
    return new Intl.NumberFormat(locale).format(parsed);
  };

  // Parse input to number
  const parseInput = (input: string): number => {
    // Remove all non-numeric characters except decimal point
    const cleaned = input.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Update display value when prop value changes
  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatNumber(value || ""));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Parse and notify parent of numeric value
    const numericValue = parseInput(inputValue);
    if (onChange) {
      onChange(numericValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show unformatted number when focused
    if (value) {
      const parsed = typeof value === "string" ? parseInput(value) : value;
      setDisplayValue(parsed.toString());
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format the number when losing focus
    setDisplayValue(formatNumber(value || ""));
  };

  // Format placeholder if it's a number
  const formattedPlaceholder = placeholder && !isNaN(Number(placeholder)) 
    ? formatNumber(placeholder) 
    : placeholder;

  return (
    <input
      type="text"
      inputMode="numeric"
      data-slot="input"
      className={cn(
        "border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={formattedPlaceholder}
      {...props}
    />
  )
}

export { NumberInput }