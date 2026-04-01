import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input file:text-foreground placeholder:text-muted-foreground/60 selection:bg-primary selection:text-primary-foreground",
        "flex h-10 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base transition-all duration-150 outline-none",
        "shadow-xs shadow-black/[0.03] ring-1 ring-transparent dark:shadow-black/[0.15]",
        "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "hover:border-border/80 hover:shadow-sm",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:shadow-sm focus-visible:bg-background",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
