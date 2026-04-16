import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { Sidebar } from './sidebar';
import { useNetworkSync } from '../shared/useNetworkSync';
import { OfflineBanner } from './OfflineBanner';
import PatientConsent from './patient_consent';

interface Patient {
    id: string; firstName: string; middleName: string; lastName: string;
    age: number | null; sex: string; birthday: string; birthPlace: string;
    bloodType: string; nationality: string; religion: string; civilStatus: string;
    address: string; contactNumber: string; educationalAttain: string; employmentStatus: string;
    philhealthNo: string; philhealthStatus: string; category: string; categoryOthers: string;
    relativeName: string; relativeRelation: string; relativeAddress: string;
    consent_signed: boolean;
}

function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
    const isEmpty = value === null || value === undefined || value === '';
    return (
        <div className="flex flex-col gap-1">
            <div className="text-[0.68rem] font-bold uppercase tracking-widest text-slate-400">{label}</div>
            <div className={`text-sm font-semibold ${isEmpty ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                {isEmpty ? 'Not provided' : value}
            </div>
        </div>
    );
}

function DetailsPage() {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showConsent, setShowConsent] = useState(false);
    
    // System Integration States
    const [role, setRole] = useState<string | null>(null);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isOnline } = useNetworkSync();

    const patientId = new URLSearchParams(window.location.search).get('id');

    useEffect(() => {
        // Fetch current user for Sidebar integration
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                const { data } = await supabase.from('profiles').select('role, full_name').eq('id', session.user.id).single();
                if (data) {
                    setRole(data.role);
                    setUserName(data.full_name);
                    setUserInitials(data.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2));
                }
            }
        });

        // Fetch Patient Data
        if (!patientId) { setError('No patient ID provided in URL.'); return; }
        loadPatient();
    }, []);

    async function loadPatient() {
        const { data, error } = await supabase.from('patients').select('*').eq('id', patientId).single();
        if (error || !data) { setError('Patient not found.'); return; }
        setPatient(data as Patient);
    }

    if (!role) return null;

    // Dynamically set Sidebar navigation based on who is viewing the profile
    let navItems: any[] = [];
    if (role === 'doctor') navItems = [ { id: 'dashboard', label: 'Dashboard', icon: '🏠' }, { id: 'records', label: 'Patient Records', icon: '📁' }, { id: 'consultation', label: 'Consultation', icon: '📋' } ];
    else if (role === 'nurse') navItems = [ { id: 'dashboard', label: 'Dashboard', icon: '🏠' }, { id: 'new-record', label: 'New Record', icon: '➕' }, { id: 'consultation', label: 'Consultation', icon: '📋' } ];
    else if (role === 'midwife') navItems = [ { id: 'dashboard', label: 'Dashboard', icon: '🏠' }, { id: 'records', label: 'Patient Census', icon: '📁' }, { id: 'reports', label: 'Generate Reports', icon: '📊' } ];

    const handleNavigate = (id: string) => {
        if (id === 'dashboard') window.location.href = `/pages/${role}.html`;
        else if (id === 'records') window.location.href = '/pages/records.html';
        else if (id === 'new-record') window.location.href = '/pages/templates.html';
        else if (id === 'consultation') window.location.href = role === 'doctor' ? '/pages/consultation.html' : '/pages/initial_consultation.html';
        else if (id === 'reports') window.location.href = '/pages/midwife.html'; // Adjust as needed
    };

    const sectionCls = "bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm mb-6";
    const headerCls = "flex items-center gap-3 text-sm font-extrabold text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-3 mb-5";

    return (
        <div className="flex w-full min-h-screen bg-[#F8FAFC] text-slate-800 overflow-x-hidden">
            {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

            <Sidebar 
                activePage="records" userName={userName} userInitials={userInitials} userRole={role.toUpperCase()}
                navItems={navItems} onNavigate={handleNavigate}
                isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} isOnline={isOnline} 
            />

            <div className="flex-1 flex flex-col min-h-screen w-full md:pl-[240px]">
                
                {/* System Topbar */}
                <header className="h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                        <div className="font-bold text-lg text-slate-800">Patient Profile</div>
                    </div>
                    <button onClick={() => window.history.back()} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">← Back</button>
                </header>

                <OfflineBanner isOnline={isOnline} />

                <main className="w-full flex-1 p-4 md:p-8 flex justify-center">
                    <div className="w-full max-w-4xl">
                        
                        {error ? (
                            <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 font-semibold text-center">⚠️ {error}</div>
                        ) : !patient ? (
                            <div className="text-center py-10 text-slate-400 font-bold animate-pulse">Loading Patient Data...</div>
                        ) : showConsent ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <button onClick={() => setShowConsent(false)} className="mb-4 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-colors">← Back to Details</button>
                                <PatientConsent 
                                    patientId={patient.id} 
                                    patientName={`${patient.firstName} ${patient.lastName}`} 
                                    onConsentSaved={() => { setShowConsent(false); loadPatient(); }} 
                                />
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                
                                {/* Patient Hero Card */}
                                <div className="w-full bg-white border border-slate-200 rounded-xl p-6 mb-6 flex flex-wrap items-center gap-5 shadow-sm">
                                    <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                                        {patient.firstName?.[0]}{patient.lastName?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-slate-900 text-xl leading-tight truncate">{patient.firstName} {patient.middleName} {patient.lastName}</div>
                                        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2">
                                            <span className="text-sm text-slate-500 font-medium">🩸 <span className="font-bold text-slate-700">{patient.bloodType || 'Unknown'}</span></span>
                                            <span className="text-sm text-slate-500 font-medium">👤 <span className="font-bold text-slate-700">{patient.sex || '—'}</span></span>
                                            <span className="text-sm text-slate-500 font-medium">🎂 <span className="font-bold text-slate-700">{patient.age ?? '—'}</span> yrs</span>
                                            <span className="text-sm text-slate-500 font-medium truncate max-w-xs">📍 <span className="font-bold text-slate-700">{patient.address || '—'}</span></span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex flex-col gap-2">
                                        {patient.consent_signed ? (
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-2"><span>✓</span> Consent Signed</span>
                                        ) : (
                                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-2"><span>⚠️</span> Pending Consent</span>
                                        )}
                                    </div>
                                </div>

                                {/* Section I */}
                                <div className={sectionCls}>
                                    <div className={headerCls}><span>👤</span> I. Patient's Information Record</div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                        <DetailItem label="First Name" value={patient.firstName} />
                                        <DetailItem label="Middle Name" value={patient.middleName} />
                                        <DetailItem label="Last Name" value={patient.lastName} />
                                        <DetailItem label="Age" value={patient.age} />
                                        <DetailItem label="Sex" value={patient.sex} />
                                        <DetailItem label="Birthday" value={patient.birthday} />
                                        <DetailItem label="Birth Place" value={patient.birthPlace} />
                                        <DetailItem label="Blood Type" value={patient.bloodType} />
                                        <DetailItem label="Nationality" value={patient.nationality} />
                                        <DetailItem label="Religion" value={patient.religion} />
                                        <DetailItem label="Contact Number" value={patient.contactNumber} />
                                        <DetailItem label="Address" value={patient.address} />
                                        <DetailItem label="Educational Attainment" value={patient.educationalAttain} />
                                        <DetailItem label="Employment Status" value={patient.employmentStatus} />
                                    </div>
                                </div>

                                {/* Section II */}
                                <div className={sectionCls}>
                                    <div className={headerCls}><span>🏥</span> II. PhilHealth & Categorization</div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <DetailItem label="PhilHealth No." value={patient.philhealthNo} />
                                        <DetailItem label="PhilHealth Status" value={patient.philhealthStatus} />
                                        <DetailItem label="Category" value={patient.category === 'Other/s' ? `Others (${patient.categoryOthers})` : patient.category} />
                                    </div>
                                </div>

                                {/* Section III */}
                                <div className={sectionCls}>
                                    <div className={headerCls}><span>🆘</span> III. Emergency Contact</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <DetailItem label="Relative's Name" value={patient.relativeName} />
                                        <DetailItem label="Relationship" value={patient.relativeRelation} />
                                        <DetailItem label="Relative's Address" value={patient.relativeAddress} />
                                    </div>
                                </div>

                                {/* Consent Trigger Button */}
                                <button 
                                    onClick={() => setShowConsent(true)}
                                    className="w-full bg-blue-600 text-white font-extrabold text-sm uppercase tracking-wider py-4 rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    📋 Proceed to Patient Consent →
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><DetailsPage /></React.StrictMode>);