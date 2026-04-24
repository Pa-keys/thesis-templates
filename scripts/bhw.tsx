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
    middleName?: string;
    lastName: string;
    age: number | null;
    sex: string;
    bloodType: string;
    address: string;
    philhealthStatus?: string;
    category?: string;
    categoryOthers?: string;
    createdAt?: string;
    contactNumber?: string;
    birthday?: string;
    civilStatus?: string;
    nationality?: string;
    religion?: string;
    educationalAttain?: string;
    employmentStatus?: string;
    philhealthNo?: string;
    relativeName?: string;
    relativeRelation?: string;
    relativeAddress?: string;
    created_at?: string;
}

interface InitialConsultation {
    initialconsultation_id: number;
    patient_id: number;
    consultation_date: string | null;
    consultation_time: string | null;
    mode_of_transaction: string | null;
    referred_by: string | null;
    mode_of_transfer: string | null;
    chief_complaint: string | null;
    diagnosis: string | null;
}

interface Consultation {
    consultation_id: number;
    patient_id: number;
    chief_complaints: string | null;
    diagnosis: string | null;
    family_history: string | null;
    smoking_status: string | null;
    drinking_status: string | null;
    immunization_history: string | null;
    medication_treatment: string | null;
    past_med_surge_history: string | null;
}

