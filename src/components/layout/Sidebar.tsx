import React, { useEffect, useRef, useState } from 'react';
import { logout } from '../../lib/auth/roles';
import { Icon } from '../shared/Icon';

interface NavItem {
    id: string;
    label: string;
    icon: string;
    disabled?: boolean;
}

interface SidebarProps {
    activePage: string;
    userName: string;
    userInitials: string;
    userRole: string;
    navItems: NavItem[];
    onNavigate: (id: string) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;
    isOnline: boolean;
}

export function Sidebar({ 
    activePage, userName, userInitials, userRole, navItems, 
    onNavigate, isMobileMenuOpen, setIsMobileMenuOpen, isOnline 
}: SidebarProps) {
    
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const cancelLogoutRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!showLogoutModal) return;
        cancelLogoutRef.current?.focus();
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowLogoutModal(false);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [showLogoutModal]);

    // Dynamic styles based on connection status to maintain UI consistency
    const logoBg = isOnline ? 'bg-blue-600' : 'bg-amber-500';
    const activeBg = isOnline ? 'bg-[#EBF3FF]' : 'bg-amber-50';
    const activeText = isOnline ? 'text-blue-600' : 'text-amber-600';
    const activeIndicator = isOnline ? 'bg-blue-600' : 'bg-amber-500';

    return (
        <>
            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <button
                    type="button"
                    aria-label="Close navigation menu"
                    className="fixed inset-0 z-40 border-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            
            <aside aria-label="Primary navigation" className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] md:w-[240px] bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out print:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>
                
                {/* Brand Header */}
                <div className="flex min-h-[72px] items-center justify-between border-b border-slate-200 p-4 md:p-5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ring-1 ring-black/5 shrink-0 transition-colors duration-200 ${logoBg}`} aria-hidden="true">
                            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor"><path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z" /></svg>
                        </div>
                        <div>
                            <div className="text-base font-extrabold text-slate-900 leading-tight">MediSens</div>
                            <div className="text-[0.65rem] font-bold text-slate-400 uppercase">Rural Health Unit</div>
                        </div>
                    </div>
                    <button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close navigation menu" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden">
                        <Icon name="close" className="h-5 w-5" />
                    </button>
                </div>
            
                {/* Navigation Section */}
                <div className="px-5 py-4 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 shrink-0">Main Menu</div>
                <nav aria-label="Main menu" className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto scrollbar-hide">
                    {navItems.map((item) => {
                        const isActive = activePage === item.id;
                        return (
                            <button 
                                key={item.id} 
                                onClick={() => {
                                    if (item.disabled) return;
                                    onNavigate(item.id);
                                    setIsMobileMenuOpen(false);
                                }}
                                disabled={item.disabled}
                                aria-current={isActive ? 'page' : undefined}
                                className={`relative flex min-h-11 items-center w-full text-left gap-3 text-sm transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 ${
                                    item.disabled
                                    ? 'cursor-not-allowed rounded-lg px-3 text-slate-400 opacity-70'
                                    : isActive
                                    ? `font-semibold ${activeBg} ${activeText} rounded-r-lg relative -ml-3 pl-6 pr-3` 
                                    : 'font-medium text-slate-600  hover:bg-slate-50  rounded-lg px-3'
                                }`}
                            >
                                {isActive && (
                                    <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-md transition-colors duration-500 ${activeIndicator}`}></div>
                                )}
                                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Integrated Profile & Logout Block */}
                <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    className="mt-auto w-full shrink-0 border-t border-slate-200 bg-white p-3 text-left hover:bg-slate-50 transition-colors group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-blue-600"
                    title="Log out"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0 transition-colors duration-500 ${logoBg}`}>
                                {userInitials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{userName}</p>
                                <p className="text-[0.6rem] text-slate-500 capitalize">{userRole}</p>
                            </div>
                        </div>
                        <Icon name="logout" className="h-4 w-4 text-slate-400 transition-colors group-hover:text-red-600" />
                    </div>
                </button>
            </aside>

            {/* Custom Logout Modal */}
            {showLogoutModal && (
                <div onClick={() => setShowLogoutModal(false)} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm transition-opacity" role="presentation">
                    <div onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title" aria-describedby="logout-dialog-description" className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"><Icon name="logout" className="h-5 w-5" /></div>
                        <h3 id="logout-dialog-title" className="text-xl font-semibold text-slate-900 tracking-tight">Log out</h3>
                        <p id="logout-dialog-description" className="text-sm text-slate-600 mt-2 mb-6">Are you sure you want to end your session?</p>
                        <div className="flex w-full gap-3">
                            <button 
                                ref={cancelLogoutRef}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowLogoutModal(false);
                                }}
                                className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    await logout();
                                }}
                                className="min-h-11 flex-1 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
