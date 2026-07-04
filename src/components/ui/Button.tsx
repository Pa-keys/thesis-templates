import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
    isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'border-[#334155] bg-[#334155] text-white shadow-sm hover:border-[#1E293B] hover:bg-[#1E293B]',
    secondary: 'border-[#2F7D75] bg-[#2F7D75] text-white shadow-sm hover:border-[#276961] hover:bg-[#276961]',
    outline: 'border-[#CBD5E1] bg-white text-[#172033] shadow-sm hover:border-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#1E293B]',
    ghost: 'border-transparent bg-transparent text-[#456987] hover:bg-[#F8FAFC] hover:text-[#0F3154]',
    danger: 'border-red-600 bg-red-600 text-white shadow-sm shadow-red-600/20 hover:border-red-700 hover:bg-red-700',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'min-h-8 rounded-md px-3 py-1 text-xs',
    md: 'min-h-9 rounded-lg px-3 py-2 text-sm',
    lg: 'min-h-10 rounded-lg px-4 py-2 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
    children,
    className,
    variant = 'primary',
    size = 'md',
    leadingIcon,
    trailingIcon,
    isLoading = false,
    disabled,
    type = 'button',
    ...props
}: ButtonProps, ref) {
    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || isLoading}
            className={cn(
                'inline-flex max-w-full items-center justify-center gap-2 border font-semibold leading-tight transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#42AEE8] disabled:cursor-not-allowed disabled:border-[#DDE7EF] disabled:bg-[#F3F7FA] disabled:text-[#7BA1C3] disabled:shadow-none',
                sizeClasses[size],
                variantClasses[variant],
                className,
            )}
            {...props}
        >
            {isLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden="true" />
            )}
            {!isLoading && leadingIcon}
            <span className="min-w-0 truncate">{children}</span>
            {!isLoading && trailingIcon}
        </button>
    );
});
