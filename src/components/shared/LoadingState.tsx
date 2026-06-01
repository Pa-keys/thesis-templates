interface LoadingStateProps {
    label?: string;
    className?: string;
}

export function LoadingState({ label = 'Loading...', className = '' }: LoadingStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${className}`}>
            <svg className="h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm font-medium text-slate-400">{label}</span>
        </div>
    );
}
