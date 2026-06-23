interface LoadingStateProps {
    label?: string;
    className?: string;
}

export function LoadingState({ label = 'Loading...', className = '' }: LoadingStateProps) {
    return (
        <div role="status" aria-live="polite" aria-busy="true" className={`flex min-w-0 max-w-full flex-col items-center justify-center gap-3 rounded-xl px-4 py-10 text-center sm:px-6 sm:py-12 ${className}`}>
            <svg aria-hidden="true" className="h-7 w-7 animate-spin text-blue-600 motion-reduce:animate-none" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="max-w-full break-words text-sm font-semibold leading-relaxed text-slate-600">{label}</span>
        </div>
    );
}
