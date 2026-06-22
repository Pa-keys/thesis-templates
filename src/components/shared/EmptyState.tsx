import type { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    className?: string;
}

export function EmptyState({ icon = 'No data', title, description, className = '' }: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center text-center rounded-xl border border-slate-100 bg-slate-50 px-6 py-12 ${className}`}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                <span className="text-xl leading-none">{icon}</span>
            </div>
            <h3 className="text-sm font-bold text-slate-700">{title}</h3>
            {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
        </div>
    );
}
