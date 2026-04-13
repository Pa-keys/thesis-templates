import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabase'; 
import { logout } from '../shared/auth';

interface SidebarProps {
    activePage: 'dashboard' | 'records' | 'new-record' | 'consultation' | 'settings';
    doctorName: string;
    doctorInitials: string;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;
    isOnline: boolean; // 🔴 Prop handled
}

export function Sidebar({ activePage, doctorName, doctorInitials, isMobileMenuOpen, setIsMobileMenuOpen, isOnline }: SidebarProps) {
    const [userEmail, setUserEmail] = useState('Loading...');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.email) {
                setUserEmail(session.user.email);
            }
        });
    }, []);

    // 🎨 Dynamic Theme Logic
    const themeColor = isOnline ? 'blue' : 'amber';
    
    // Classes for the Active State
    const activeBg = isOnline ? 'bg-[#EBF3FF]' : 'bg-amber-50';
    const activeText = isOnline ? 'text-blue-600' : 'text-amber-600';
    const activeIndicator = isOnline ? 'bg-blue-600' : 'bg-amber-500';
    const logoBg = isOnline ? 'bg-blue-600' : 'bg-amber-500';

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: 'doctor.html' },
        { id: 'records', label: 'Records', icon: '📁', href: 'records.html' },
        { id: 'new-record', label: 'New Record', icon: '➕', href: 'templates.html' },
        { id: 'consultation', label: 'Consultation', icon: '🩺', href: 'consultation.html' }
    ];

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] md:w-[240px] bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out print:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>
            
            {/* Header / Logo */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-3">
                    {/* Dynamic Logo Background */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 transition-colors duration-500 ${logoBg}`}>
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2a1 1 0 0 1 1 1v4h4a1 1 0 0 1 0 2h-4v4a1 1 0 0 1-2 0V9H7a1 1 0 0 1 0-2h4V3a1 1 0 0 1 1-1z"/><path d="M4 16a8 8 0 0 1 16 0v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4z"/>
                        </svg>
                    </div>
                    <div>
                        <div className="text-base font-extrabold text-slate-900 leading-tight">MediSens</div>
                        <div className="text-[0.65rem] font-bold text-slate-400 uppercase">Rural Health Unit</div>
                    </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600 p-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            {/* Main Navigation */}
            <div className="px-5 py-4 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 shrink-0">Main Menu</div>
            <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto scrollbar-hide">
                {menuItems.map((item) => {
                    const isActive = activePage === item.id;
                    return (
                        <a 
                            key={item.id} 
                            href={item.href} 
                            onClick={() => setIsMobileMenuOpen(false)} // Add this line
                            className={`flex items-center gap-3 py-2.5 text-sm transition-all duration-500 ${
                                isActive 
                                ? `font-semibold ${activeBg} ${activeText} rounded-r-lg relative -ml-3 pl-6 pr-3` 
                                : 'font-medium text-slate-600 hover:bg-slate-50 rounded-lg px-3'
                            }`}
                        >
                            {/* Dynamic Left Indicator Bar */}
                            {isActive && (
                                <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-md transition-colors duration-500 ${activeIndicator}`}></div>
                            )}
                            <span>{item.icon}</span> {item.label}
                        </a>
                    );
                })}
                
                <div className="mt-4 mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">System</div>
                <a 
                    href="settings.html" 
                    className={`flex items-center gap-3 py-2.5 text-sm transition-all duration-500 ${
                        activePage === 'settings'
                        ? `font-semibold ${activeBg} ${activeText} rounded-r-lg relative -ml-3 pl-6 pr-3`
                        : 'font-medium text-slate-600 hover:bg-slate-50 rounded-lg px-3'
                    }`}
                >
                    {activePage === 'settings' && (
                        <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-md transition-colors duration-500 ${activeIndicator}`}></div>
                    )}
                    <span>⚙️</span> Settings
                </a>
            </nav>

            {/* Bottom Profile / Logout */}
            <div 
                className="p-4 border-t border-slate-200 bg-white mt-auto shrink-0 cursor-pointer hover:bg-slate-50 transition-colors group" 
                onClick={logout}
                title="Click to logout"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0 transition-colors duration-500 ${logoBg}`}>
                            {doctorInitials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{doctorName}</p>
                            <p className="text-[0.65rem] text-slate-500 truncate">General Practitioner</p>
                        </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </div>
            </div>
        </aside>
    );
}