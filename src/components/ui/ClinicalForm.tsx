import type { ReactNode } from 'react';
import { cn } from './utils';

export const clinicalInputClass =
    'w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500';

export const clinicalTextareaClass = cn(clinicalInputClass, 'resize-y leading-relaxed');

export const clinicalLabelClass =
    'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5';

export const clinicalSectionHeaderClass =
    'text-sm font-semibold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4';

export const clinicalInputErrorClass = cn(
    clinicalInputClass,
    'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/10',
);

interface ClinicalFieldProps {
    label: ReactNode;
    htmlFor?: string;
    children: ReactNode;
    required?: boolean;
    hint?: ReactNode;
    error?: ReactNode;
    className?: string;
}

export function ClinicalField({ label, htmlFor, children, required, hint, error, className }: ClinicalFieldProps) {
    return (
        <div className={cn('min-w-0', className)}>
            <label htmlFor={htmlFor} className={clinicalLabelClass}>
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {children}
            {(error || hint) && (
                <p className={cn('mt-1 text-xs font-semibold leading-relaxed', error ? 'text-red-600' : 'text-slate-500')}>
                    {error || hint}
                </p>
            )}
        </div>
    );
}

interface ClinicalSectionHeaderProps {
    children: ReactNode;
    className?: string;
}

export function ClinicalSectionHeader({ children, className }: ClinicalSectionHeaderProps) {
    return <h3 className={cn(clinicalSectionHeaderClass, className)}>{children}</h3>;
}
