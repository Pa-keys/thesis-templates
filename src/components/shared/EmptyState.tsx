import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    className?: string;
}

export function EmptyState({ icon, title, description, className = '' }: EmptyStateProps) {
    return (
        <div role="status" className={`flex min-w-0 max-w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center sm:px-6 sm:py-12 ${className}`}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm">
                {icon ?? <Icon name="inbox" className="h-6 w-6" />}
            </div>
            <h3 className="max-w-full break-words text-sm font-extrabold leading-relaxed text-slate-800">{title}</h3>
            {description && <p className="mt-1.5 max-w-sm break-words text-sm leading-relaxed text-slate-600">{description}</p>}
        </div>
    );
}
