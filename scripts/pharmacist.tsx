import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { requireRole } from '../shared/auth';
import { Sidebar } from './sidebar';

// --- Interfaces ---
interface Patient {
    id: string;
    firstName: string;
    middleName: string;
    lastName: string;
    age: number | null;
    sex: string;
}

interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: string;
}

interface Prescription {
    prescription_id: number;
    consultation_id: number | null;
    patient_id: number;
    prescription_date: string;
    rx_content: string;
    doctor_name: string | null;
    license_no: number | null;
    ptr_no: string | null;
    status: string;
    dispensed_at: string | null;
    signature_url: string | null;
    patients: Patient;
}

function PharmacyDashboard() {
    const [profile, setProfile] = useState<any>(null);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
    const [isDispensing, setIsDispensing] = useState(false);

    // Sidebar & Layout State
    const [activePage, setActivePage] = useState('queue');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const pharmacistNavItems = [
        { id: 'queue', label: 'Pending Queue', icon: '💊' }
    ];

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Authenticate and load profile
        requireRole('pharmacist').then(p => setProfile(p));
        loadPrescriptions();

        // Real-time Subscription
        const channel = supabase
            .channel('pharmacist-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prescription' }, () => loadPrescriptions())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'prescription' }, () => loadPrescriptions())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const loadPrescriptions = async () => {
        const { data, error } = await supabase
            .from('prescription')
            .select(`*, patients (id, firstName, middleName, lastName, age, sex)`)
            .eq('status', 'Pending')
            .order('prescription_id', { ascending: false });

        if (!error && data) {
            setPrescriptions(data as unknown as Prescription[]);
        }
    };

    const handleDispense = async () => {
        if (!selectedRx) return;
        setIsDispensing(true);

        const { error } = await supabase
            .from('prescription')
            .update({
                status: 'Dispensed',
                dispensed_at: new Date().toISOString()
            })
            .eq('prescription_id', selectedRx.prescription_id);

        setIsDispensing(false);
        if (!error) {
            setSelectedRx(null);
            setPrescriptions(prev => prev.filter(p => p.prescription_id !== selectedRx.prescription_id));
        } else {
            alert('Error dispensing: ' + error.message);
        }
    };

    const filteredRx = prescriptions.filter(rx => {
        const pt = rx.patients;
        if (!pt) return false;
        const fullName = `${pt.firstName} ${pt.middleName} ${pt.lastName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
    });

    const initials = profile?.fullName 
        ? profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) 
        : 'P';

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden w-full">
            
            <Sidebar 
                activePage={activePage}
                userName={profile?.fullName || 'Loading...'}
                userInitials={initials}
                userRole="Pharmacist"
                navItems={pharmacistNavItems}
                onNavigate={(id) => setActivePage(id)}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            {/* FIXED: Added md:ml-[240px] to push content perfectly to the right of the sidebar */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-[240px] w-full">
                
                {/* FIXED: Header exactly matches Midwife height and responsive structure */}
                <header className="h-[60px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 p-2 -ml-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                        <div className="font-bold text-lg text-slate-800 capitalize">Pharmacy Dashboard</div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 ${isOnline ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-full`}>
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            <span className={`text-[0.7rem] font-extrabold uppercase tracking-wider ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{profile?.fullName || 'Loading...'}</div>
                            <div className="text-[0.7rem] text-slate-500 font-medium">Pharmacist</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md cursor-pointer">
                            {initials}
                        </div>
                    </div>
                </header>

                {/* FIXED: Dedicated scrolling container matching Midwife layout */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto w-full bg-[#F8FAFC]">
                    {/* FIXED: Removed max-w-6xl to maximize screen utilization and fix white spaces */}
                    <div className="w-full max-w-full p-4 md:p-6 lg:p-8 mx-auto flex flex-col gap-6">
                        {activePage === 'queue' && (
                            <>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Prescription Queue 💊</h1>
                                        <p className="text-sm text-slate-500 mt-1">Review e-prescriptions sent by doctors and dispense medications.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">⏳</div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Awaiting Dispense</div>
                                                <div className="text-2xl font-black text-slate-900 leading-tight">{prescriptions.length}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-sm w-full">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                        <div>
                                            <h3 className="font-bold text-slate-900">Pending Prescriptions</h3>
                                            <p className="text-xs text-slate-500">Click to review medication details.</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-auto">
                                            <span>🔍</span>
                                            <input 
                                                type="text" 
                                                placeholder="Search patient..." 
                                                className="bg-transparent border-none outline-none text-sm text-slate-700 w-full"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {filteredRx.length === 0 ? (
                                            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                                                No pending prescriptions found.
                                            </div>
                                        ) : (
                                            filteredRx.map(rx => (
                                                <div key={rx.prescription_id} onClick={() => setSelectedRx(rx)} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-white gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                                                            {rx.patients?.firstName?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900">{rx.patients?.lastName}, {rx.patients?.firstName}</h4>
                                                            <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                                <span className="flex items-center gap-1">👤 {rx.patients?.sex}</span>
                                                                <span className="flex items-center gap-1">👨‍⚕️ {rx.doctor_name || 'Unknown Doctor'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                                        <span className="text-xs font-medium text-slate-500">{new Date(rx.prescription_date).toLocaleDateString('en-PH')}</span>
                                                        <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[0.65rem] font-bold uppercase tracking-wide">⏳ Pending</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal */}
            {selectedRx && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-5 md:p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">E-Prescription Details</h2>
                                <p className="text-sm text-slate-500 mt-1">Patient: <span className="font-semibold text-slate-700">{selectedRx.patients?.firstName} {selectedRx.patients?.lastName}</span></p>
                            </div>
                            <button onClick={() => setSelectedRx(null)} className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center transition-colors">✕</button>
                        </div>
                        
                        <div className="p-5 md:p-6 overflow-y-auto">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Prescribed Medications</h3>
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <tr>
                                                <th className="p-4 font-semibold">Medication</th>
                                                <th className="p-4 font-semibold">Dosage</th>
                                                <th className="p-4 font-semibold">Frequency</th>
                                                <th className="p-4 font-semibold">Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {JSON.parse(selectedRx.rx_content || '[]').map((med: Medication, i: number) => (
                                                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                                    <td className="p-4 font-bold text-blue-600">{med.name}</td>
                                                    <td className="p-4 text-slate-700">{med.dosage}</td>
                                                    <td className="p-4 text-slate-700">{med.frequency}</td>
                                                    <td className="p-4 font-black text-slate-900">{med.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setSelectedRx(null)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors">Cancel</button>
                            <button 
                                onClick={handleDispense} 
                                disabled={isDispensing}
                                className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {isDispensing ? 'Dispensing...' : '✅ Mark as Dispensed'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<PharmacyDashboard />);
}