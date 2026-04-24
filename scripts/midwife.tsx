import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { Sidebar } from './sidebar';
import Dashboard from './midwife/dashboard';
import PatientRecords from './midwife/patientRecords';
import CensusEntry from './midwife/censusEntry';
import ReportGenerator from './midwife/reportGenerator';
import { useMidwifeData } from './midwife/useMidwifeData';

const MidwifeApp = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [userData, setUserData] = useState({ name: 'Loading...', initials: 'U' });

    const { patients, records, isLoading, refreshData } = useMidwifeData();

    // ─── Stable refresh callback for realtime handlers ────────────────────────
    const handleRealtimeChange = useCallback(async () => {
        await refreshData();
    }, [refreshData]);

    // ─── Silent auto-refresh every second ────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            refreshData();
        }, 1000);
        return () => clearInterval(interval);
    }, [refreshData]);

    useEffect(() => {
        // ─── Online/offline listeners ─────────────────────────────────────────
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // ─── Auth + profile fetch ─────────────────────────────────────────────
        const fetchProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                window.location.href = '/pages/login.html';
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                const name = profile.full_name || 'Midwife';
                const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                setUserData({ name, initials });
            }
        };
        fetchProfile();

        // ─── Realtime: listen to all tables that affect the midwife view ──────
        // patients       — new registrations appear immediately
        // patient_consent — consent status changes reflect live
        // fhsis_logs      — any FHSIS log changes
        const channel = supabase
            .channel('midwife-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, () => handleRealtimeChange())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patients' }, () => handleRealtimeChange())
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'patients' }, () => handleRealtimeChange())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patient_consent' }, () => handleRealtimeChange())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patient_consent' }, () => handleRealtimeChange())
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'patient_consent' }, () => handleRealtimeChange())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fhsis_logs' }, () => handleRealtimeChange())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fhsis_logs' }, () => handleRealtimeChange())
            .subscribe((status) => {
                console.log('[Realtime] midwife-realtime channel status:', status);
            });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            supabase.removeChannel(channel);
        };
    }, [handleRealtimeChange]);

    const midwifeNavItems = [
        { id: 'dashboard', label: 'Home', icon: '🏠' },
        { id: 'records', label: 'Patient Records', icon: '📁' },
        { id: 'census', label: 'Census Entry', icon: '📋' },
        { id: 'reports', label: 'OCR Reports', icon: '📊' }
    ];

    return (
        // ─── Full viewport container, no overflow leaks ───────────────────────
        <div className="flex h-screen w-screen bg-[#F8FAFC] overflow-hidden">
            <Sidebar
                activePage={activeTab}
                userName={userData.name}
                userInitials={userData.initials}
                userRole="Registered Midwife"
                navItems={midwifeNavItems}
                onNavigate={(id) => setActiveTab(id)}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            {/* ─── Main area: grows to fill ALL remaining space ─────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden md:ml-[240px]">

                {/* Header */}
                <header className="h-[60px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 p-2 -ml-2 rounded-lg hover:bg-slate-50">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="font-bold text-lg text-slate-800 capitalize">
                            {activeTab === 'dashboard' ? 'Midwife Dashboard'
                                : activeTab === 'records' ? 'Patient Records'
                                : activeTab === 'census' ? 'Census Entry'
                                : activeTab === 'reports' ? 'OCR Reports'
                                : activeTab.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 border rounded-full ${isOnline ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                            {isOnline
                                ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                : <span className="w-2 h-2 rounded-full bg-amber-500" />
                            }
                            <span className={`text-[0.7rem] font-extrabold uppercase tracking-wider ${isOnline ? 'text-green-700' : 'text-amber-700'}`}>
                                {isOnline ? 'System Online' : 'System Offline'}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{userData.name}</div>
                            <div className="text-[0.7rem] text-slate-500 font-medium">Registered Midwife</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                            {userData.initials}
                        </div>
                    </div>
                </header>

                {/* ─── Scrollable content area — fills ALL remaining height ─── */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F8FAFC]">
                    <div className="w-full h-full p-4 md:p-6 lg:p-8">
                        <div className="w-full">
                            {activeTab === 'dashboard' && (
                                <Dashboard patients={patients} censusRecords={records} />
                            )}
                            {activeTab === 'records' && (
                                <PatientRecords patients={patients} records={records} isLoading={isLoading} />
                            )}
                            {activeTab === 'census' && (
                                <CensusEntry
                                    patients={patients}
                                    records={records}
                                    onSaveSuccess={async () => {
                                        await refreshData();
                                    }}
                                />
                            )}
                            {activeTab === 'reports' && (
                                <ReportGenerator records={records} />
                            )}
                        </div>
                        {/* Invisible sync indicator — keeps isLoading in the render tree so data flows correctly */}
                        {isLoading && <span className="sr-only">Syncing...</span>}
                    </div>
                </div>
            </main>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
        <React.StrictMode>
            <MidwifeApp />
        </React.StrictMode>
    );
}