import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/92 hover:shadow-lg hover:shadow-primary/20',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/92',
        outline: 'border border-border bg-white/70 text-foreground hover:bg-white hover:border-primary/30',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/92',
        ghost: 'text-muted-foreground hover:bg-white/70 hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2.5',
        sm: 'h-9 rounded-xl px-3',
        lg: 'h-12 rounded-2xl px-6',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
