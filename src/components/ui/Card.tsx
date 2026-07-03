import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
    return (
        <div className={cn('rounded-lg border border-[#DDE7EF] bg-white shadow-[0_1px_1px_rgba(15,49,84,0.04)]', className)} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className, ...props }: CardProps) {
    return (
        <div className={cn('border-b border-[#DDE7EF] bg-[#F8FAFC] px-3 py-2 sm:px-4', className)} {...props}>
            {children}
        </div>
    );
}

export function CardBody({ children, className, ...props }: CardProps) {
    return (
        <div className={cn('px-3 py-3 sm:px-4', className)} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className, ...props }: CardProps) {
    return (
        <h2 className={cn('text-base font-semibold leading-tight text-[#0F3154]', className)} {...props}>
            {children}
        </h2>
    );
}
