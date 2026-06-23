import { Icon } from './Icon';

interface NetworkBadgeProps {
    isOnline: boolean;
    compact?: boolean;
    className?: string;
}

export function NetworkBadge({ isOnline, compact = false, className = '' }: NetworkBadgeProps) {
    const statusLabel = isOnline ? 'System online' : 'System offline';

    return (
        <div role="status" aria-live="polite" aria-label={statusLabel} className={`inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm ${isOnline ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} ${className}`}>
            <Icon name={isOnline ? 'wifi' : 'wifi-off'} className={`h-4 w-4 ${isOnline ? 'text-green-600' : 'text-amber-600'}`} />
            {!compact && (
                <span className={`min-w-0 truncate text-[0.7rem] font-extrabold uppercase tracking-wider ${isOnline ? 'text-green-700' : 'text-amber-700'}`}>
                    {statusLabel}
                </span>
            )}
        </div>
    );
}
