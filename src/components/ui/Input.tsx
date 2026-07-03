import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leadingIcon?: ReactNode;
    containerClassName?: string;
}

export function Input({ label, error, hint, leadingIcon, className, containerClassName, id, ...props }: InputProps) {
    const inputId = id ?? props.name;
    const descriptionId = inputId ? `${inputId}-description` : undefined;

    return (
        <div className={cn('flex min-w-0 flex-col gap-1', containerClassName)}>
            {label && (
                <label htmlFor={inputId} className="text-xs font-semibold tracking-wide text-[#5F82A3]">
                    {label}
                </label>
            )}
            <div className="relative">
                {leadingIcon && <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7BA1C3]">{leadingIcon}</div>}
                <input
                    id={inputId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={(error || hint) && descriptionId ? descriptionId : undefined}
                    className={cn(
                        'min-h-9 w-full rounded-lg border bg-white px-3 py-1.5 text-sm font-medium text-[#0F3154] outline-none transition-colors placeholder:text-[#8AAED0] focus:border-[#42AEE8] focus:ring-4 focus:ring-[#42AEE8]/10 disabled:cursor-not-allowed disabled:border-[#DDE7EF] disabled:bg-[#F3F7FA] disabled:text-[#5F82A3]',
                        leadingIcon ? 'pl-10' : '',
                        error ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/10' : 'border-[#BFE3F7]',
                        className,
                    )}
                    {...props}
                />
            </div>
            {(error || hint) && (
                <p id={descriptionId} className={cn('text-xs font-semibold leading-relaxed', error ? 'text-red-600' : 'text-[#5F82A3]')}>
                    {error || hint}
                </p>
            )}
        </div>
    );
}
