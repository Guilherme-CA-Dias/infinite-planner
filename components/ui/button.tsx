import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'soft' | 'hero' | 'glass';
  size?: 'default' | 'sm' | 'icon' | 'icon-sm';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    
    const variants = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      soft: 'bg-accent text-accent-foreground hover:bg-accent/80',
      hero: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow',
      glass: 'bg-background/80 backdrop-blur-xl border border-border/50 hover:bg-background/90',
    };

    const sizes = {
      default: 'h-10 px-4 py-2 text-sm',
      sm: 'h-8 px-3 py-1.5 text-xs',
      icon: 'h-10 w-10',
      'icon-sm': 'h-8 w-8',
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };

