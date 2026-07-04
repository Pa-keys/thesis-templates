import { cn } from './utils';

interface LoadingStateProps {
    label?: string;
    className?: string;
}

export function LoadingState({ label = 'Loading...', className = '' }: LoadingStateProps) {
    return (
        <div role="status" aria-live="polite" aria-busy="true" className={cn('flex min-w-0 max-w-full flex-col items-center justify-center gap-3 rounded-lg border border-[#DDE7EF] bg-[#F8FAFC] px-4 py-8 text-center sm:px-5 sm:py-10', className)}>
            <svg aria-hidden="true" className="h-6 w-6 animate-spin text-[#334155] motion-reduce:animate-none" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="max-w-full break-words text-sm font-semibold leading-relaxed text-[#456987]">{label}</span>
        </div>
    );
}
