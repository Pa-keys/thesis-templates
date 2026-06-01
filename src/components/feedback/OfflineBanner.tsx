import React from 'react';

export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
    if (isOnline) return null;

    return (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-4 text-amber-900 animate-in slide-in-from-top-4 fade-in duration-300 shadow-sm z-20 relative">
            <div className="text-2xl flex-shrink-0">⚠️</div>
            <div>
                <p className="font-bold text-sm leading-tight">You are working offline</p>
                <p className="text-xs text-amber-700 mt-0.5">Changes made now will be stored locally and sync securely when connection is restored.</p>
            </div>
        </div>
    );
}