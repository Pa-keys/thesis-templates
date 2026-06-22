interface NetworkBadgeProps {
    isOnline: boolean;
    compact?: boolean;
    className?: string;
}

export function NetworkBadge({ isOnline, compact = false, className = '' }: NetworkBadgeProps) {
    return (
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 border rounded-full ${isOnline ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} ${className}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            {!compact && (
                <span className={`text-[0.7rem] font-extrabold uppercase tracking-wider ${isOnline ? 'text-green-700' : 'text-amber-700'}`}>
                    {isOnline ? 'System Online' : 'System Offline'}
                </span>
            )}
        </div>
    );
}
