import type { ReactNode } from 'react';
import { Icon } from '../shared/Icon';
import { cn } from './utils';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    className?: string;
}

export function EmptyState({ icon, title, description, className = '' }: EmptyStateProps) {
    return (
        <div role="status" className={cn('flex min-w-0 max-w-full flex-col items-center justify-center rounded-lg border border-[#DDE7EF] bg-[#F8FAFC] px-3 py-5 text-center sm:px-4 sm:py-6', className)}>
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md border border-[#CBD5E1] bg-white text-[#334155]">
                {icon ?? <Icon name="inbox" className="h-5 w-5" />}
            </div>
            <h3 className="max-w-full break-words text-sm font-semibold leading-snug text-[#0F3154]">{title}</h3>
            {description && <p className="mt-1 max-w-sm break-words text-xs leading-relaxed text-[#456987]">{description}</p>}
        </div>
    );
}
