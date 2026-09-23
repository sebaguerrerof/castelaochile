import type { ButtonHTMLAttributes } from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "button-motion inline-flex items-center justify-center gap-2 rounded-full font-nav text-sm font-bold tracking-[0.04em] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary px-6 py-3 text-primary-foreground shadow-[var(--shadow-primary)] hover:bg-primary/90",
        secondary:
          "bg-secondary px-6 py-3 text-secondary-foreground hover:bg-primary hover:text-primary-foreground",
        outline:
          "border border-primary bg-transparent px-6 py-3 text-primary hover:bg-primary hover:text-primary-foreground",
        accent:
          "bg-accent px-6 py-3 text-accent-foreground hover:brightness-95",
        inverted:
          "border border-primary-foreground/35 bg-primary-foreground text-primary hover:bg-primary-foreground/90",
        quiet: "px-2 py-2 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11",
        sm: "min-h-9 px-4 py-2 text-xs",
        lg: "min-h-12 px-7 py-3.5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

type LinkButtonProps = React.AnchorHTMLAttributes<HTMLAnchorElement> &
  VariantProps<typeof buttonVariants>;

export function LinkButton({ className, variant, size, ...props }: LinkButtonProps) {
  return <a className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
