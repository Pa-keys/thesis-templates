import type { ReactNode, RefObject } from 'react';
import { Icon } from '../shared/Icon';
import { Modal } from './Modal';
import { cn } from './utils';

interface ClinicalDrawerProps {
    children: ReactNode;
    title: string;
    labelledBy: string;
    onClose: () => void;
    subtitle?: ReactNode;
    status?: ReactNode;
    footer?: ReactNode;
    className?: string;
    initialFocusRef?: RefObject<HTMLElement>;
}

export function ClinicalDrawer({
    children,
    title,
    labelledBy,
    onClose,
    subtitle,
    status,
    footer,
    className,
    initialFocusRef,
}: ClinicalDrawerProps) {
    return (
        <>
            <button
                type="button"
                aria-label={`Close ${title}`}
                className="clinical-drawer-backdrop"
                onClick={onClose}
            />
            <Modal
                labelledBy={labelledBy}
                onClose={onClose}
                initialFocusRef={initialFocusRef}
                className={cn('clinical-drawer', className)}
            >
                <div className="clinical-drawer-header">
                    <div className="min-w-0">
                        <div id={labelledBy} className="font-semibold text-slate-900 text-base">{title}</div>
                        {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {status}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={`Close ${title}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                            <Icon name="close" className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="clinical-drawer-body">
                    {children}
                </div>
                {footer && <div className="clinical-drawer-footer">{footer}</div>}
            </Modal>
        </>
    );
}
