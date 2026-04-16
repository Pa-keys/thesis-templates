import React, { useState, useEffect } from 'react';
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
    const [userData, setUserData] = useState({ name: 'Loading...', initials: 'U' });

    const { patients, records, isLoading, refreshData } = useMidwifeData();

    useEffect(() => {
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
    }, []);

    const midwifeNavItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
        { id: 'records', label: 'Patient Records', icon: '📁' },
        { id: 'census', label: 'Census Entry', icon: '📋' },
        { id: 'reports', label: 'OCR Reports', icon: '📊' }
    ];

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden w-full">
            <Sidebar 
                activePage={activeTab}
                userName={userData.name}
                userInitials={userData.initials}
                userRole="Registered Midwife"
                navItems={midwifeNavItems}
                onNavigate={(id) => setActiveTab(id)}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={true}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-[240px] w-full">
                <header className="h-[60px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 p-2 -ml-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                        <div className="font-bold text-lg text-slate-800 capitalize">
                            {activeTab.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[0.7rem] font-extrabold uppercase tracking-wider text-green-700">Online</span>
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{userData.name}</div>
                            <div className="text-[0.7rem] text-slate-500 font-medium">Registered Midwife</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                            {userData.initials}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-x-hidden overflow-y-auto w-full bg-[#F8FAFC]">
                    {/* CHANGED: Removed .content class, added w-full and responsive padding */}
                    <div className="w-full max-w-full p-4 md:p-6 lg:p-8 mx-auto">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-32 text-slate-400 w-full">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-bold uppercase tracking-widest text-xs">Syncing FHSIS Registry...</p>
                            </div>
                        ) : (
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
                        )}
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