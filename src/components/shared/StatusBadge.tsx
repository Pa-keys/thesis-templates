import type { ReactNode } from 'react';

type StatusTone = 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'pink' | 'indigo';

const toneClass: Record<StatusTone, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    pink: 'bg-pink-50 text-pink-700 border-pink-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

interface StatusBadgeProps {
    children: ReactNode;
    tone?: StatusTone;
    className?: string;
}

export function StatusBadge({ children, tone = 'slate', className = '' }: StatusBadgeProps) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold leading-none ${toneClass[tone]} ${className}`}>
            {children}
        </span>
    );
}
