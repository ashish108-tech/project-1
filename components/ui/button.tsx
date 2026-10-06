import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d766c]/30 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: { default: 'bg-[#0d766c] text-white hover:bg-[#095b55]', outline: 'border border-[#dce9e8] bg-white text-[#153238] hover:bg-[#f0f8f5]', ghost: 'text-[#517275] hover:bg-[#eff7f5] hover:text-[#0d766c]' },
    size: { default: 'h-11 px-4', sm: 'h-9 px-3 text-xs', lg: 'h-13 px-5' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />; }
