import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient, Session } from '@supabase/supabase-js';
import { Sidebar } from './sidebar';
import { useNetworkSync } from '../shared/useNetworkSync';
import { OfflineBanner } from './OfflineBanner';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Patient {
    id: string; 
    firstName: string; middleName: string; lastName: string; suffix: string;
    age: number | null; sex: string; bloodType: string;
}

// ─── Role Label Helper ────────────────────────────────────────────────────────
function getRoleLabel(role: string): string {
    const map: Record<string, string> = {
        doctor:     'General Practitioner',
        nurse:      'Registered Nurse',
        BHW:        'Barangay Health Worker',
        midwives:   'Midwife',
        pharmacist: 'Pharmacist',
        labaratory: 'Medical Technologist',
        admin:      'Administrator',
    };
    return map[role] || role;
}

// ─── Main Component ───────────────────────────────────────────────────────────
function Records() {
    const [session, setSession] = useState<Session | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('U');
    const [userRole, setUserRole] = useState('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const { isOnline, isSyncing } = useNetworkSync();

    // ─── Auth & Profile ───────────────────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) {
                window.location.href = '/pages/login.html';
                return;
            }

            setSession(session);

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, role')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                const name = profile.full_name || 'User';
                const role = profile.role || '';
                setUserName(name);
                setUserRole(role);
                const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                setUserInitials(initials);
            }
        });
    }, []);

    // ─── Fetch Patients ───────────────────────────────────────────────────────
    const fetchPatients = useCallback(async (filterText = '') => {
        setLoading(true);
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('lastName', { ascending: true });
            
        if (error) { 
            console.error('Database Error:', error); 
            setLoading(false);
            return; 
        }

        const lower = filterText.toLowerCase();
        setPatients((data as Patient[]).filter(p =>
            `${p.firstName} ${p.middleName} ${p.lastName}`.toLowerCase().includes(lower)
        ));
        setLoading(false);
    }, []);

    useEffect(() => { 
        if (session) fetchPatients(); 
    }, [session, fetchPatients]);

    if (!session) return null;

    return (
        <div className="flex w-full min-h-screen bg-[#F8FAFC] text-slate-800 overflow-x-hidden">
            
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <Sidebar 
                activePage="records"
                doctorName={userName} 
                doctorInitials={userInitials}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            <div className="flex-1 flex flex-col min-h-screen w-full md:pl-[240px] print:pl-0">
                
                <header className="h-[64px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 print:hidden shadow-sm md:shadow-none">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)} 
                            className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="font-bold text-lg text-slate-800">All Patient Records</div>
                    </div>
                    
                    <div className="flex items-center gap-4 md:gap-5">
                        {/* Dynamic System Status Pill */}
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors duration-300 ${
                            !isOnline 
                                ? 'bg-amber-50 border-amber-200' 
                                : isSyncing 
                                    ? 'bg-blue-50 border-blue-200' 
                                    : 'bg-green-50 border-green-200'
                        }`}>
                            <span className="relative flex h-2.5 w-2.5">
                                {isOnline && !isSyncing && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                )}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                    !isOnline ? 'bg-amber-500' : isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                                }`}></span>
                            </span>
                            <span className={`text-[0.65rem] font-extrabold uppercase tracking-widest ${
                                !isOnline ? 'text-amber-700' : isSyncing ? 'text-blue-700' : 'text-green-700'
                            }`}>
                                {!isOnline ? 'Offline Mode' : isSyncing ? 'Syncing...' : 'System Online'}
                            </span>
                        </div>

                        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                        {/* Dynamic User Info */}
                        <div className="text-right hidden sm:block ml-2">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{userName}</div>
                            <div className="text-[0.7rem] text-slate-500">{getRoleLabel(userRole)}</div>
                        </div>
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md cursor-pointer">
                            {userInitials}
                        </div>
                    </div>
                </header>

                <OfflineBanner isOnline={isOnline} />

                <main className="w-full flex-1 p-4 md:p-8 flex justify-center">
                    <div className="page-container">
                        <div className="list-card">
                            <div className="list-header">
                                <div className="list-header-title">Patient Records</div>
                                <span className="list-count" id="listCount">{patients.length}</span>
                            </div>
                            
                            <div className="search-wrap">
                                <input
                                    type="text"
                                    placeholder="Search by name..."
                                    value={search}
                                    onChange={e => { 
                                        setSearch(e.target.value); 
                                        fetchPatients(e.target.value); 
                                    }}
                                />
                            </div>
                            
                            <div className="patient-list">
                                {loading ? (
                                    <div className="empty-list">Loading records...</div>
                                ) : patients.length === 0 ? (
                                    <div className="empty-list">No patients found.</div>
                                ) : (
                                    patients.map(p => (
                                        <div 
                                            key={p.id} 
                                            className="patient-row" 
                                            onClick={() => window.location.href = `/pages/details.html?id=${p.id}`}
                                        >
                                            <div className="patient-av">{(p.firstName?.[0] || '?').toUpperCase()}</div>
                                            <div className="patient-info">
                                                <div className="patient-name">{p.lastName}, {p.firstName} {p.middleName || ''} {p.suffix || ''}</div>
                                                <div className="patient-meta">{p.sex || '—'} &middot; {p.age ?? '—'} yrs &middot; {p.bloodType || '—'}</div>
                                            </div>
                                            <span className="patient-arrow">&rarr;</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><Records /></React.StrictMode>
);