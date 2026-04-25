import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../shared/supabase';
import { useToast } from './components/Toast';

// ─── ✨ GLASSMORPHISM Tailwind Classes ✨ ────────────────────────────────────
const inputClasses = "w-full border border-white/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-white/80 outline-none bg-white/30 hover:bg-white/40 focus:bg-white/60 backdrop-blur-md transition-all text-slate-800 placeholder:text-slate-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]";
const labelClasses = "block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5 drop-shadow-sm";
const fieldsetClasses = "bg-white/30 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/60 mb-6 overflow-hidden";
const legendClasses = "w-full px-6 py-4 border-b border-white/40 text-sm font-extrabold text-slate-800 uppercase tracking-wider bg-white/20 flex items-center gap-2";

// ─── Types ────────────────────────────────────────────────────────────────────
interface InitialConsultationData {
    dateOfConsultation: string; consultationTime: string; referredBy: string;
    modeOfTransaction: string; modeOfTransfer: string; chiefComplaints: string;
    diagnosis: string; diagnosisOther: string; historyOfPresentIllness: string;
    bp: string; hr: string; rr: string; temp: string; weight: string; height: string;
    o2Sat: string; muac: string; nutritionalStatus: string; bmi: string;
    visualAcuityLeft: string; visualAcuityRight: string; bloodType: string;
    generalSurvey: string;
}

// ─── Helper: get current date (YYYY-MM-DD) and time (HH:MM) ─────────────────
const getCurrentDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const makeEmptyForm = (): InitialConsultationData => ({
    dateOfConsultation: getCurrentDate(),
    consultationTime: getCurrentTime(),
    referredBy: '',
    modeOfTransaction: '', modeOfTransfer: '', chiefComplaints: '',
    diagnosis: '', diagnosisOther: '', historyOfPresentIllness: '',
    bp: '', hr: '', rr: '', temp: '', weight: '', height: '',
    o2Sat: '', muac: '', nutritionalStatus: '', bmi: '',
    visualAcuityLeft: '', visualAcuityRight: '', bloodType: '', generalSurvey: '',
});

const DIAGNOSIS_OPTIONS = [
    'Common Cold', 'Pneumonia', 'High Blood Pressure', 'Diabetes', 'Asthma',
    'Dengue', 'Fever', 'Diarrhea', 'UTI', 'Tuberculosis', 'High Cholesterol',
    'Heart Disease', 'Stroke', 'Acid Reflux', 'Arthritis', 'Others',
];

const VITAL_FIELDS: {
    label: string; name: keyof InitialConsultationData; type: string; placeholder?: string; readOnly?: boolean; step?: string; allowedPattern?: RegExp;
}[] = [
    { label: 'BP (mmHg)',        name: 'bp',               type: 'text',   placeholder: '120/80', allowedPattern: /^[\d/]*$/ },
    { label: 'Heart Rate (bpm)', name: 'hr',               type: 'number' },
    { label: 'Resp. Rate (cpm)', name: 'rr',               type: 'number' },
    { label: 'Temp (°C)',        name: 'temp',             type: 'number', step: '0.1' },
    { label: 'O2 Sat (%)',       name: 'o2Sat',            type: 'number' },
    { label: 'Weight (kg)',      name: 'weight',           type: 'number', step: '0.1' },
    { label: 'Height (cm)',      name: 'height',           type: 'number', step: '0.1' },
    { label: 'BMI',              name: 'bmi',              type: 'text',   readOnly: true },
    { label: 'MUAC',             name: 'muac',             type: 'text',   allowedPattern: /^[\d.]*$/ },
    { label: 'Nutrition Status', name: 'nutritionalStatus', type: 'text',  readOnly: true },
    { label: 'Vis. Acuity (L)', name: 'visualAcuityLeft',  type: 'text',  placeholder: '20/20', allowedPattern: /^[\d/]*$/ },
    { label: 'Vis. Acuity (R)', name: 'visualAcuityRight', type: 'text',  placeholder: '20/20', allowedPattern: /^[\d/]*$/ },
    { label: 'Blood Type',       name: 'bloodType',        type: 'text',  placeholder: 'O+', readOnly: true },
];

const toNumberOrNull = (val: string) => {
    if (!val || val.trim() === '') return null;
    const parsed = Number(val);
    return isNaN(parsed) ? null : parsed;
};

