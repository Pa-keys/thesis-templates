import React, { useState, useEffect, useCallback } from 'react';

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
            <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 fade-in duration-300 ${toast.isError ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                <div className="w-8 h-8 flex-shrink-0 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
                    {toast.isError ? '✕' : '✓'}
                </div>
                <div>
                    <div className="flex items-center gap-4">
                        <p className="font-bold text-sm tracking-wide">{toast.msg}</p>
                        <button onClick={hideToast} className="ml-auto flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity focus:outline-none" aria-label="Close message">
                            ✕
                        </button>
                    </div>
                    {toast.subText && (
                        <p className="text-xs text-opacity-90 mt-0.5">{toast.subText}</p>
                    )}
                </div>
            </div>
        );
    };

    return { showToast, ToastComponent };
}
