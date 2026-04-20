import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';
import ReactDOM from 'react-dom/client';
import { Sidebar } from './sidebar';

// ─── Types ────────────────────────────────────────────────────────────────────
interface InitialConsultationData {
    dateOfConsultation: string; consultationTime: string;
    referredBy: string; modeOfTransaction: string; modeOfTransfer: string;
    chiefComplaints: string; diagnosis: string; diagnosisOther: string;
    historyOfPresentIllness: string;
    bp: string; hr: string; rr: string; temp: string; weight: string;
    height: string; o2Sat: string; muac: string; nutritionalStatus: string;
    bmi: string; visualAcuityLeft: string; visualAcuityRight: string;
    bloodType: string; generalSurvey: string;
}

const EMPTY_FORM: InitialConsultationData = {
    dateOfConsultation: '', consultationTime: '', referredBy: '', modeOfTransaction: '', modeOfTransfer: '',
    chiefComplaints: '', diagnosis: '', diagnosisOther: '', historyOfPresentIllness: '',
    bp: '', hr: '', rr: '', temp: '', weight: '', height: '', o2Sat: '', muac: '',
    nutritionalStatus: '', bmi: '', visualAcuityLeft: '', visualAcuityRight: '', bloodType: '', generalSurvey: '',
};

const DIAGNOSIS_OPTIONS = [
    'Common Cold',
    'Pneumonia',
    'High Blood Pressure',
    'Diabetes',
    'Asthma',
    'Dengue',
    'Fever',
    'Diarrhea',
    'UTI',
    'Tuberculosis',
    'High Cholesterol',
    'Heart Disease',
    'Stroke',
    'Acid Reflux',
    'Arthritis',
    'Others',
];

// ─── Helper ───────────────────────────────────────────────────────────────────
const toNumberOrNull = (val: string) => {
    if (!val || val.trim() === '') return null;
    const parsed = Number(val);
    return isNaN(parsed) ? null : parsed;
};

// ─── Get patient ID from URL ──────────────────────────────────────────────────
const patientId = new URLSearchParams(window.location.search).get('id');