const computeBmi = (weight: string, height: string) => {
    const weightKg = parseFloat(weight);
    const heightCm = parseFloat(height);
    if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return '';
    const heightM = heightCm / 100;
    return (weightKg / (heightM * heightM)).toFixed(1);
};

const getNutritionalStatus = (bmi: string) => {
    const bmiValue = parseFloat(bmi);
    if (!bmi || isNaN(bmiValue)) return '';
    if (bmiValue < 16) return 'Severely Underweight';
    if (bmiValue < 18.5) return 'Underweight';
    if (bmiValue < 25) return 'Normal';
    if (bmiValue < 30) return 'Overweight';
    if (bmiValue < 40) return 'Obese';
    return 'Morbidly Obese';
};

export function ConsultationComponent() {
    const [formData, setFormData] = useState<InitialConsultationData>(makeEmptyForm());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
    const [patientName, setPatientName] = useState('');
    const [patientInfo, setPatientInfo] = useState<any>(null);

    // New states for Patient Search
    const [searchQuery, setSearchQuery] = useState('');
    const [consentedPatients, setConsentedPatients] = useState<any[]>([]);

    const { showToast, ToastComponent } = useToast();
    const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        };
    }, []);

    // Load Consented Patients for the search feature
    useEffect(() => {
        const fetchConsentedPatients = async () => {
            const { data, error } = await supabase
                .from('patients')
                .select(`
                    id, firstName, middleName, lastName, age, sex, bloodType,
                    patient_consent ( consent_id )
                `)
                .order('lastName', { ascending: true });

            if (!error && data) {
                const consentedOnly = data.filter((p: any) =>
                    Array.isArray(p.patient_consent) ? p.patient_consent.length > 0 : p.patient_consent !== null
                );
                setConsentedPatients(consentedOnly);
            }
        };
        fetchConsentedPatients();
    }, []);

    const loadPatientDetails = async (id: string) => {
        setCurrentPatientId(id);
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (data) {
            setPatientName(`${data.lastName}, ${data.firstName} ${data.middleName || ''}`.trim());
            setPatientInfo(data);
            setFormData(prev => ({ ...prev, bloodType: data.bloodType || '' }));
        } else if (error) {
            console.error("Error fetching patient:", error);
            setPatientName('Error loading patient data');
        }
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) {
            loadPatientDetails(id);
        } else {
            setPatientName('No Patient Selected');
        }
    }, []);

    useEffect(() => {
        const bmi = computeBmi(formData.weight, formData.height);
        const nutritionalStatus = getNutritionalStatus(bmi);
        setFormData(prev => {
            if (prev.bmi === bmi && prev.nutritionalStatus === nutritionalStatus) return prev;
            return { ...prev, bmi, nutritionalStatus };
        });
    }, [formData.weight, formData.height]);



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectPatient = (id: string) => {
        window.history.pushState({}, '', `?id=${id}`);
        loadPatientDetails(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPatientId) {
            showToast('No patient ID found.', true);
            return;
        }

        setIsSubmitting(true);
        try {
            const resolvedDiagnosis = formData.diagnosis === 'Others' ? (formData.diagnosisOther.trim() || 'Others') : formData.diagnosis;

            const { data: consData, error: e1 } = await supabase
                .from('initial_consultation')
                .insert([{
                    patient_id: currentPatientId,
                    consultation_date: formData.dateOfConsultation || null,
                    consultation_time: formData.consultationTime || null,
                    mode_of_transaction: formData.modeOfTransaction || null,
                    referred_by: formData.referredBy || null,
                    mode_of_transfer: formData.modeOfTransfer || null,
                    chief_complaint: formData.chiefComplaints || null,
                    diagnosis: resolvedDiagnosis || null,
                }])
                .select('initialconsultation_id')
                .single();

            if (e1) throw new Error('initial_consultation: ' + e1.message);

            const { error: e2 } = await supabase.from('vital_sign').insert([{
                patient_id: currentPatientId,
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

            if (e2) {
                if (consData?.initialconsultation_id) {
                    await supabase.from('initial_consultation').delete().eq('initialconsultation_id', consData.initialconsultation_id);
                }
                throw new Error('vital_sign: ' + e2.message);
            }

            showToast('Consultation record saved successfully!', false);
            // Reset form but keep blood type and refresh date/time for next entry
            setFormData({ ...makeEmptyForm(), bloodType: formData.bloodType });

            redirectTimerRef.current = setTimeout(() => {
                window.location.href = '/pages/nurse.html';
            }, 1500);
        } catch (err: any) {
            console.error(err);
            showToast('Failed to save: ' + err.message, true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredPatients = consentedPatients.filter(p =>
        `${p.firstName} ${p.middleName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full max-w-5xl mx-auto relative pb-12">
            <ToastComponent />

            <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">📋 Initial Consultation</h1>
                    {patientInfo ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span className="font-bold text-blue-800 bg-blue-100/50 border border-blue-200 px-3 py-1 rounded-lg backdrop-blur-sm shadow-sm">{patientName}</span>
                            <span className="bg-white/40 border border-white/60 px-3 py-1 rounded-lg backdrop-blur-md shadow-sm">👤 {patientInfo.sex || 'N/A'}</span>
                            <span className="bg-white/40 border border-white/60 px-3 py-1 rounded-lg backdrop-blur-md shadow-sm">🎂 {patientInfo.age ?? 'N/A'} yrs</span>
                            <span className="bg-white/40 border border-white/60 px-3 py-1 rounded-lg backdrop-blur-md shadow-sm">🩸 {patientInfo.bloodType || 'N/A'}</span>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 mt-2">Search and select a consented patient to begin.</p>
                    )}
                </div>

                {currentPatientId && (
                    <button onClick={() => { setCurrentPatientId(null); setPatientInfo(null); window.history.pushState({}, '', '?'); }} className="flex items-center gap-2 bg-white/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/60 shadow-sm shrink-0 text-sm font-bold text-slate-600 hover:bg-white/60 transition-colors">
                        🔍 Search Another
                    </button>
                )}
            </div>

            {!currentPatientId ? (
                <div className="w-full bg-white/30 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]">
                    <div className="max-w-xl mx-auto">
                        <div className="relative mb-6">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
                            <input 
                                type="text" 
                                placeholder="Search consented patients by name..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-white/80 bg-white/40 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] text-slate-800 font-medium"
                                autoFocus
                            />
                        </div>

                        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                            {filteredPatients.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 font-medium bg-white/20 rounded-xl border border-white/40">No consented patients found.</div>
                            ) : (
                                filteredPatients.map(p => (
                                    <div 
                                        key={p.id}
                                        onClick={() => handleSelectPatient(p.id)}
                                        className="flex items-center gap-4 p-4 bg-white/40 hover:bg-white/60 border border-white/50 hover:border-blue-300 rounded-xl cursor-pointer transition-all shadow-sm group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            {(p.firstName?.[0] || '').toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-800">{p.lastName}, {p.firstName} {p.middleName || ''}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{p.sex || '—'} • {p.age ?? '—'} yrs • 🩸 {p.bloodType || '—'}</div>
                                        </div>
                                        <span className="text-slate-300 group-hover:text-blue-500 font-bold group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <fieldset className={fieldsetClasses}>
                        <div className={legendClasses}><span className="text-blue-600">①</span> General Information</div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                <div><label className={labelClasses}>Date of Consultation</label><input type="date" name="dateOfConsultation" value={formData.dateOfConsultation} onChange={handleChange} className={inputClasses} required /></div>
                                <div><label className={labelClasses}>Consultation Time</label><input type="time" name="consultationTime" value={formData.consultationTime} onChange={handleChange} className={inputClasses} /></div>
                                <div><label className={labelClasses}>Referred From / By</label><input type="text" name="referredBy" value={formData.referredBy} onChange={handleChange} className={inputClasses} placeholder="Name or Department" /></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-6">
                                <div>
                                    <label className={labelClasses}>Mode of Transaction</label>
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        {['Walk in', 'Referral'].map(v => (
                                            <label key={v} className={`cursor-pointer px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${formData.modeOfTransaction === v ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600 shadow-sm' : 'border-white/50 bg-white/30 text-slate-600 hover:bg-white/50 backdrop-blur-sm'}`}>
                                                <input type="radio" name="modeOfTransaction" value={v} onChange={handleRadioChange} checked={formData.modeOfTransaction === v} className="hidden" />{v}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClasses}>Mode of Transfer</label>
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        {['Ambulatory', 'Via Wheelchair'].map(v => (
                                            <label key={v} className={`cursor-pointer px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${formData.modeOfTransfer === v ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600 shadow-sm' : 'border-white/50 bg-white/30 text-slate-600 hover:bg-white/50 backdrop-blur-sm'}`}>
                                                <input type="radio" name="modeOfTransfer" value={v} onChange={handleRadioChange} checked={formData.modeOfTransfer === v} className="hidden" />{v}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className={fieldsetClasses}>
                        <div className={legendClasses}><span className="text-pink-600">②</span> Clinical Notes</div>
                        <div className="p-6 flex flex-col gap-5">
                            <div>
                                <label className={labelClasses}>Chief Complaints</label>
                                <textarea name="chiefComplaints" value={formData.chiefComplaints} onChange={handleChange} rows={3} className={`${inputClasses} resize-y min-h-[80px]`} placeholder="Describe the patient's primary symptoms..."></textarea>
                            </div>
                            <div>
                                <label className={labelClasses}>Diagnosis</label>
                                <select name="diagnosis" value={formData.diagnosis} onChange={handleChange} className={inputClasses}>
                                    <option value="">— Select a diagnosis —</option>
                                    {DIAGNOSIS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                {formData.diagnosis === 'Others' && (
                                    <div className="mt-3"><input type="text" name="diagnosisOther" value={formData.diagnosisOther} onChange={handleChange} className={inputClasses} placeholder="Please specify diagnosis..." autoFocus /></div>
                                )}
                            </div>
                            <div>
                                <label className={labelClasses}>History of Present Illnesses</label>
                                <textarea name="historyOfPresentIllness" value={formData.historyOfPresentIllness} onChange={handleChange} rows={3} className={`${inputClasses} resize-y min-h-[80px]`} placeholder="Relevant medical history leading up to today..."></textarea>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className={fieldsetClasses}>
                        <div className={legendClasses}><span className="text-green-600">③</span> Physical Examination & Vital Signs</div>
                        <div className="p-6 bg-slate-50/10">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                {VITAL_FIELDS.map(f => (
                                    <div key={f.name} className="bg-white/40 backdrop-blur-md p-3 rounded-xl border border-white/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]">
                                        <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5 drop-shadow-sm">{f.label}</label>
                                        <input
                                            type={f.type} name={f.name} value={formData[f.name]} onChange={handleChange} readOnly={f.readOnly || false} step={f.step} placeholder={f.placeholder || ''}
                                            onKeyDown={f.type === 'number' ? (e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); } : undefined}
                                            onBeforeInput={f.allowedPattern ? (e: any) => { if (e.data && !f.allowedPattern!.test(e.data)) e.preventDefault(); } : undefined}
                                            onPaste={f.allowedPattern ? (e) => { const pasted = e.clipboardData.getData('text'); if (!f.allowedPattern!.test(pasted)) e.preventDefault(); } : undefined}
                                            className={`w-full border border-white/40 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/30 focus:border-white/80 outline-none transition-all ${f.readOnly ? 'bg-slate-100/50 text-slate-500 cursor-not-allowed shadow-none' : 'bg-white/50 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]'}`}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/40">
                                <label className={labelClasses}>General Survey Status</label>
                                <div className="flex flex-wrap gap-3 mt-3">
                                    {['Awake and Alert', 'Altered Sensorium'].map(v => (
                                        <label key={v} className={`cursor-pointer px-4 py-3 border rounded-xl text-sm font-semibold transition-all ${formData.generalSurvey === v ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600 shadow-sm' : 'border-white/50 bg-white/30 text-slate-600 hover:bg-white/50 backdrop-blur-sm'}`}>
                                            <input type="radio" name="generalSurvey" value={v} onChange={handleRadioChange} checked={formData.generalSurvey === v} className="hidden" />{v}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-6 mb-12 border-t border-slate-200 pt-6">
                        <button type="submit" disabled={isSubmitting} className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-lg text-sm transition-all ${isSubmitting ? 'bg-blue-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-blue-500/30'}`}>
                            {isSubmitting ? '⏳ Saving Record...' : '💾 Save Consultation Record'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}