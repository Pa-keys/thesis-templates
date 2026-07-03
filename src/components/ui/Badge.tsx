import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

export type BadgeTone = 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'pink' | 'indigo' | 'teal';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    children: ReactNode;
    tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
    blue: 'border-[#BFE3F7] bg-[#EAF6FF] text-[#147EC1]',
    green: 'border-[#BFE3F7] bg-[#EAF6FF] text-[#147EC1]',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    slate: 'border-[#DDE7EF] bg-[#F8FAFC] text-[#456987]',
    pink: 'border-pink-200 bg-pink-50 text-pink-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    teal: 'border-[#BFE3F7] bg-[#EAF6FF] text-[#147EC1]',
};

export function Badge({ children, tone = 'slate', className, ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex min-h-6 max-w-full items-center justify-center rounded-md border px-2 py-0.5 text-center text-xs font-semibold leading-tight',
                toneClasses[tone],
                className,
            )}
            {...props}
        >
            {children}
        </span>
    );
}
