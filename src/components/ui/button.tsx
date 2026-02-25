import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-sky-500/90 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_8px_28px_rgba(37,99,235,0.35)] hover:from-sky-400 hover:to-blue-500",
        destructive: "bg-rose-500 text-white hover:bg-rose-600",
        secondary:
          "border border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100",
        outline:
          "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
