import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const skeletonVariants = cva("rounded-md", {
  variants: {
    variant: {
      default: "bg-primary/10 animate-pulse",
      shimmer: "animate-shimmer",
    },
  },
  defaultVariants: {
    variant: "shimmer",
  },
})

function Skeleton({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof skeletonVariants>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(skeletonVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Skeleton, skeletonVariants }
