import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { Sidebar } from './sidebar';

// ─── Imported Pure Components ────────────────────────────────────────────────
import { RecordsComponent } from './records';
import { TemplatesComponent } from './templates';
import ReportGenerator from './midwife/reportGenerator'; // Imported OCR Report Component

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    age: number | null;
    sex: string;
    bloodType: string;
    contactNumber: string;
    address: string;
    created_at?: string;
}

const BhwDashboard = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('?');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [records, setRecords] = useState<any[]>([]); // State for FHSIS Census Logs
    const [searchQuery, setSearchQuery] = useState('');

    // ─── SPA Navigation State ───
    const [activePage, setActivePage] = useState('dashboard');

    const navItems = [
        { id: 'dashboard', label: 'Home', icon: '🏠' },
        { id: 'records', label: 'Records', icon: '📁' },
        { id: 'new-record', label: 'New Record', icon: '➕' },
        { id: 'reports', label: 'OCR Generation', icon: '📊' } // Added Reports Tab
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

            // 1. Fetch user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                const name = profile.full_name || 'BHW User';
                setUserName(name);
                setUserInitials(name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2));
            }

            // 2. Fetch ALL patients
            const { data: allPatients, error: statsError } = await supabase
                .from('patients')
                .select('id, firstName, lastName, age, sex, bloodType, contactNumber, address, created_at')
                .order('created_at', { ascending: false });

            if (!statsError && allPatients) {
                setPatients(allPatients as Patient[]);
            }

            // 3. Fetch FHSIS logs for the OCR Reports
            const { data: fhsisData, error: fhsisError } = await supabase
                .from('fhsis_logs')
                .select(`
                    id,
                    patient_id,
                    category,
                    data_fields,
                    report_month,
                    created_at,
                    patients (
                        firstName,
                        lastName,
                        address
                    )
                `)
                .order('created_at', { ascending: false });

            if (!fhsisError && fhsisData) {
                // Flatten the relationship for the ReportGenerator
                const formattedRecords = fhsisData.map(record => {
                    const patientData: any = Array.isArray(record.patients) ? record.patients[0] : record.patients;
                    return {
                        ...record,
                        patientName: patientData ? `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() : 'Unknown Patient',
                        address: patientData?.address || 'N/A'
                    };
                });
                setRecords(formattedRecords);
            }
        };

        fetchData();

        // Realtime subscription to auto-update reports when Midwife adds new Census Entry
        const channel = supabase
            .channel('bhw-fhsis-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fhsis_logs' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            supabase.removeChannel(channel);
        };
    }, []);

    const stats = {
        total: patients.length,
        male: patients.filter(p => p.sex === 'Male').length,
        female: patients.filter(p => p.sex === 'Female').length,
        withAddress: patients.filter(p => p.address && p.address.trim() !== '').length
    };

    const recentPatients = patients.slice(0, 5);

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden w-full">
            
            <Sidebar
                activePage={activePage}
                userName={userName}
                userInitials={userInitials}
                userRole="Barangay Health Worker"
                navItems={navItems}
                onNavigate={(id) => setActivePage(id)}
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
                            {activePage === 'dashboard' ? 'Dashboard'
                                : activePage === 'reports' ? 'OCR Reports'
                                : activePage.replace(/-/g, ' ')}
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
                            <div className="text-[0.7rem] text-slate-500 font-medium">Barangay Health Worker</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                            {userInitials}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-x-hidden overflow-y-auto w-full bg-[#F8FAFC]">
                    <div className="p-4 md:p-6 lg:p-8 mx-auto w-full max-w-7xl animate-in fade-in duration-500">
                        
                        {/* ─── DASHBOARD VIEW ─── */}
                        {activePage === 'dashboard' && (
                            <>
                                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl font-extrabold text-slate-800">Good day, {userName.split(' ')[0]}! 👋</h1>
                                        <p className="text-sm text-slate-500 mt-1">Here's your overview for today.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">👥</div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-500">Total Patients</div>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">♂</div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-500">Male</div>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.male}</div>
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
                                        <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-xl shrink-0">📍</div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-500">With Address</div>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.withAddress}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:col-span-2">
                                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                                            <div>
                                                <h2 className="text-lg font-bold text-slate-800">Recent Intakes</h2>
                                                <p className="text-xs text-slate-500">5 latest registered patients</p>
                                            </div>
                                            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">{recentPatients.length}</span>
                                        </div>
                                        <div className="p-2 flex-1">
                                            {recentPatients.length === 0 ? (
                                                <div className="p-8 text-center text-sm text-slate-500">No patients found.</div>
                                            ) : (
                                                recentPatients.map(p => (
                                                    <div key={p.id} onClick={() => window.location.href=`/pages/details.html?id=${p.id}`} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                            {(p.firstName?.[0] || '?').toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-slate-800 text-sm truncate">{p.firstName} {p.lastName}</div>
                                                            <div className="text-xs text-slate-500 mt-0.5">{p.sex || '—'} &bull; {p.bloodType || '—'}</div>
                                                        </div>
                                                        <div className="text-[0.65rem] text-slate-400 font-semibold shrink-0">
                                                            {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="p-4 border-t border-slate-100 text-center">
                                            <button onClick={() => setActivePage('records')} className="text-blue-600 font-bold text-sm hover:text-blue-700">View all patients →</button>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                                        <div className="p-5 border-b border-slate-100">
                                            <h2 className="text-lg font-bold text-slate-800">Quick Actions</h2>
                                        </div>
                                        <div className="p-5 grid grid-cols-2 gap-3">
                                            <button onClick={() => setActivePage('new-record')} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors border border-slate-100 text-sm font-semibold text-slate-700">
                                                <span className="text-xl mb-2">➕</span> Register
                                            </button>
                                            <button onClick={() => setActivePage('records')} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors border border-slate-100 text-sm font-semibold text-slate-700">
                                                <span className="text-xl mb-2">🔍</span> Search
                                            </button>
                                            <button onClick={() => setActivePage('reports')} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors border border-slate-100 text-sm font-semibold text-slate-700 col-span-2">
                                                <span className="text-xl mb-2">📊</span> Generate Reports
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ─── MODULAR COMPONENT TABS ─── */}
                        {activePage === 'records' && (
                            <div className="w-full bg-white rounded-2xl shadow-sm p-4 min-h-[500px]">
                                <RecordsComponent />
                            </div>
                        )}
                        
                        {activePage === 'new-record' && (
                            <div className="w-full bg-white rounded-2xl shadow-sm p-4 min-h-[500px]">
                                <TemplatesComponent />
                            </div>
                        )}

                        {activePage === 'reports' && (
                            <div className="w-full bg-[#F8FAFC] rounded-2xl min-h-[500px]">
                                {/* Pass the newly fetched FHSIS logs down to the generator */}
                                <ReportGenerator records={records} />
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<BhwDashboard />);
}