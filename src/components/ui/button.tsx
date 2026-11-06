import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none";

const neoRaised =
  "bg-[var(--neo-bg)] text-foreground shadow-[4px_4px_10px_var(--neo-shadow-dark),-4px_-4px_10px_var(--neo-shadow-light)] hover:shadow-[6px_6px_14px_var(--neo-shadow-dark),-6px_-6px_14px_var(--neo-shadow-light)] hover:-translate-y-px active:translate-y-0 active:shadow-[inset_3px_3px_6px_var(--neo-shadow-dark),inset_-3px_-3px_6px_var(--neo-shadow-light)]";

const buttonVariants = cva(base, {
  variants: {
    variant: {
      default:
        "text-white shadow-[4px_4px_10px_var(--neo-shadow-dark),-4px_-4px_10px_var(--neo-shadow-light)] hover:shadow-[6px_6px_14px_var(--neo-shadow-dark),-6px_-6px_14px_var(--neo-shadow-light)] hover:-translate-y-px active:translate-y-0 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.25)] bg-[linear-gradient(135deg,oklch(0.6_0.16_255),oklch(0.68_0.14_240))]",
      destructive:
        "text-white bg-[linear-gradient(135deg,oklch(0.6_0.22_27),oklch(0.65_0.2_15))] shadow-[4px_4px_10px_var(--neo-shadow-dark),-4px_-4px_10px_var(--neo-shadow-light)] hover:-translate-y-px active:translate-y-0",
      outline: neoRaised,
      secondary: neoRaised,
      ghost:
        "hover:bg-[var(--neo-bg)] hover:shadow-[3px_3px_8px_var(--neo-shadow-dark),-3px_-3px_8px_var(--neo-shadow-light)] rounded-xl",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      default: "h-10 px-5 py-2",
      sm: "h-8 rounded-lg px-3 text-xs",
      lg: "h-12 rounded-2xl px-8 text-base",
      icon: "h-10 w-10",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
