import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

const spinnerVariants = cva("animate-spin shrink-0", {
  variants: {
    size: {
      xs: "size-3",
      sm: "size-4",
      md: "size-5",
      lg: "size-7",
    },
  },
  defaultVariants: { size: "md" },
})

interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string
  /** Accessible label read by screen readers (defaults to "Carregando") */
  label?: string
}

export function Spinner({ size, className, label = "Carregando" }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn(spinnerVariants({ size }), className)}
    />
  )
}