function PatientDetailModal({
    patient,
    onClose,
}: {
    patient: Patient;
    onClose: () => void;
}) {
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [initialConsults, setInitialConsults] = useState<InitialConsultation[]>([]);
    const [consultations, setConsultations] = useState<Consultation[]>([]);

    const loadHistory = async () => {
        setShowHistory(true);
        setHistoryLoading(true);
        try {
            const [{ data: icData }, { data: cData }] = await Promise.all([
                supabase
                    .from('initial_consultation')
                    .select('*')
                    .eq('patient_id', patient.id)
                    .order('consultation_date', { ascending: false }),
                supabase
                    .from('consultation')
                    .select('*')
                    .eq('patient_id', patient.id)
                    .order('consultation_id', { ascending: false }),
            ]);
            setInitialConsults(icData || []);
            setConsultations(cData || []);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => {
        const isEmpty = value === null || value === undefined || value === '';
        return (
            <div className="flex flex-col gap-1">
                <div className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">{label}</div>
                <div className={`text-sm font-semibold ${isEmpty ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                    {isEmpty ? 'Not provided' : value}
                </div>
            </div>
        );
    };

    const formatDate = (str?: string | null) => {
        if (!str) return '—';
        const d = new Date(str);
        return isNaN(d.getTime()) ? str : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const displayCategory = () => {
        if (patient.category === 'Other/s') return `Others (${patient.categoryOthers || 'Unspecified'})`;
        return patient.category || 'N/A';
    };

    const sectionCls = "mb-5";
    const headerCls = "flex items-center gap-2 text-xs font-extrabold text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2 mb-4";

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]" onClick={onClose} />

            {/* Modal Panel */}
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-base shadow-sm ${patient.sex === 'Male' ? 'bg-blue-600' : 'bg-pink-500'}`}>
                                {(patient.firstName?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                                <div className="font-extrabold text-slate-900 leading-tight">
                                    {patient.lastName}, {patient.firstName} {patient.middleName || ''}
                                </div>
                                <div className="text-xs text-slate-500 font-medium mt-0.5">
                                    {patient.sex || '—'} · {patient.age ?? '—'} yrs · {patient.bloodType || '—'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors font-bold text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">

                        {!showHistory ? (
                            <>
                                {/* Patient Info */}
                                <div className={sectionCls}>
                                    <div className={headerCls}><span>👤</span> Personal Information</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <DetailItem label="First Name" value={patient.firstName} />
                                        <DetailItem label="Middle Name" value={patient.middleName} />
                                        <DetailItem label="Last Name" value={patient.lastName} />
                                        <DetailItem label="Age" value={patient.age} />
                                        <DetailItem label="Sex" value={patient.sex} />
                                        <DetailItem label="Birthday" value={patient.birthday} />
                                        <DetailItem label="Blood Type" value={patient.bloodType} />
                                        <DetailItem label="Civil Status" value={patient.civilStatus} />
                                        <DetailItem label="Nationality" value={patient.nationality} />
                                        <DetailItem label="Religion" value={patient.religion} />
                                        <DetailItem label="Contact Number" value={patient.contactNumber} />
                                        <DetailItem label="Educational Attainment" value={patient.educationalAttain} />
                                        <DetailItem label="Employment Status" value={patient.employmentStatus} />
                                        <div className="col-span-2 sm:col-span-3">
                                            <DetailItem label="Address" value={patient.address} />
                                        </div>
                                    </div>
                                </div>

                                <div className={sectionCls}>
                                    <div className={headerCls}><span>🏥</span> PhilHealth & Categorization</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <DetailItem label="PhilHealth No." value={patient.philhealthNo} />
                                        <DetailItem label="PhilHealth Status" value={patient.philhealthStatus} />
                                        <DetailItem label="Category" value={displayCategory()} />
                                    </div>
                                </div>

                                <div className={sectionCls}>
                                    <div className={headerCls}><span>🆘</span> Emergency Contact</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <DetailItem label="Relative's Name" value={patient.relativeName} />
                                        <DetailItem label="Relationship" value={patient.relativeRelation} />
                                        <DetailItem label="Relative's Address" value={patient.relativeAddress} />
                                    </div>
                                </div>

                                {/* View History Button */}
                                <button
                                    onClick={loadHistory}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm uppercase tracking-wider py-3.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                                >
                                    📋 View Consultation History
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Back to Details */}
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    ← Back to Details
                                </button>

                                {historyLoading ? (
                                    <div className="py-12 flex flex-col items-center text-slate-400">
                                        <svg className="animate-spin w-7 h-7 text-teal-500 mb-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        <span className="text-sm font-bold">Loading history...</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Initial Consultations */}
                                        <div className="mb-6">
                                            <div className={headerCls}><span>📝</span> Initial Consultations ({initialConsults.length})</div>
                                            {initialConsults.length === 0 ? (
                                                <p className="text-sm text-slate-400 italic text-center py-4">No initial consultation records found.</p>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    {initialConsults.map((ic) => (
                                                        <div key={ic.initialconsultation_id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-teal-300 transition-colors">
                                                            <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100 gap-2">
                                                                <div>
                                                                    <div className="font-extrabold text-teal-700 text-sm">📅 {formatDate(ic.consultation_date)}</div>
                                                                    <div className="text-xs text-slate-500 mt-0.5">⌚ {ic.consultation_time || 'Time unspecified'}</div>
                                                                </div>
                                                                {ic.mode_of_transaction && (
                                                                    <span className="bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider shrink-0">
                                                                        {ic.mode_of_transaction}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="sm:col-span-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Chief Complaint</div>
                                                                    <div className="text-sm font-semibold text-slate-800">{ic.chief_complaint || 'None recorded'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Diagnosis</div>
                                                                    <div className="text-sm text-slate-800">{ic.diagnosis || '—'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Referred By</div>
                                                                    <div className="text-sm text-slate-800">{ic.referred_by || '—'}</div>
                                                                </div>
                                                                {ic.mode_of_transfer && (
                                                                    <div>
                                                                        <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Mode of Transfer</div>
                                                                        <div className="text-sm text-slate-800">{ic.mode_of_transfer}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Full Consultations */}
                                        <div>
                                            <div className={headerCls}><span>🩺</span> Doctor Consultations ({consultations.length})</div>
                                            {consultations.length === 0 ? (
                                                <p className="text-sm text-slate-400 italic text-center py-4">No doctor consultation records found.</p>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    {consultations.map((c) => (
                                                        <div key={c.consultation_id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-300 transition-colors">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="sm:col-span-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Chief Complaints</div>
                                                                    <div className="text-sm font-semibold text-slate-800">{c.chief_complaints || 'None recorded'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Diagnosis</div>
                                                                    <div className="text-sm text-slate-800">{c.diagnosis || '—'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Medication / Treatment</div>
                                                                    <div className="text-sm text-slate-800">{c.medication_treatment || '—'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Family History</div>
                                                                    <div className="text-sm text-slate-800">{c.family_history || '—'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Immunization History</div>
                                                                    <div className="text-sm text-slate-800">{c.immunization_history || '—'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Smoking Status</div>
                                                                    <div className="text-sm text-slate-800">{c.smoking_status || '—'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Drinking Status</div>
                                                                    <div className="text-sm text-slate-800">{c.drinking_status || '—'}</div>
                                                                </div>
                                                                {c.past_med_surge_history && (
                                                                    <div className="sm:col-span-2">
                                                                        <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Past Medical / Surgical History</div>
                                                                        <div className="text-sm text-slate-800">{c.past_med_surge_history}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

const BhwDashboard = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('?');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [records, setRecords] = useState<any[]>([]); // State for FHSIS Census Logs
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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
                .select('*')
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
                                                    <div key={p.id} onClick={() => setSelectedPatient(p)} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
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
                                <RecordsComponent onPatientClick={(p) => setSelectedPatient(p as any)} />
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

            {selectedPatient && (
                <PatientDetailModal
                    patient={selectedPatient}
                    onClose={() => setSelectedPatient(null)}
                />
            )}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<BhwDashboard />);
}