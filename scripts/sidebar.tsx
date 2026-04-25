import React, { useState } from 'react';
import { logout } from '../shared/auth';

interface NavItem {
    id: string;
    label: string;
    icon: string;
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

    // Dynamic styles based on connection status to maintain UI consistency
    const logoBg = isOnline ? 'bg-blue-600' : 'bg-amber-500';
    const activeBg = isOnline ? 'bg-[#EBF3FF]' : 'bg-amber-50';
    const activeText = isOnline ? 'text-blue-600' : 'text-amber-600';
    const activeIndicator = isOnline ? 'bg-blue-600' : 'bg-amber-500';

    return (
        <>
            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            
            <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] md:w-[240px] bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out print:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>
                
                {/* Brand Header */}
                <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 transition-colors duration-500 ${logoBg}`}>
                            <span className="text-white font-bold text-xl">+</span>
                        </div>
                        <div>
                            <div className="text-base font-extrabold text-slate-900 leading-tight">MediSens</div>
                            <div className="text-[0.65rem] font-bold text-slate-400 uppercase">Rural Health Unit</div>
                        </div>
                    </div>
                </div>
            
                {/* Navigation Section */}
                <div className="px-5 py-4 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 shrink-0">Main Menu</div>
                <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto scrollbar-hide">
                    {navItems.map((item) => {
                        const isActive = activePage === item.id;
                        return (
                            <button 
                                key={item.id} 
                                onClick={() => {
                                    onNavigate(item.id);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`flex items-center w-full text-left gap-3 py-2.5 text-sm transition-all duration-500 ${
                                    isActive 
                                    ? `font-semibold ${activeBg} ${activeText} rounded-r-lg relative -ml-3 pl-6 pr-3` 
                                    : 'font-medium text-slate-600  hover:bg-slate-50  rounded-lg px-3'
                                }`}
                            >
                                {isActive && (
                                    <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-md transition-colors duration-500 ${activeIndicator}`}></div>
                                )}
                                <span>{item.icon}</span> {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Integrated Profile & Logout Block */}
                <div 
                    onClick={() => setShowLogoutModal(true)}
                    className="p-3 border-t border-slate-200 bg-white mt-auto shrink-0 cursor-pointer hover:bg-slate-50 transition-colors group"
                    title="Click to Logout"
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
                        <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                        </svg>
                    </div>
                </div>
            </aside>

            {/* Custom Logout Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 w-[320px] shadow-2xl border border-white/20 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Log Out</h3>
                        <p className="text-sm text-slate-500 mt-2 mb-6">Are you sure you want to end your session?</p>
                        <div className="flex w-full gap-3">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowLogoutModal(false);
                                }}
                                className="flex-1 py-3 bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 font-semibold rounded-2xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    await logout();
                                }}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl transition-colors shadow-sm"
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