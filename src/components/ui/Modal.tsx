import { useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { cn } from './utils';

interface ModalProps {
    children: ReactNode;
    labelledBy: string;
    className?: string;
    onClose?: () => void;
    initialFocusRef?: RefObject<HTMLElement>;
}

export function Modal({ children, labelledBy, className, onClose, initialFocusRef }: ModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const focusTarget = initialFocusRef?.current ?? dialogRef.current;
        focusTarget?.focus({ preventScroll: true });
    }, [initialFocusRef]);

    useEffect(() => {
        if (!onClose) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            className={cn('clinical-dialog w-full overflow-hidden', className)}
        >
            {children}
        </div>
    );
}
