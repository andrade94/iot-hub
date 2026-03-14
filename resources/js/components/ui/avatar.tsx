import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const avatarSizeVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "size-6",
        sm: "size-8",
        md: "size-10",
        lg: "size-12",
        xl: "size-16",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
)

const statusIndicatorVariants = cva(
  "absolute box-border rounded-full border-2 border-background",
  {
    variants: {
      status: {
        online: "bg-success",
        offline: "bg-muted-foreground",
        busy: "bg-destructive",
        away: "bg-warning",
      },
      size: {
        xs: "size-2 -bottom-0 -right-0",
        sm: "size-2.5 -bottom-0 -right-0",
        md: "size-3 -bottom-0.5 -right-0.5",
        lg: "size-3.5 -bottom-0.5 -right-0.5",
        xl: "size-4 -bottom-1 -right-1",
      },
    },
    defaultVariants: {
      status: "online",
      size: "sm",
    },
  }
)

interface AvatarProps
  extends React.ComponentProps<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarSizeVariants> {
  status?: "online" | "offline" | "busy" | "away"
}

function Avatar({
  className,
  size,
  status,
  children,
  ...props
}: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarSizeVariants({ size }), className)}
      {...props}
    >
      {children}
      {status && (
        <span
          className={cn(statusIndicatorVariants({ status, size }))}
          aria-label={`Status: ${status}`}
        />
      )}
    </AvatarPrimitive.Root>
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