// ─── Component ────────────────────────────────────────────────────────────────
function InitialConsultation() {
    const [formData, setFormData] = useState<InitialConsultationData>(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [patientName, setPatientName] = useState('');
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('');
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
        { id: 'records', label: 'Patient Records', icon: '📁' },
        { id: 'new-record', label: 'New Record', icon: '➕' },
        { id: 'consultation', label: 'Consultation', icon: '📋' }
    ];

    // ─── Auth + Patient load ───────────────────────────────────────────────────
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        (async () => {
            const profile = await requireRole('nurse');
            const initials = profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
            setUserName(profile.fullName);
            setUserInitials(initials);

            if (!patientId) { setPatientName('Unknown Patient'); return; }
            const { data } = await supabase
                .from('patients')
                .select('firstName, middleName, lastName')
                .eq('id', patientId)
                .single();
            if (data) {
                setPatientName(`${data.lastName}, ${data.firstName} ${data.middleName || ''}`.trim());
            }
        })();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 4000);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ─── Resolve final diagnosis value before saving ───────────────────────────
    const getResolvedDiagnosis = () => {
        if (formData.diagnosis === 'Others') {
            return formData.diagnosisOther.trim() || 'Others';
        }
        return formData.diagnosis;
    };

    // ─── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId) { alert('No patient ID found in URL.'); return; }
        setIsSubmitting(true);

        try {
            // 1. initial_consultation
            const { error: e1 } = await supabase.from('initial_consultation').insert([{
                patient_id: patientId,
                consultation_date: formData.dateOfConsultation || null,
                consultation_time: formData.consultationTime || null,
                mode_of_transaction: formData.modeOfTransaction || null,
                referred_by: formData.referredBy || null,
                mode_of_transfer: formData.modeOfTransfer || null,
                chief_complaint: formData.chiefComplaints || null,
                diagnosis: getResolvedDiagnosis() || null,
            }]);
            if (e1) throw new Error('initial_consultation: ' + e1.message);

            // 2. vital_sign
            const { error: e2 } = await supabase.from('vital_sign').insert([{
                patient_id: patientId,
                bp: formData.bp || null,
                heart_rate: toNumberOrNull(formData.hr),
                respiratory_rate: toNumberOrNull(formData.rr),
                temperature: toNumberOrNull(formData.temp),
                o2_saturation: toNumberOrNull(formData.o2Sat),
                weight: toNumberOrNull(formData.weight),
                height: toNumberOrNull(formData.height),
                muac: toNumberOrNull(formData.muac),
                nutritional_status: formData.nutritionalStatus || null,
                bmi: toNumberOrNull(formData.bmi),
                visual_acuity_left: formData.visualAcuityLeft || null,
                visual_acuity_right: formData.visualAcuityRight || null,
                general_survey: formData.generalSurvey || null,
            }]);
            if (e2) throw new Error('vital_sign: ' + e2.message);

            showToast('Consultation record saved successfully!', true);
            setFormData(EMPTY_FORM);

            setTimeout(() => {
                window.location.href = '/pages/nurse.html';
            }, 1500);

        } catch (err: any) {
            console.error(err);
            showToast('Failed to save: ' + err.message, false);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Reusable Tailwind Classes ─────────────────────────────────────────────
    const inputClasses = "w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white transition-colors text-slate-800 placeholder:text-slate-400";
    const labelClasses = "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5";
    const fieldsetClasses = "bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden";
    const legendClasses = "w-full px-6 py-4 border-b border-slate-100 text-sm font-extrabold text-slate-800 uppercase tracking-wider bg-slate-50/50 flex items-center gap-2";

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden w-full">

            {/* ── Toast ── */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl text-sm font-bold shadow-xl flex items-center gap-2 border transition-all ${toast.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    <span>{toast.ok ? '✅' : '❌'}</span> {toast.msg}
                </div>
            )}

            {/* ── Sidebar ── */}
            <Sidebar
                activePage="consultation"
                userName={userName}
                userInitials={userInitials}
                userRole="Registered Nurse"
                navItems={navItems}
                onNavigate={(id) => {
                    if (id === 'dashboard') window.location.href = '/pages/nurse.html';
                    if (id === 'records') window.location.href = '/pages/records.html';
                    if (id === 'new-record') window.location.href = '/pages/templates.html';
                    if (id === 'consultation') window.location.href = '/pages/initial_consultation.html';
                }}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            {/* ── Main Content ── */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-[240px] w-full">

                {/* Topbar */}
                <header className="h-[60px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm shrink-0">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 p-2 -ml-2 rounded-lg hover:bg-slate-50">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                        <button onClick={() => window.location.href = '/pages/nurse.html'} className="hidden sm:flex items-center gap-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border border-transparent hover:border-slate-200">
                            <span>←</span> Back to Dashboard
                        </button>
                        <div className="h-5 w-px bg-slate-300 hidden sm:block mx-1"></div>
                        <div className="font-bold text-lg text-slate-800">Initial Consultation</div>
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
                    <div className="p-4 md:p-6 lg:p-8 mx-auto w-full max-w-5xl">

                        {/* Patient Header */}
                        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                                    📋 Initial Consultation
                                </h1>
                                <p className="text-sm text-slate-500 mt-1">
                                    Patient: <strong className="text-slate-800 text-base ml-1 bg-slate-200 px-2 py-0.5 rounded-md">{patientName || 'Loading patient...'}</strong>
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-slate-700">Live • Auto-saves enabled</span>
                            </div>
                        </div>

                        {/* Mobile Back Button */}
                        <button onClick={() => window.location.href = '/pages/nurse.html'} className="sm:hidden mb-4 w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors">
                            ← Back to Dashboard
                        </button>

                        <form onSubmit={handleSubmit} className="w-full">

                            {/* SECTION: General Information */}
                            <fieldset className={fieldsetClasses}>
                                <div className={legendClasses}>
                                    <span className="text-blue-600">①</span> General Information
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                        <div>
                                            <label className={labelClasses}>Date of Consultation</label>
                                            <input type="date" name="dateOfConsultation" value={formData.dateOfConsultation} onChange={handleChange} className={inputClasses} required />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Consultation Time</label>
                                            <input type="time" name="consultationTime" value={formData.consultationTime} onChange={handleChange} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Referred From / By</label>
                                            <input type="text" name="referredBy" value={formData.referredBy} onChange={handleChange} className={inputClasses} placeholder="Name or Department" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-6">
                                        <div>
                                            <label className={labelClasses}>Mode of Transaction</label>
                                            <div className="flex flex-wrap gap-3 mt-2">
                                                {['Walk in', 'Referral'].map(v => (
                                                    <label key={v} className={`cursor-pointer px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${formData.modeOfTransaction === v ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}>
                                                        <input type="radio" name="modeOfTransaction" value={v} onChange={handleRadioChange} checked={formData.modeOfTransaction === v} className="hidden" />
                                                        {v}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Mode of Transfer</label>
                                            <div className="flex flex-wrap gap-3 mt-2">
                                                {['Ambulatory', 'Via Wheelchair'].map(v => (
                                                    <label key={v} className={`cursor-pointer px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${formData.modeOfTransfer === v ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}>
                                                        <input type="radio" name="modeOfTransfer" value={v} onChange={handleRadioChange} checked={formData.modeOfTransfer === v} className="hidden" />
                                                        {v}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </fieldset>

                            {/* SECTION: Clinical Notes */}
                            <fieldset className={fieldsetClasses}>
                                <div className={legendClasses}>
                                    <span className="text-pink-600">②</span> Clinical Notes
                                </div>
                                <div className="p-6 flex flex-col gap-5">
                                    <div>
                                        <label className={labelClasses}>Chief Complaints</label>
                                        <textarea name="chiefComplaints" value={formData.chiefComplaints} onChange={handleChange} rows={3} className={`${inputClasses} resize-y min-h-[80px]`} placeholder="Describe the patient's primary symptoms..."></textarea>
                                    </div>

                                    {/* ── Diagnosis Dropdown ── */}
                                    <div>
                                        <label className={labelClasses}>Diagnosis</label>
                                        <select
                                            name="diagnosis"
                                            value={formData.diagnosis}
                                            onChange={handleChange}
                                            className={inputClasses}
                                        >
                                            <option value="">— Select a diagnosis —</option>
                                            {DIAGNOSIS_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>

                                        {/* Show text input only when "Others" is selected */}
                                        {formData.diagnosis === 'Others' && (
                                            <div className="mt-3">
                                                <input
                                                    type="text"
                                                    name="diagnosisOther"
                                                    value={formData.diagnosisOther}
                                                    onChange={handleChange}
                                                    className={inputClasses}
                                                    placeholder="Please specify diagnosis..."
                                                    autoFocus
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className={labelClasses}>History of Present Illnesses</label>
                                        <textarea name="historyOfPresentIllness" value={formData.historyOfPresentIllness} onChange={handleChange} rows={3} className={`${inputClasses} resize-y min-h-[80px]`} placeholder="Relevant medical history leading up to today..."></textarea>
                                    </div>
                                </div>
                            </fieldset>

                            {/* SECTION: Vital Signs */}
                            <fieldset className={fieldsetClasses}>
                                <div className={legendClasses}>
                                    <span className="text-green-600">③</span> Physical Examination & Vital Signs
                                </div>
                                <div className="p-6 bg-slate-50/30">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                        {[
                                            { label: 'BP (mmHg)', name: 'bp', type: 'text', placeholder: '120/80' },
                                            { label: 'Heart Rate (bpm)', name: 'hr', type: 'number' },
                                            { label: 'Resp. Rate (cpm)', name: 'rr', type: 'number' },
                                            { label: 'Temp (°C)', name: 'temp', type: 'number', step: '0.1' },
                                            { label: 'O2 Sat (%)', name: 'o2Sat', type: 'number' },
                                            { label: 'Weight (kg)', name: 'weight', type: 'number', step: '0.1' },
                                            { label: 'Height (cm)', name: 'height', type: 'number', step: '0.1' },
                                            { label: 'BMI', name: 'bmi', type: 'text' },
                                            { label: 'MUAC', name: 'muac', type: 'text' },
                                            { label: 'Nutrition Status', name: 'nutritionalStatus', type: 'text' },
                                            { label: 'Vis. Acuity (L)', name: 'visualAcuityLeft', type: 'text', placeholder: '20/20' },
                                            { label: 'Vis. Acuity (R)', name: 'visualAcuityRight', type: 'text', placeholder: '20/20' },
                                            { label: 'Blood Type', name: 'bloodType', type: 'text', placeholder: 'O+' },
                                        ].map(f => (
                                            <div key={f.name} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{f.label}</label>
                                                <input type={f.type} name={f.name} value={(formData as any)[f.name]} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all" placeholder={(f as any).placeholder || ''} step={(f as any).step} />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-200">
                                        <label className={labelClasses}>General Survey Status</label>
                                        <div className="flex flex-wrap gap-3 mt-3">
                                            {['Awake and Alert', 'Altered Sensorium'].map(v => (
                                                <label key={v} className={`cursor-pointer px-4 py-3 border rounded-xl text-sm font-semibold transition-all ${formData.generalSurvey === v ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}>
                                                    <input type="radio" name="generalSurvey" value={v} onChange={handleRadioChange} checked={formData.generalSurvey === v} className="hidden" />
                                                    {v}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </fieldset>

                            {/* Submit Area */}
                            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-6 mb-12 border-t border-slate-200 pt-6">
                                <button type="button" onClick={() => window.location.href='/pages/nurse.html'} className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 transition-colors text-sm">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-lg text-sm transition-all ${isSubmitting ? 'bg-blue-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-blue-500/30'}`}
                                >
                                    {isSubmitting ? '⏳ Saving Record...' : '💾 Save Consultation Record'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    import('react-dom/client').then(({ createRoot }) => {
        createRoot(rootElement).render(<InitialConsultation />);
    });
}