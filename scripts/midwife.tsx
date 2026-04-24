import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { Sidebar } from './sidebar';
import Dashboard from './midwife/dashboard';
import PatientRecords from './midwife/patientRecords';
import CensusEntry from './midwife/censusEntry';
import ReportGenerator from './midwife/reportGenerator';
import PatientConsent from './patient_consent';
import { useMidwifeData } from './midwife/useMidwifeData';

// ─── Detail Item ──────────────────────────────────────────────────────────────
function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
    const isEmpty = value === null || value === undefined || value === '';
    return (
        <div className="flex flex-col gap-1">
            <div className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">{label}</div>
            <div className={`text-sm font-semibold ${isEmpty ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                {isEmpty ? 'Not provided' : value}
            </div>
        </div>
    );
}

const sectionCls = "bg-white border border-slate-100 rounded-xl p-5 mb-4 shadow-sm";
const headerCls  = "flex items-center gap-2 text-xs font-extrabold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-2.5 mb-4";

// ─── Patient Details Panel ────────────────────────────────────────────────────
function PatientDetailsPanel({
    patient,
    consentSigned,
    onProceedToConsent,
}: {
    patient: any;
    consentSigned: boolean;
    onProceedToConsent: () => void;
}) {
    const displayCategory = () => {
        if (patient.category === 'Other/s') return `Others (${patient.categoryOthers || 'Unspecified'})`;
        return patient.category || 'N/A';
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Profile banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 mb-4 flex flex-wrap items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0 uppercase">
                    {patient.firstName?.[0]}{patient.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-lg leading-tight truncate">
                        {patient.firstName} {patient.middleName} {patient.lastName} {patient.suffix}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                        <span className="text-xs text-slate-500 font-medium">🩸 <span className="font-bold text-slate-700">{patient.bloodType || '—'}</span></span>
                        <span className="text-xs text-slate-500 font-medium">👤 <span className="font-bold text-slate-700">{patient.sex || '—'}</span></span>
                        <span className="text-xs text-slate-500 font-medium">🎂 <span className="font-bold text-slate-700">{patient.age ?? '—'}</span> yrs</span>
                        <span className="text-xs text-slate-500 font-medium">📍 <span className="font-bold text-slate-700">{patient.address || '—'}</span></span>
                    </div>
                </div>
                <div className="shrink-0">
                    {consentSigned ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[0.65rem] font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5">✓ Consent Signed</span>
                    ) : (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[0.65rem] font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5">⚠️ Pending Consent</span>
                    )}
                </div>
            </div>

            {/* Section I */}
            <div className={sectionCls}>
                <div className={headerCls}><span>👤</span> I. Patient's Information</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <DetailItem label="First Name"            value={patient.firstName} />
                    <DetailItem label="Middle Name"           value={patient.middleName} />
                    <DetailItem label="Last Name"             value={patient.lastName} />
                    <DetailItem label="Suffix"                value={patient.suffix} />
                    <DetailItem label="Age"                   value={patient.age} />
                    <DetailItem label="Sex"                   value={patient.sex} />
                    <DetailItem label="Birthday"              value={patient.birthday} />
                    <DetailItem label="Birth Place"           value={patient.birthPlace} />
                    <DetailItem label="Blood Type"            value={patient.bloodType} />
                    <DetailItem label="Nationality"           value={patient.nationality} />
                    <DetailItem label="Religion"              value={patient.religion} />
                    <DetailItem label="Civil Status"          value={patient.civilStatus} />
                    <DetailItem label="Contact Number"        value={patient.contactNumber} />
                    <DetailItem label="Address"               value={patient.address} />
                    <DetailItem label="Educational Attainment" value={patient.educationalAttain} />
                    <DetailItem label="Employment Status"     value={patient.employmentStatus} />
                </div>
            </div>

            {/* Section II */}
            <div className={sectionCls}>
                <div className={headerCls}><span>🏥</span> II. PhilHealth & Categorization</div>
                <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="PhilHealth No."    value={patient.philhealthNo} />
                    <DetailItem label="PhilHealth Status" value={patient.philhealthStatus} />
                    <DetailItem label="Category"          value={displayCategory()} />
                </div>
            </div>

            {/* Section III */}
            <div className={sectionCls}>
                <div className={headerCls}><span>🆘</span> III. Emergency Contact</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <DetailItem label="Relative's Name"    value={patient.relativeName} />
                    <DetailItem label="Relationship"       value={patient.relativeRelation} />
                    <DetailItem label="Relative's Address" value={patient.relativeAddress} />
                </div>
            </div>

            {!consentSigned && (
                <button
                    onClick={onProceedToConsent}
                    className="w-full bg-blue-600 text-white font-extrabold text-sm uppercase tracking-wider py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 mt-2"
                >
                    📋 Proceed to Patient Consent →
                </button>
            )}
        </div>
    );
}

// ─── Patient Modal ────────────────────────────────────────────────────────────
function PatientModal({
    patient,
    rhuPersonnel,
    onClose,
    onConsentSaved,
}: {
    patient: any;
    rhuPersonnel: string;
    onClose: () => void;
    onConsentSaved: () => void;
}) {
    const [step, setStep] = useState<'details' | 'consent'>('details');
    const [consentSigned, setConsentSigned] = useState(
        Array.isArray(patient.patient_consent)
            ? patient.patient_consent.length > 0
            : !!patient.consent_signed
    );

    const handleConsentSaved = () => {
        setConsentSigned(true);
        setStep('details');
        onConsentSaved();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-[#F8FAFC] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-4 duration-300">

                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-slate-200 bg-white rounded-t-2xl flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        {step === 'consent' && (
                            <button
                                onClick={() => setStep('details')}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-colors"
                            >
                                ←
                            </button>
                        )}
                        {/* Step pills */}
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                            <button
                                onClick={() => setStep('details')}
                                className={`px-2.5 py-1 rounded-md transition-colors ${step === 'details' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                1 · Details
                            </button>
                            <span className="text-slate-300">›</span>
                            <span className={`px-2.5 py-1 rounded-md ${step === 'consent' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                2 · Consent
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto flex-1 p-4 sm:p-6">
                    {step === 'details' ? (
                        <PatientDetailsPanel
                            patient={patient}
                            consentSigned={consentSigned}
                            onProceedToConsent={() => setStep('consent')}
                        />
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <PatientConsent
                                patientId={patient.id}
                                patientName={`${patient.firstName} ${patient.lastName}`}
                                rhuPersonnel={rhuPersonnel}
                                onConsentSaved={handleConsentSaved}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const MidwifeApp = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [userData, setUserData] = useState({ name: 'Loading...', initials: 'U' });

    // ── Shared modal state — lives here so Dashboard + PatientRecords both use it
    const [selectedPatient, setSelectedPatient] = useState<any>(null);

    const { patients, records, isLoading, refreshData } = useMidwifeData();

    const handleRealtimeChange = useCallback(async () => {
        await refreshData();
    }, [refreshData]);

    useEffect(() => {
        const handleOnline  = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online',  handleOnline);
        window.addEventListener('offline', handleOffline);

        const fetchProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { window.location.href = '/pages/login.html'; return; }

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

        const channel = supabase
            .channel('midwife-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' },       handleRealtimeChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_consent' }, handleRealtimeChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fhsis_logs' },     handleRealtimeChange)
            .subscribe();

        return () => {
            window.removeEventListener('online',  handleOnline);
            window.removeEventListener('offline', handleOffline);
            supabase.removeChannel(channel);
        };
    }, [handleRealtimeChange]);

    const midwifeNavItems = [
        { id: 'dashboard', label: 'Home',           icon: '🏠' },
        { id: 'records',   label: 'Patient Records', icon: '📁' },
        { id: 'census',    label: 'Census Entry',    icon: '📋' },
        { id: 'reports',   label: 'OCR Reports',     icon: '📊' },
    ];

    return (
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
                                : activeTab === 'records'  ? 'Patient Records'
                                : activeTab === 'census'   ? 'Census Entry'
                                : activeTab === 'reports'  ? 'OCR Generation'
                                : activeTab.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 border rounded-full ${isOnline ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                            {isOnline
                                ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                : <span className="w-2 h-2 rounded-full bg-amber-500" />}
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

                {/* Content */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F8FAFC]">
                    <div className="w-full h-full p-4 md:p-6 lg:p-8">
                        <div className="w-full">
                            {activeTab === 'dashboard' && (
                                <Dashboard
                                    patients={patients}
                                    censusRecords={records}
                                    rhuPersonnel={userData.name}
                                    onNavigateToRecords={() => setActiveTab('records')}
                                    onPatientClick={(p) => setSelectedPatient(p)}  // ← passes modal opener
                                />
                            )}
                            {activeTab === 'records' && (
                                <PatientRecords
                                    patients={patients}
                                    records={records}
                                    isLoading={isLoading}
                                    rhuPersonnel={userData.name}
                                    onPatientClick={(p) => setSelectedPatient(p)}  // ← passes modal opener
                                />
                            )}
                            {activeTab === 'census' && (
                                <CensusEntry
                                    patients={patients}
                                    records={records}
                                    onSaveSuccess={async () => { await refreshData(); }}
                                />
                            )}
                            {activeTab === 'reports' && (
                                <ReportGenerator records={records} />
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Shared Patient Modal — rendered at app level ── */}
            {selectedPatient && (
                <PatientModal
                    patient={selectedPatient}
                    rhuPersonnel={userData.name}
                    onClose={() => setSelectedPatient(null)}
                    onConsentSaved={async () => {
                        setSelectedPatient(null);
                        await refreshData();
                    }}
                />
            )}
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