import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';
import { Sidebar } from './sidebar';
import { useNetworkSync, saveToIndexedDB, initIndexedDB } from '../shared/useNetworkSync';
import { OfflineBanner } from './OfflineBanner';

// ─── Patient type ─────────────────────────────────────────────────────────────
interface PatientData {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    age: number | null;
    sex: string;
    bloodType: string;
    address?: string;
    contactNumber?: string;
}

function ConsultationPage() {

    // 1. MASTER FORM STATE
    const [formData, setFormData] = useState({
        // ── Histories ──────────────────────────────────────────────────────
        familyHistory: '',
        immunizationHistory: '',
        smoking: '',
        smokingSticksPerDay: '',
        smokingYears: '',
        drinking: '',
        drinkingFrequency: '',
        drinkingYears: '',

        // ── OBGyne ─────────────────────────────────────────────────────────
        menarche: '',
        onsetSexualIntercourse: '',
        menopause: '',
        menopauseAge: '',
        lmp: '',
        intervalCycle: '',
        periodDuration: '',
        padsPerDay: '',
        birthControlMethod: '',

        // ── Pregnancy History ──────────────────────────────────────────────
        gravidity: '',
        parity: '',
        typeOfDelivery: '',
        fullTerm: '',
        premature: '',
        abortion: '',
        livingChildren: '',
        preEclampsia: '',

        // ── Clinical Assessment ────────────────────────────────────────────
        medicationAndTreatment: '',

        // ── Follow-up ──────────────────────────────────────────────────────
        followUpDate: new Date().toISOString().split('T')[0],
        followUpTime: '',
        managementTreatment: '',
        attendingProvider: '',

        // ── Clinical Notes ─────────────────────────────────────────────────
        chiefComplaints: '',
        diagnosis: '',
        hpi: '',

        // ── Physical Exam ──────────────────────────────────────────────────
        bp: '', hr: '', rr: '', temp: '', weight: '', height: '',
        o2Saturation: '',
        muac: '',
        nutritionalStatus: '',
        bmi: '',
        visualAcuityLeft: '',
        visualAcuityRight: '',

        // ── SOAP ───────────────────────────────────────────────────────────
        assessment: '',
        plan: '',
        rxDetails: '',
        labTests: {
            cbc: false, fbs: false, urinalysis: false, lipidProfile: false,
            fecalysis: false, hba1c: false, bloodTyping: false, creatinine: false,
            sgpt: false, uricAcid: false, chestXray: false, ecg: false, others: false
        },
        labTestsOther: ''
    });

    // 2. UI & NAVIGATION STATES
    const [activeTab, setActiveTab] = useState(1);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [patient, setPatient] = useState<PatientData | null>(null);
    const [patientLoading, setPatientLoading] = useState(true);
    const [loading, setLoading] = useState(false);

    // 3. USER DATA STATES
    const [doctorName, setDoctorName] = useState('Loading...');
    const [doctorInitials, setDoctorInitials] = useState('D');

    // 4. NETWORK & SYNC STATE
    const { isOnline, isSyncing } = useNetworkSync();

    // 5. DYNAMIC BUTTON COLOR
    const primaryBtnBg = isOnline
        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20';

    // 6. MODAL TRIGGERS
    const [isRxModalOpen, setIsRxModalOpen] = useState(false);
    const [isMedCertModalOpen, setIsMedCertModalOpen] = useState(false);
    const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);

    // 7. VITALS STATE
    const [vitalsId, setVitalsId] = useState<number | null>(null);
    const [vitalsLoading, setVitalsLoading] = useState(false);

    // ─── INIT: Auth + Patient fetch ───────────────────────────────────────────
    useEffect(() => {
        initIndexedDB('MediSensDB', 'offline_patients');

        requireRole('doctor').then(async profile => {
            setDoctorName(profile.fullName);
            const initials = profile.fullName
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
            setDoctorInitials(initials);
            setFormData(prev => ({ ...prev, attendingProvider: profile.fullName }));

            // Read patient ID from URL
            const patientId = new URLSearchParams(window.location.search).get('id');
            if (!patientId) {
                setPatientLoading(false);
                return;
            }

            // Fetch patient from Supabase
            const { data, error } = await supabase
                .from('patients')
                .select('id, firstName, lastName, middleName, age, sex, bloodType, address, contactNumber')
                .eq('id', patientId)
                .single();

            if (error) {
                console.error('Failed to fetch patient:', error);
            } else if (data) {
                setPatient(data as PatientData);
            }

            setPatientLoading(false);
        });
    }, []);

    // ─── VITALS FETCH: Runs when patient is loaded ────────────────────────────
    useEffect(() => {
        if (!patient?.id) return;
        setVitalsLoading(true);

        supabase
            .from('vital_sign')
            .select('*')
            .eq('patient_id', patient.id)
            .order('vitals_id', { ascending: false })
            .limit(1)
            .single()
            .then(({ data }) => {
                if (data) {
                    setVitalsId(data.vitals_id);
                    setFormData(prev => ({
                        ...prev,
                        bp: data.bp ?? '',
                        hr: data.heart_rate?.toString() ?? '',
                        rr: data.respiratory_rate?.toString() ?? '',
                        temp: data.temperature?.toString() ?? '',
                        weight: data.weight?.toString() ?? '',
                        height: data.height?.toString() ?? '',
                        o2Saturation: data.o2_saturation?.toString() ?? '',
                        muac: data.muac?.toString() ?? '',
                        nutritionalStatus: data.nutritional_status ?? '',
                        bmi: data.bmi?.toString() ?? '',
                        visualAcuityLeft: data.visual_acuity_left ?? '',
                        visualAcuityRight: data.visual_acuity_right ?? '',
                    }));
                }
                setVitalsLoading(false);
            });
    }, [patient?.id]);

    useEffect(() => {
        const handleResize = () => { if (window.innerWidth >= 768) setIsMobileMenuOpen(false); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ─── HANDLERS ────────────────────────────────────────────────────────────

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLabTestChange = (testName: keyof typeof formData.labTests) => {
        setFormData(prev => ({
            ...prev,
            labTests: { ...prev.labTests, [testName]: !prev.labTests[testName] }
        }));
    };

    const handleSaveAndPrintLabOrder = async () => {
        setLoading(true);
        const payload = {
            patient_id: patient?.id,
            request_date: new Date().toISOString().split('T')[0],
            chief_complaint: formData.chiefComplaints,
            is_cbc: formData.labTests.cbc,
            is_urinalysis: formData.labTests.urinalysis,
            is_fecalysis: formData.labTests.fecalysis,
            is_fbs: formData.labTests.fbs,
            is_uric_acid: formData.labTests.uricAcid,
            is_cholesterol: formData.labTests.lipidProfile,
            is_hgb_hct: formData.labTests.bloodTyping,
            is_xray: formData.labTests.chestXray,
            status: 'pending'
        };

        try {
            if (isOnline) {
                const { error } = await supabase.from('lab_request').insert([payload]);
                if (error) throw error;
                alert("Lab Request sent to Laboratory successfully!");
            } else {
                await saveToIndexedDB('MediSensDB', 'offline_patients', {
                    id: Date.now(),
                    type: 'lab_request',
                    data: payload
                });
                alert("You are offline. Lab Request saved locally and will sync when connection returns!");
            }
            window.print();
            setIsLabOrderModalOpen(false);
        } catch (error: any) {
            console.error("Error:", error);
            alert("Failed to send request: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendToPharmacy = async () => {
        if (!formData.assessment || !formData.plan) {
            alert("Please fill out the Assessment and Plan before sending.");
            return;
        }
        setLoading(true);
        try {
            if (isOnline) {
                setTimeout(() => { setLoading(false); alert("Consultation saved and sent to pharmacy!"); }, 1000);
            } else {
                await saveToIndexedDB('MediSensDB', 'offline_patients', {
                    id: Date.now(),
                    type: 'consultation',
                    data: { ...formData, patient_id: patient?.id }
                });
                setLoading(false);
                alert("You are offline. Consultation saved locally and will sync when connection returns!");
            }
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const isSoapFilled = formData.assessment.trim() !== '' && formData.plan.trim() !== '';

    // ─── DERIVED PATIENT DISPLAY VALUES ──────────────────────────────────────
    const patientFullName = patient
        ? `${patient.firstName} ${patient.middleName ? patient.middleName + ' ' : ''}${patient.lastName}`
        : '—';
    const patientInitials = patient
        ? `${patient.firstName?.[0] ?? ''}${patient.lastName?.[0] ?? ''}`.toUpperCase()
        : '?';

    // ─── SHARED STYLES ───────────────────────────────────────────────────────
    const inputCls = "w-full bg-white border border-slate-200 rounded-lg p-3.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-800";
    const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2";
    const textareaCls = "w-full bg-white border border-slate-200 rounded-lg p-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm text-slate-800 resize-y";

    const RadioGroup = ({ name, options, value }: { name: string; options: string[]; value: string }) => (
        <div className="flex gap-3 flex-wrap">
            {options.map(opt => (
                <label key={opt} className={`cursor-pointer px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${value === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                    <input type="radio" name={name} value={opt} checked={value === opt} onChange={handleRadioChange} className="hidden" />
                    {opt}
                </label>
            ))}
        </div>
    );

    // ─── CHECKBOX RENDERER ───────────────────────────────────────────────────
    const renderCheckbox = (key: keyof typeof formData.labTests, label: string) => (
        <label className="flex items-center gap-3 cursor-pointer group min-h-[44px]">
            <div className="relative flex items-center justify-center w-6 h-6 md:w-5 md:h-5 border-2 border-slate-400 print:border-black rounded bg-white shrink-0">
                <input type="checkbox" checked={formData.labTests[key]} onChange={() => handleLabTestChange(key)} className="absolute opacity-0 w-0 h-0" />
                {formData.labTests[key] && (
                    <svg className="w-4 h-4 text-blue-600 print:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
            <span className="font-medium text-slate-700 print:text-black text-sm md:text-base">{label}</span>
        </label>
    );

    // ─── PATIENT HEADER CARD ─────────────────────────────────────────────────
    const renderPatientCard = () => {
        if (patientLoading) {
            return (
                <div className="w-full bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-48" />
                        <div className="h-3 bg-slate-100 rounded w-64" />
                    </div>
                </div>
            );
        }

        if (!patient) {
            return (
                <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-700 text-sm font-semibold">
                    ⚠️ No patient selected. Please go back to the dashboard and select a patient from the queue.
                </div>
            );
        }

        return (
            <div className="w-full bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                    {patientInitials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-base leading-tight truncate">{patientFullName}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{patient.age ?? '—'}</span> yrs old
                        </span>
                        <span className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{patient.sex || '—'}</span>
                        </span>
                        <span className="text-xs text-slate-500">
                            Blood Type: <span className="font-semibold text-slate-700">{patient.bloodType || '—'}</span>
                        </span>
                        {patient.contactNumber && (
                            <span className="text-xs text-slate-500">
                                📞 <span className="font-semibold text-slate-700">{patient.contactNumber}</span>
                            </span>
                        )}
                        {patient.address && (
                            <span className="text-xs text-slate-500 truncate max-w-xs">
                                📍 {patient.address}
                            </span>
                        )}
                    </div>
                </div>

                {/* Back button */}
                <button
                    onClick={() => window.location.href = 'doctor.html'}
                    className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-all"
                >
                    ← Dashboard
                </button>
            </div>
        );
    };

    // ─── TAB RENDERERS ───────────────────────────────────────────────────────

    const renderTab1 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">I. Histories</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className={labelCls}>Family History</label>
                        <textarea name="familyHistory" value={formData.familyHistory} onChange={handleChange} rows={4} className={textareaCls} placeholder="Notable family medical history..." />
                    </div>
                    <div>
                        <label className={labelCls}>Immunization History</label>
                        <textarea name="immunizationHistory" value={formData.immunizationHistory} onChange={handleChange} rows={4} className={textareaCls} placeholder="Vaccines received..." />
                    </div>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-6">
                    <div>
                        <label className={labelCls}>Smoking History</label>
                        <RadioGroup name="smoking" options={['Yes', 'No']} value={formData.smoking} />
                        {formData.smoking === 'Yes' && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <label className={labelCls}>Sticks / Day</label>
                                    <input type="number" name="smokingSticksPerDay" value={formData.smokingSticksPerDay} onChange={handleChange} className={inputCls} placeholder="e.g. 5" />
                                </div>
                                <div>
                                    <label className={labelCls}>Years</label>
                                    <input type="number" name="smokingYears" value={formData.smokingYears} onChange={handleChange} className={inputCls} placeholder="e.g. 3" />
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className={labelCls}>Drinking History</label>
                        <RadioGroup name="drinking" options={['Yes', 'No']} value={formData.drinking} />
                        {formData.drinking === 'Yes' && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <label className={labelCls}>Frequency</label>
                                    <input type="text" name="drinkingFrequency" value={formData.drinkingFrequency} onChange={handleChange} className={inputCls} placeholder="e.g. Weekly" />
                                </div>
                                <div>
                                    <label className={labelCls}>Years</label>
                                    <input type="number" name="drinkingYears" value={formData.drinkingYears} onChange={handleChange} className={inputCls} placeholder="e.g. 2" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button onClick={() => setActiveTab(2)} className={`w-full md:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>
                    Next: OBGyne &amp; Pregnancy &rarr;
                </button>
            </div>
        </div>
    );

    const renderTab2 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">II. OBGyne &amp; Pregnancy History</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">OBGyne</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Menarche (y/o)</label>
                            <input type="number" name="menarche" value={formData.menarche} onChange={handleChange} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Onset Sexual Intercourse (y/o)</label>
                            <input type="number" name="onsetSexualIntercourse" value={formData.onsetSexualIntercourse} onChange={handleChange} className={inputCls} />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Menopause</label>
                        <RadioGroup name="menopause" options={['Yes', 'No']} value={formData.menopause} />
                        {formData.menopause === 'Yes' && (
                            <div className="mt-3">
                                <label className={labelCls}>Age at Menopause</label>
                                <input type="number" name="menopauseAge" value={formData.menopauseAge} onChange={handleChange} className={inputCls} placeholder="Age" />
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelCls}>LMP</label><input type="date" name="lmp" value={formData.lmp} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}>Interval Cycle (Days)</label><input type="text" name="intervalCycle" value={formData.intervalCycle} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}>Period Duration (Days)</label><input type="text" name="periodDuration" value={formData.periodDuration} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}># of Pads / Day</label><input type="number" name="padsPerDay" value={formData.padsPerDay} onChange={handleChange} className={inputCls} /></div>
                    </div>
                    <div>
                        <label className={labelCls}>Birth Control Method</label>
                        <input type="text" name="birthControlMethod" value={formData.birthControlMethod} onChange={handleChange} className={inputCls} placeholder="e.g. Pills, IUD..." />
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pregnancy History</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelCls}>Gravidity</label><input type="number" name="gravidity" value={formData.gravidity} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}>Parity</label><input type="number" name="parity" value={formData.parity} onChange={handleChange} className={inputCls} /></div>
                    </div>
                    <div>
                        <label className={labelCls}>Type of Delivery</label>
                        <select name="typeOfDelivery" value={formData.typeOfDelivery} onChange={handleChange} className={inputCls}>
                            <option value="">Select type...</option>
                            <option value="Normal">Normal</option>
                            <option value="CS">CS</option>
                            <option value="Both">Both Normal and CS</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelCls}># Full Term</label><input type="number" name="fullTerm" value={formData.fullTerm} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}># Premature</label><input type="number" name="premature" value={formData.premature} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}># Abortion</label><input type="number" name="abortion" value={formData.abortion} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}># Living Children</label><input type="number" name="livingChildren" value={formData.livingChildren} onChange={handleChange} className={inputCls} /></div>
                    </div>
                    <div>
                        <label className={labelCls}>Pre-eclampsia</label>
                        <RadioGroup name="preEclampsia" options={['Yes', 'No']} value={formData.preEclampsia} />
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <button onClick={() => setActiveTab(1)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">&larr; Back</button>
                <button onClick={() => setActiveTab(3)} className={`order-1 sm:order-2 w-full sm:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>
                    Next: Clinical Assessment &rarr;
                </button>
            </div>
        </div>
    );

    const renderTab3 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">III. Clinical Assessment</h3>
            <div>
                <label className={labelCls}>Medication and Treatment</label>
                <textarea name="medicationAndTreatment" value={formData.medicationAndTreatment} onChange={handleChange} rows={7} className={textareaCls} placeholder="Prescribed medications, treatment plans, follow-up instructions..." />
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <button onClick={() => setActiveTab(2)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">&larr; Back</button>
                <button onClick={() => setActiveTab(4)} className={`order-1 sm:order-2 w-full sm:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>
                    Next: Follow-up &rarr;
                </button>
            </div>
        </div>
    );

    const renderTab4 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-3">IV. Follow-up Visits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div><label className={labelCls}>Date</label><input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleChange} className={inputCls} /></div>
                <div><label className={labelCls}>Time</label><input type="time" name="followUpTime" value={formData.followUpTime} onChange={handleChange} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Management / Treatment</label><textarea name="managementTreatment" value={formData.managementTreatment} onChange={handleChange} className={`${textareaCls} min-h-[120px]`} placeholder="Enter management or treatment plans..." /></div>
            <div><label className={labelCls}>Attending Provider</label><input type="text" name="attendingProvider" value={formData.attendingProvider} onChange={handleChange} className={inputCls} /></div>
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <button onClick={() => setActiveTab(3)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">&larr; Back</button>
                <button onClick={() => setActiveTab(5)} className={`order-1 sm:order-2 w-full sm:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>
                    Next: Clinical Notes &rarr;
                </button>
            </div>
        </div>
    );

    const renderTab5 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">V. Doctor's Clinical Notes</h3>
            <div><label className={labelCls}>Chief Complaints</label><textarea name="chiefComplaints" value={formData.chiefComplaints} onChange={handleChange} className={`${textareaCls} min-h-[120px]`} placeholder="Describe patient's primary symptoms..." /></div>
            <div><label className={labelCls}>Diagnosis</label><textarea name="diagnosis" value={formData.diagnosis} onChange={handleChange} className={`${textareaCls} min-h-[100px]`} /></div>
            <div><label className={labelCls}>History of Present Illnesses <span className="text-slate-400 font-normal normal-case">(Optional)</span></label><textarea name="hpi" value={formData.hpi} onChange={handleChange} className={`${textareaCls} min-h-[120px]`} /></div>
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <button onClick={() => setActiveTab(4)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">&larr; Back</button>
                <button onClick={() => setActiveTab(6)} className={`order-1 sm:order-2 w-full sm:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>
                    Next: Physical Exam &rarr;
                </button>
            </div>
        </div>
    );

    // ─── TAB 6: Physical Examination (with DB fetch + save) ───────────────────
    const renderTab6 = () => {

        const handleSaveVitals = async () => {
            if (!patient?.id) return;
            setLoading(true);

            // Auto-compute BMI for saving
            const w = parseFloat(formData.weight);
            const h = parseFloat(formData.height);
            const computedBmiValue = (w > 0 && h > 0)
                ? parseFloat((w / ((h / 100) * (h / 100))).toFixed(1))
                : (formData.bmi ? parseFloat(formData.bmi) : null);

            const payload = {
                patient_id: patient.id,
                bp: formData.bp || null,
                heart_rate: formData.hr ? parseInt(formData.hr) : null,
                respiratory_rate: formData.rr ? parseInt(formData.rr) : null,
                temperature: formData.temp ? parseFloat(formData.temp) : null,
                weight: formData.weight ? parseFloat(formData.weight) : null,
                height: formData.height ? parseInt(formData.height) : null,
                o2_saturation: formData.o2Saturation ? parseInt(formData.o2Saturation) : null,
                muac: formData.muac ? parseFloat(formData.muac) : null,
                nutritional_status: formData.nutritionalStatus || null,
                bmi: computedBmiValue,
                visual_acuity_left: formData.visualAcuityLeft || null,
                visual_acuity_right: formData.visualAcuityRight || null,
            };

            try {
                if (isOnline) {
                    if (vitalsId) {
                        const { error } = await supabase
                            .from('vital_sign')
                            .update(payload)
                            .eq('vitals_id', vitalsId);
                        if (error) throw error;
                    } else {
                        const { data, error } = await supabase
                            .from('vital_sign')
                            .insert([payload])
                            .select('vitals_id')
                            .single();
                        if (error) throw error;
                        if (data) setVitalsId(data.vitals_id);
                    }
                    alert('Vitals saved successfully!');
                } else {
                    await saveToIndexedDB('MediSensDB', 'offline_patients', {
                        id: Date.now(),
                        type: 'vital_sign',
                        data: payload
                    });
                    alert('Offline: Vitals saved locally and will sync when connection returns!');
                }
            } catch (err: any) {
                alert('Failed to save vitals: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        // Auto-compute BMI for display
        const w = parseFloat(formData.weight);
        const h = parseFloat(formData.height);
        const computedBmi = (w > 0 && h > 0)
            ? (w / ((h / 100) * (h / 100))).toFixed(1)
            : '';

        const bmiLabel = computedBmi
            ? parseFloat(computedBmi) < 18.5 ? 'Underweight'
            : parseFloat(computedBmi) < 25 ? 'Normal weight'
            : parseFloat(computedBmi) < 30 ? 'Overweight'
            : 'Obese'
            : '';

        const bmiColor = computedBmi
            ? parseFloat(computedBmi) < 18.5 ? 'text-amber-500'
            : parseFloat(computedBmi) < 25 ? 'text-green-600'
            : parseFloat(computedBmi) < 30 ? 'text-orange-500'
            : 'text-red-500'
            : '';

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">

                {/* Section Header with status badge */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-bold text-slate-900">VI. Physical Examination</h3>
                    {vitalsLoading && (
                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Loading latest vitals...
                        </span>
                    )}
                    {vitalsId && !vitalsLoading && (
                        <span className="text-xs text-green-600 font-semibold bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                            ✓ Loaded from record #{vitalsId}
                        </span>
                    )}
                    {!vitalsId && !vitalsLoading && patient && (
                        <span className="text-xs text-slate-400 font-semibold bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                            No previous vitals found
                        </span>
                    )}
                </div>

                {/* Core Vitals */}
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Core Vitals</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                        <div><label className={labelCls}>BP (mmHg)</label><input type="text" name="bp" value={formData.bp} onChange={handleChange} className={inputCls} placeholder="120/80" /></div>
                        <div><label className={labelCls}>Heart Rate (bpm)</label><input type="text" name="hr" value={formData.hr} onChange={handleChange} className={inputCls} placeholder="72" /></div>
                        <div><label className={labelCls}>Respiratory Rate (cpm)</label><input type="text" name="rr" value={formData.rr} onChange={handleChange} className={inputCls} placeholder="16" /></div>
                        <div><label className={labelCls}>Temperature (°C)</label><input type="text" name="temp" value={formData.temp} onChange={handleChange} className={inputCls} placeholder="36.5" /></div>
                        <div><label className={labelCls}>O₂ Saturation (%)</label><input type="text" name="o2Saturation" value={formData.o2Saturation} onChange={handleChange} className={inputCls} placeholder="98" /></div>
                        <div><label className={labelCls}>MUAC (cm)</label><input type="text" name="muac" value={formData.muac} onChange={handleChange} className={inputCls} placeholder="28.5" /></div>
                    </div>
                </div>

                {/* Anthropometrics */}
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Anthropometrics</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                        <div><label className={labelCls}>Weight (kg)</label><input type="text" name="weight" value={formData.weight} onChange={handleChange} className={inputCls} placeholder="65" /></div>
                        <div><label className={labelCls}>Height (cm)</label><input type="text" name="height" value={formData.height} onChange={handleChange} className={inputCls} placeholder="165" /></div>
                        <div>
                            <label className={labelCls}>BMI <span className="text-slate-400 font-normal normal-case">(auto-computed)</span></label>
                            <input
                                type="text"
                                name="bmi"
                                value={computedBmi || formData.bmi}
                                readOnly={!!computedBmi}
                                onChange={handleChange}
                                className={`${inputCls} ${computedBmi ? 'bg-slate-50 text-slate-500 cursor-default' : ''}`}
                                placeholder="—"
                            />
                            {computedBmi && (
                                <p className={`text-xs mt-1.5 font-semibold ${bmiColor}`}>
                                    {bmiLabel}
                                </p>
                            )}
                        </div>
                        <div className="col-span-2 md:col-span-3">
                            <label className={labelCls}>Nutritional Status</label>
                            <select name="nutritionalStatus" value={formData.nutritionalStatus} onChange={handleChange} className={inputCls}>
                                <option value="">Select status...</option>
                                <option value="Normal">Normal</option>
                                <option value="Underweight">Underweight</option>
                                <option value="Overweight">Overweight</option>
                                <option value="Obese">Obese</option>
                                <option value="Severely Underweight">Severely Underweight</option>
                                <option value="Morbidly Obese">Morbidly Obese</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Visual Acuity */}
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Visual Acuity</p>
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div><label className={labelCls}>Left Eye</label><input type="text" name="visualAcuityLeft" value={formData.visualAcuityLeft} onChange={handleChange} className={inputCls} placeholder="20/20" /></div>
                        <div><label className={labelCls}>Right Eye</label><input type="text" name="visualAcuityRight" value={formData.visualAcuityRight} onChange={handleChange} className={inputCls} placeholder="20/20" /></div>
                    </div>
                </div>

                {/* Navigation + Save */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => setActiveTab(5)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">&larr; Back</button>
                    <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
                        <button
                            onClick={handleSaveVitals}
                            disabled={loading || !patient?.id}
                            className={`w-full sm:w-auto font-semibold py-3 px-6 rounded-lg border transition-all active:scale-95 disabled:opacity-50 text-sm
                                ${isOnline
                                    ? 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50'
                                    : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                                }`}
                        >
                            {loading ? 'Saving...' : vitalsId ? '💾 Update Vitals' : '💾 Save Vitals'}
                        </button>
                        <button onClick={() => setActiveTab(7)} className={`w-full sm:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>
                            Next: SOAP &amp; Actions &rarr;
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderTab7 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-3">VII. SOAP Note &amp; Actions</h3>

            <div className="mb-6"><label className={labelCls}>Assessment / Impression</label><textarea name="assessment" className="w-full bg-white border border-slate-200 rounded-lg p-4 h-32 md:h-40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm text-slate-800 resize-none" placeholder="Enter diagnosis or clinical impression..." value={formData.assessment} onChange={handleChange} /></div>
            <div className="mb-4"><label className={labelCls}>Plan / Remarks</label><textarea name="plan" className="w-full bg-white border border-slate-200 rounded-lg p-4 h-32 md:h-40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm text-slate-800 resize-none" placeholder="Enter treatment plan, medications, or notes..." value={formData.plan} onChange={handleChange} /></div>

            <div className="flex justify-end mb-8">
                <button onClick={() => setIsMedCertModalOpen(true)} disabled={!isSoapFilled} className={`w-full sm:w-auto flex justify-center items-center gap-2 font-semibold py-2.5 px-6 rounded-lg transition-all text-sm border active:scale-95 ${isSoapFilled ? 'bg-[#EBF3FF] text-blue-700 border-blue-200 hover:bg-blue-100 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'}`}>
                    📄 Generate Medical Certificate
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
                <button onClick={() => setIsLabOrderModalOpen(true)} className="w-full bg-white border border-slate-200 rounded-xl p-5 font-semibold text-slate-700 hover:border-blue-500 hover:bg-[#EBF3FF] hover:text-blue-700 text-left shadow-sm flex items-center gap-4 transition-all group active:scale-95">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📋</span> Lab Orders
                </button>
                <button onClick={() => setIsRxModalOpen(true)} className="w-full bg-white border border-slate-200 rounded-xl p-5 font-semibold text-slate-700 hover:border-blue-500 hover:bg-[#EBF3FF] hover:text-blue-700 text-left shadow-sm flex items-center gap-4 transition-all group active:scale-95">
                    <span className="text-2xl group-hover:scale-110 transition-transform">💊</span> E-Prescription
                </button>
                <button className="w-full bg-white border border-slate-200 rounded-xl p-5 font-semibold text-slate-700 hover:border-blue-500 hover:bg-[#EBF3FF] hover:text-blue-700 text-left shadow-sm flex items-center gap-4 transition-all group active:scale-95">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📊</span> Past Lab Results
                </button>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setActiveTab(6)} className="w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">&larr; Back</button>
                <button onClick={handleSendToPharmacy} disabled={loading} className={`w-full sm:w-auto text-white font-bold text-sm py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 ${primaryBtnBg}`}>
                    {loading ? 'Processing...' : 'Complete & Send to Pharmacy'}
                </button>
            </div>
        </div>
    );

    // ─── TABS CONFIG ─────────────────────────────────────────────────────────
    const tabs = [
        { id: 1, label: "1. Histories" },
        { id: 2, label: "2. OBGyne" },
        { id: 3, label: "3. Assessment" },
        { id: 4, label: "4. Follow-up" },
        { id: 5, label: "5. Clinical Notes" },
        { id: 6, label: "6. Physical Exam" },
        { id: 7, label: "7. SOAP & Actions" },
    ];

    // ─── MAIN RENDER ─────────────────────────────────────────────────────────
    return (
        <div className="flex w-full min-h-screen bg-[#F8FAFC] text-slate-800 overflow-x-hidden">

            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            <Sidebar
                activePage="consultation"
                doctorName={doctorName}
                doctorInitials={doctorInitials}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            <div className="flex-1 flex flex-col min-h-screen w-full md:pl-[240px] print:pl-0">

                {/* HEADER */}
                <header className="h-[64px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 print:hidden shadow-sm md:shadow-none">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <div>
                            <div className="font-bold text-lg text-slate-800 leading-tight">Consultation</div>
                            {patient && !patientLoading && (
                                <div className="text-xs text-slate-500 leading-tight">
                                    {patientFullName} · {patient.sex || '—'} · {patient.age ?? '—'} y/o
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors duration-300 ${!isOnline ? 'bg-amber-50 border-amber-200' : isSyncing ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                            <span className="relative flex h-2.5 w-2.5">
                                {isOnline && !isSyncing && (<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>)}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${!isOnline ? 'bg-amber-500' : isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></span>
                            </span>
                            <span className={`text-[0.65rem] font-extrabold uppercase tracking-widest ${!isOnline ? 'text-amber-700' : isSyncing ? 'text-blue-700' : 'text-green-700'}`}>
                                {!isOnline ? 'Offline Mode' : isSyncing ? 'Syncing...' : 'System Online'}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{doctorName}</div>
                            <div className="text-[0.7rem] text-slate-500">General Practitioner</div>
                        </div>
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md cursor-pointer">{doctorInitials}</div>
                    </div>
                </header>

                <OfflineBanner isOnline={isOnline} />

                <main className="w-full flex-1 p-4 md:p-8 print:p-0 flex justify-center">
                    <div className="w-full max-w-5xl">

                        {/* Patient info card — always visible above tabs */}
                        {renderPatientCard()}

                        {/* TAB NAVIGATION */}
                        <div className="flex gap-1 mb-8 border-b border-slate-200 print:hidden overflow-x-auto whitespace-nowrap w-full scrollbar-hide">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-3 text-sm font-bold rounded-t-xl transition-all border-b-2 flex-shrink-0 ${activeTab === tab.id ? 'text-blue-600 bg-white border-blue-600 shadow-[0_-4px_15px_rgba(0,0,0,0.03)]' : 'text-slate-400 border-transparent hover:bg-white hover:text-slate-600'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* TAB CONTENT */}
                        <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 print:hidden">
                            {activeTab === 1 && renderTab1()}
                            {activeTab === 2 && renderTab2()}
                            {activeTab === 3 && renderTab3()}
                            {activeTab === 4 && renderTab4()}
                            {activeTab === 5 && renderTab5()}
                            {activeTab === 6 && renderTab6()}
                            {activeTab === 7 && renderTab7()}
                        </div>

                    </div>
                </main>
            </div>

            {/* ═══════ MEDICAL CERTIFICATE MODAL ═══════ */}
            {isMedCertModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center md:p-4 print:absolute print:inset-0 print:bg-white print:block print:p-0 print:m-0">
                    <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:w-[800px] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:w-full print:max-w-full print:h-auto print:max-h-none print:shadow-none print:rounded-none print:overflow-visible print:border-none print:m-0 print:p-0">
                        <div className="flex justify-between items-center p-4 md:p-5 border-b border-slate-200 bg-white shrink-0 print:hidden shadow-sm z-10">
                            <h3 className="font-bold text-slate-800 text-lg">Medical Certificate Preview</h3>
                            <button onClick={() => setIsMedCertModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-red-500 text-2xl font-bold transition-colors">&times;</button>
                        </div>
                        <div className="p-6 md:p-12 flex-1 overflow-y-auto bg-white text-black flex flex-col print:p-0 print:overflow-visible print:min-h-[95vh]">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-black flex items-center justify-center text-center text-[0.5rem] md:text-[0.6rem] font-bold p-2 shrink-0">DOH LOGO</div>
                                <div className="text-center flex-1 px-2 md:px-4 leading-snug">
                                    <div className="text-[0.9rem] md:text-[1.1rem]">Republic of the Philippines</div>
                                    <div className="text-[0.9rem] md:text-[1.1rem]">Province of Batangas</div>
                                    <div className="text-[0.9rem] md:text-[1.1rem]">Municipality of Malvar</div>
                                    <div className="font-bold text-sm md:text-xl mt-2">OFFICE OF THE MUNICIPAL HEALTH OFFICER</div>
                                </div>
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-black flex items-center justify-center text-center text-[0.5rem] md:text-[0.6rem] font-bold p-2 shrink-0">MALVAR LOGO</div>
                            </div>
                            <hr className="border-t-[3px] border-black mb-8 shrink-0" />
                            <div className="text-center mb-6 shrink-0"><h1 className="text-xl md:text-3xl font-bold uppercase tracking-widest underline decoration-2 underline-offset-4">Medical Certificate</h1></div>
                            <div className="text-right mb-8 text-sm md:text-lg shrink-0">Date: <span className="font-semibold border-b border-black pb-0.5 px-4">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                            <div className="mb-10 text-sm md:text-[1.15rem] leading-[2rem] space-y-2 shrink-0">
                                <div className="flex flex-wrap gap-x-8 gap-y-2">
                                    <div className="flex-1 min-w-[200px] md:min-w-[300px]"><span className="font-bold mr-2">Name:</span><span className="font-bold uppercase border-b border-black px-4">{patientFullName}</span></div>
                                    <div><span className="font-bold mr-2">Age:</span><span className="font-bold border-b border-black px-4">{patient?.age ?? '—'}</span></div>
                                    <div><span className="font-bold mr-2">Sex:</span><span className="font-bold border-b border-black px-4">{patient?.sex || '—'}</span></div>
                                </div>
                                <div><span className="font-bold mr-2">Address:</span><span className="font-bold border-b border-black px-4">{patient?.address || '—'}</span></div>
                            </div>
                            <div className="flex-1 flex flex-col pl-2 md:pl-4 text-sm md:text-base">
                                <div><span className="font-bold text-base md:text-[1.15rem]">Impression:</span><div className="mt-2 md:mt-4 ml-4 md:ml-8 font-semibold whitespace-pre-wrap leading-relaxed">{formData.assessment}</div></div>
                                <div className="mt-6 md:mt-8"><span className="font-bold text-base md:text-[1.15rem]">Remarks:</span><div className="mt-2 md:mt-4 ml-4 md:ml-8 font-semibold whitespace-pre-wrap leading-relaxed">{formData.plan}</div></div>
                            </div>
                            <div className="mt-12 md:mt-auto pt-16 flex justify-end shrink-0">
                                <div className="text-center w-52 md:w-80">
                                    <div className="border-b-[2px] border-black mb-1 uppercase font-bold text-base md:text-xl truncate">{doctorName}, MD</div>
                                    <div className="text-[0.65rem] md:text-sm font-semibold">Municipal Health Officer / Attending Physician</div>
                                    <div className="text-[0.65rem] md:text-sm mt-1">License No: <span className="font-semibold">12345</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 md:p-5 border-t border-slate-200 bg-white shrink-0 flex flex-col sm:flex-row justify-end gap-3 print:hidden z-10">
                            <button onClick={() => setIsMedCertModalOpen(false)} className="w-full sm:w-auto px-5 py-3 rounded-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-sm order-2 sm:order-1 active:scale-95 transition-transform">Cancel</button>
                            <button onClick={() => window.print()} className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md text-sm order-1 sm:order-2 active:scale-95 transition-transform">Print Certificate</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ E-PRESCRIPTION MODAL ═══════ */}
            {isRxModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center md:p-4 print:absolute print:inset-0 print:bg-white print:block print:p-0 print:m-0">
                    <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:w-[800px] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:w-full print:max-w-full print:h-auto print:max-h-none print:shadow-none print:rounded-none print:overflow-visible print:border-none print:m-0 print:p-0">
                        <div className="flex justify-between items-center p-4 md:p-5 border-b border-slate-200 bg-white shrink-0 print:hidden shadow-sm z-10">
                            <h3 className="font-bold text-slate-800 text-lg">E-Prescription Preview</h3>
                            <button onClick={() => setIsRxModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-red-500 text-2xl font-bold transition-colors">&times;</button>
                        </div>
                        <div className="p-6 md:p-12 flex-1 overflow-y-auto bg-white text-black flex flex-col print:p-0 print:overflow-visible print:min-h-[95vh]">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-black flex items-center justify-center text-center text-[0.5rem] md:text-[0.6rem] font-bold p-2 shrink-0">DOH LOGO</div>
                                <div className="text-center flex-1 px-2 md:px-4 leading-snug">
                                    <div className="text-[0.9rem] md:text-[1.1rem]">Republic of the Philippines</div>
                                    <div className="text-[0.9rem] md:text-[1.1rem]">Province of Batangas</div>
                                    <div className="text-[0.9rem] md:text-[1.1rem]">Municipality of Malvar</div>
                                    <div className="font-bold text-sm md:text-xl mt-2">OFFICE OF THE MUNICIPAL HEALTH OFFICER</div>
                                </div>
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-black flex items-center justify-center text-center text-[0.5rem] md:text-[0.6rem] font-bold p-2 shrink-0">MALVAR LOGO</div>
                            </div>
                            <hr className="border-t-[3px] border-black mb-8 shrink-0" />
                            <div className="text-center mb-6 shrink-0"><h1 className="text-xl md:text-3xl font-bold uppercase tracking-widest underline decoration-2 underline-offset-4">Medical Prescription</h1></div>
                            <div className="text-right mb-8 text-sm md:text-lg shrink-0">Date: <span className="font-semibold border-b border-black pb-0.5 px-4">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                            <div className="mb-6 md:mb-10 text-sm md:text-[1.15rem] leading-[2rem] space-y-2 shrink-0">
                                <div className="flex flex-wrap gap-x-8 gap-y-2">
                                    <div className="flex-1 min-w-[200px] md:min-w-[300px]"><span className="font-bold mr-2">Name:</span><span className="font-bold uppercase border-b border-black px-4">{patientFullName}</span></div>
                                    <div><span className="font-bold mr-2">Age:</span><span className="font-bold border-b border-black px-4">{patient?.age ?? '—'}</span></div>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col pl-2 md:pl-4">
                                <div className="text-5xl md:text-7xl font-bold text-slate-900 mb-4 md:mb-8 tracking-tighter shrink-0">Rx</div>
                                <textarea name="rxDetails" className="flex-1 w-full bg-white border border-slate-200 rounded-xl p-4 print:hidden text-base md:text-lg text-slate-800 resize-none ml-0 md:ml-8 min-h-[150px] focus:border-blue-500 focus:ring-1 outline-none" placeholder="Enter prescribed medicines..." value={formData.rxDetails} onChange={handleChange} />
                                <div className="hidden print:block whitespace-pre-wrap text-[1.15rem] font-bold leading-relaxed ml-8">{formData.rxDetails}</div>
                            </div>
                            <div className="mt-12 md:mt-auto pt-16 flex justify-end shrink-0">
                                <div className="text-center w-52 md:w-80">
                                    <div className="border-b-[2px] border-black mb-1 uppercase font-bold text-base md:text-xl truncate">{doctorName}, MD</div>
                                    <div className="text-[0.65rem] md:text-sm font-semibold">Municipal Health Officer / Attending Physician</div>
                                    <div className="text-[0.65rem] md:text-sm mt-1">License No: <span className="font-semibold">12345</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 md:p-5 border-t border-slate-200 bg-white shrink-0 flex flex-col sm:flex-row justify-end gap-3 print:hidden z-10">
                            <button onClick={() => setIsRxModalOpen(false)} className="w-full sm:w-auto px-5 py-3 rounded-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-sm order-2 sm:order-1 active:scale-95 transition-transform">Cancel</button>
                            <button onClick={() => window.print()} className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md text-sm order-1 sm:order-2 active:scale-95 transition-transform">Print Prescription</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ LAB ORDERS MODAL ═══════ */}
            {isLabOrderModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center md:p-4 print:absolute print:inset-0 print:bg-white print:block print:p-0 print:m-0">
                    <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:w-[800px] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:w-full print:max-w-full print:h-auto print:max-h-none print:shadow-none print:rounded-none print:overflow-visible print:border-none print:m-0 print:p-0">
                        <div className="flex justify-between items-center p-4 md:p-5 border-b border-slate-200 bg-white shrink-0 print:hidden shadow-sm z-10">
                            <h3 className="font-bold text-slate-800 text-lg">Laboratory Order Preview</h3>
                            <button onClick={() => setIsLabOrderModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-red-500 text-2xl font-bold transition-colors">&times;</button>
                        </div>
                        <div className="p-6 md:p-12 flex-1 overflow-y-auto bg-white text-black flex flex-col print:p-0 print:overflow-visible print:min-h-[95vh]">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-black flex items-center justify-center text-center text-[0.5rem] md:text-[0.6rem] font-bold p-2 shrink-0">DOH LOGO</div>
                                <div className="text-center flex-1 px-2 md:px-4 leading-snug">
                                    <div className="text-[0.9rem] md:text-[1.1rem]">Republic of the Philippines</div>
                                    <div className="text-[0.9rem] md:text-[1.1rem]">Province of Batangas</div>
                                    <div className="text-[0.9rem] md:text-[1.1rem]">Municipality of Malvar</div>
                                    <div className="font-bold text-sm md:text-xl mt-2">OFFICE OF THE MUNICIPAL HEALTH OFFICER</div>
                                </div>
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-black flex items-center justify-center text-center text-[0.5rem] md:text-[0.6rem] font-bold p-2 shrink-0">MALVAR LOGO</div>
                            </div>
                            <hr className="border-t-[3px] border-black mb-8 shrink-0" />
                            <div className="text-center mb-6 shrink-0"><h1 className="text-xl md:text-3xl font-bold uppercase tracking-widest underline decoration-2 underline-offset-4">Laboratory Order</h1></div>
                            <div className="flex-1 flex flex-col px-0 md:px-4">
                                <p className="font-bold text-sm md:text-[1.15rem] mb-6 tracking-wide">Please perform the following laboratory test/s:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 sm:gap-y-3 gap-x-12 text-sm md:text-[1.15rem]">
                                    <div className="space-y-1 sm:space-y-3">
                                        {renderCheckbox('cbc', 'CBC')}
                                        {renderCheckbox('urinalysis', 'Urinalysis')}
                                        {renderCheckbox('fecalysis', 'Fecalysis')}
                                        {renderCheckbox('bloodTyping', 'Blood Typing')}
                                        {renderCheckbox('fbs', 'Fasting Blood Sugar')}
                                        {renderCheckbox('lipidProfile', 'Lipid Profile')}
                                    </div>
                                    <div className="space-y-1 sm:space-y-3">
                                        {renderCheckbox('hba1c', 'HBA1c')}
                                        {renderCheckbox('creatinine', 'Creatinine')}
                                        {renderCheckbox('sgpt', 'SGPT')}
                                        {renderCheckbox('uricAcid', 'Uric Acid')}
                                        {renderCheckbox('chestXray', 'Chest X-ray')}
                                        {renderCheckbox('ecg', 'ECG')}
                                    </div>
                                    <div className="col-span-1 sm:col-span-2 mt-4 pt-4 border-t border-slate-200 print:border-transparent flex flex-col sm:flex-row sm:items-center gap-3">
                                        {renderCheckbox('others', 'Others:')}
                                        <input
                                            type="text"
                                            name="labTestsOther"
                                            value={formData.labTestsOther}
                                            onChange={handleChange}
                                            disabled={!formData.labTests.others}
                                            className="w-full sm:flex-1 bg-transparent border-b-2 border-slate-300 print:border-black focus:outline-none focus:border-blue-600 px-2 py-2 text-slate-900 print:text-black font-semibold disabled:opacity-30 disabled:print:opacity-0 min-h-[44px]"
                                            placeholder={formData.labTests.others ? "Specify test here..." : ""}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-12 md:mt-auto pt-16 flex justify-end shrink-0">
                                <div className="text-center w-52 md:w-80">
                                    <div className="border-b-[2px] border-black mb-1 uppercase font-bold text-base md:text-xl truncate">{doctorName}, MD</div>
                                    <div className="text-[0.65rem] md:text-sm font-semibold">Municipal Health Officer / Attending Physician</div>
                                    <div className="text-[0.65rem] md:text-sm mt-1">License No: <span className="font-semibold">12345</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 md:p-5 border-t border-slate-200 bg-white shrink-0 flex flex-col sm:flex-row justify-end gap-3 print:hidden z-10">
                            <button onClick={() => setIsLabOrderModalOpen(false)} className="w-full sm:w-auto px-5 py-3 rounded-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-sm order-2 sm:order-1 active:scale-95 transition-transform">Cancel</button>
                            <button onClick={handleSaveAndPrintLabOrder} disabled={loading} className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md text-sm disabled:opacity-50 order-1 sm:order-2 active:scale-95 transition-transform">
                                {loading ? 'Sending...' : 'Print & Send Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<ConsultationPage />);
}