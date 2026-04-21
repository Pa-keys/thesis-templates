import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { Sidebar } from './sidebar';

interface Patient {
    id: string;
    firstName: string;
    middleName: string;
    lastName: string;
    age: number | null;
    sex: string;
    bloodType: string;
    address: string;
    philhealthStatus: string;
    category: string;
    categoryOthers: string;
    createdAt: string;
}

const NurseDashboard = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('N');
    const [consentedPatients, setConsentedPatients] = useState<Patient[]>([]);
    const [totalPatientsCount, setTotalPatientsCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    // State to manage which page is currently active
    const [activePage, setActivePage] = useState('dashboard');

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
        { id: 'records', label: 'Patient Records', icon: '📁' },
        { id: 'new-record', label: 'New Record', icon: '➕' },
        { id: 'consultation', label: 'Initial Consultation', icon: '📝' }
    ];

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const fetchData = async () => {
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
                const name = profile.full_name || 'Nurse User';
                setUserName(name);
                setUserInitials(name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2));
            }

            loadPatients();
        };

        const loadPatients = async () => {
            const { count: totalCount } = await supabase
                .from('patients')
                .select('id', { count: 'exact', head: true });
           
            setTotalPatientsCount(totalCount || 0);

            const { data: consents, error: consentError } = await supabase
                .from('patients')
                .select('id')
                .not('consent_signature', 'is', null)
                .neq('consent_signature', '');

            if (consentError || !consents || consents.length === 0) {
                setConsentedPatients([]);
                return;
            }

            const signedIds = consents.map((c: any) => c.id);

            const { data, error } = await supabase
                .from('patients')
                .select('id, firstName, middleName, lastName, age, sex, bloodType, address, philhealthStatus, category, categoryOthers, createdAt:created_at')
                .in('id', signedIds)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setConsentedPatients(data as Patient[]);
            }
        };

        fetchData();

        const channel = supabase
            .channel('nurse-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, loadPatients)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patients' }, loadPatients)
            .subscribe();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            supabase.removeChannel(channel);
        };
    }, []);

    const stats = {
        total: totalPatientsCount,
        consented: consentedPatients.length,
        male: consentedPatients.filter(p => p.sex === 'Male').length,
        female: consentedPatients.filter(p => p.sex === 'Female').length,
    };

    const filteredPatients = consentedPatients.filter(p =>
        `${p.firstName} ${p.middleName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden w-full">
           
            <Sidebar
                activePage={activePage} 
                userName={userName}
                userInitials={userInitials}
                userRole="Registered Nurse"
                navItems={navItems}
                onNavigate={(id) => {
                    // INTEGRATED: Restored the navigation logic from nurse2.tsx
                    if (id === 'dashboard') {
                        setActivePage('dashboard');
                    } else if (id === 'records') {
                        window.location.href = '/pages/records.html';
                    } else if (id === 'new-record') {
                        window.location.href = '/pages/templates.html';
                    } else if (id === 'consultation') {
                        window.location.href = '/pages/initial_consultation.html';
                    }
                }}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-[240px] w-full">
               
                <header className="h-[60px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 p-2 -ml-2 rounded-lg hover:bg-slate-50">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                        <div className="font-bold text-lg text-slate-800 capitalize">
                            Nurse Dashboard
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 border rounded-full ${isOnline ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                            {isOnline && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                            {!isOnline && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                            <span className={`text-[0.7rem] font-extrabold uppercase tracking-wider ${isOnline ? 'text-green-700' : 'text-amber-700'}`}>
                                {isOnline ? 'System Online' : 'System Offline'}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{userName}</div>
                            <div className="text-[0.7rem] text-slate-500 font-medium">Registered Nurse</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                            {userInitials}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-x-hidden overflow-y-auto w-full bg-[#F8FAFC]">
                    <div className="p-4 md:p-6 lg:p-8 mx-auto w-full max-w-7xl flex flex-col gap-6">
                       
                        {activePage === 'dashboard' && (
                            <>
                                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl font-extrabold text-slate-800">Good day! 💉</h1>
                                        <p className="text-sm text-slate-500 mt-1">Patients below have signed their consent and are ready for vitals and consultation.</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                                        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
                                        <span className="text-xs font-bold text-slate-700">Live • Auto-updates</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-green-50 p-5 rounded-2xl border border-green-200 shadow-sm flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-white text-green-600 flex items-center justify-center text-xl shrink-0">✅</div>
                                        <div>
                                            <div className="text-sm font-semibold text-green-700">Consented Patients</div>
                                            <div className="text-2xl font-bold text-green-800 mt-1">{stats.consented}</div>
                                            <div className="text-xs font-bold text-green-600 mt-1">Ready for vitals</div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">👥</div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-500">Total Patients</div>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center text-xl shrink-0">♀</div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-500">Female</div>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.female}</div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">♂</div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-500">Male</div>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.male}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
                                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-800">Consented Patients</h2>
                                            <p className="text-xs text-slate-500">These patients have signed their consent and are ready for nurse assessment.</p>
                                        </div>
                                        <span className="bg-green-50 text-green-600 border border-green-200 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
                                            ✅ {stats.consented} patients
                                        </span>
                                    </div>
                                   
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                        <div className="relative max-w-md">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                                            <input
                                                type="text"
                                                placeholder="Search by name..."
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm bg-white"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        {filteredPatients.length === 0 ? (
                                            <div className="text-center py-16">
                                                <div className="text-4xl mb-3">⏳</div>
                                                <p className="text-slate-500 font-medium">No consented patients found.</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                {filteredPatients.map(p => {
                                                    const isMale = p.sex === 'Male';
                                                    const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                                                    const category = p.category === 'Other/s' ? `Others (${p.categoryOthers || 'unspecified'})` : (p.category || '—');

                                                    return (
                                                        <div key={p.id} onClick={() => window.location.href=`/pages/initial_consultation.html?id=${p.id}`} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-teal-500 hover:shadow-md cursor-pointer transition-all">
                                                            <div className={`w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm ${isMale ? 'bg-blue-600' : 'bg-pink-500'}`}>
                                                                {(p.firstName?.[0] || '?').toUpperCase()}
                                                            </div>
                                                           
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-slate-800 text-base">{p.lastName}, {p.firstName} {p.middleName || ''}</div>
                                                                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                                                    <span className="flex items-center gap-1">👤 {p.sex || '—'}</span>
                                                                    <span className="flex items-center gap-1">🎂 {p.age ?? '—'} yrs</span>
                                                                    <span className="flex items-center gap-1">🩸 {p.bloodType || '—'}</span>
                                                                    <span className="flex items-center gap-1">🏥 {p.philhealthStatus || '—'}</span>
                                                                    <span className="flex items-center gap-1">📋 {category}</span>
                                                                </div>
                                                                <div className="text-xs text-slate-500 mt-1">
                                                                    <span className="flex items-center gap-1">📍 {p.address || 'No address'}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                                                                <div className="text-xs text-slate-400 font-medium text-right hidden sm:block">Registered<br/>{date}</div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-full text-[0.65rem] font-bold">✅ Consent Signed</span>
                                                                    <button className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">📋 Consult</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<NurseDashboard />);
}