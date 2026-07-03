import { useCallback, useState } from 'react';
import { Toast } from '../ui/Toast';

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
        return <Toast message={toast.msg} type={toast.isError ? 'error' : 'success'} subText={toast.subText} onClose={hideToast} />;
    };

    return { showToast, ToastComponent };
}
