import { useCallback, useState } from 'react';

export interface ToastState {
    show: boolean;
    msg: string;
    isError: boolean;
    subText?: string;
}

export function useToast() {
    const [toast, setToast] = useState<ToastState>({ show: false, msg: '', isError: false });

    const showToast = useCallback((msg: string, isError: boolean = false, subText?: string) => {
        setToast({ show: true, msg, isError, subText });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 4000);
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, show: false }));
    }, []);

    const ToastComponent = () => {
        if (!toast.show) return null;

        return (
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className={`fixed right-4 top-4 z-[10000] flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-xl px-5 py-4 text-white shadow-2xl ring-1 ring-white/20 sm:right-6 sm:top-6 ${toast.isError ? 'bg-red-700' : 'bg-emerald-700'}`}
            >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-black">
                    {toast.isError ? '!' : 'OK'}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-4">
                        <p className="text-sm font-bold leading-snug tracking-wide">{toast.msg}</p>
                        <button
                            onClick={hideToast}
                            className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-black opacity-80 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            aria-label="Close message"
                        >
                            X
                        </button>
                    </div>
                    {toast.subText && (
                        <p className="mt-1 text-xs font-medium text-white/90">{toast.subText}</p>
                    )}
                </div>
            </div>
        );
    };

    return { showToast, ToastComponent };
}
