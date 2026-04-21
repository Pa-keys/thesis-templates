import React, { useState, useEffect, useRef, useMemo } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../shared/supabase';
import { useNetworkSync, saveToIndexedDB, initIndexedDB } from '../shared/useNetworkSync';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface ConsultationPageProps {
    doctorName: string;
    doctorInitials?: string;
    patientIdProp?: string | null;
    icidProp?: string | null;
    onBack?: () => void;
}

interface PatientData {
    id: string; firstName: string; lastName: string; middleName?: string;
    age: number | null; sex: string; bloodType: string; address?: string; contactNumber?: string;
}

interface Medication { name: string; dosage: string; frequency: string; duration: string; quantity: string; }

interface ConsultationRecord {
    consultation_id: number; chief_complaints?: string; diagnosis?: string;
    hpi?: string; family_history?: string; medication_treatment?: string; attending_provider?: string;
}

interface InitialConsultationRecord {
    initialconsultation_id: number; consultation_date?: string; consultation_time?: string;
    mode_of_transaction?: string; referred_by?: string; mode_of_transfer?: string;
    chief_complaint?: string; diagnosis?: string;
}

const toNumberOrNull = (val: string | undefined | null): number | null => {
    if (val === undefined || val === null || val.trim() === '') return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
};

// ─── History Panel Sub-Component ──────────────────────────────────────────────
function HistoryPanel({ patientId, patientName, onClose }: { patientId: string; patientName: string; onClose: () => void; }) {
    const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
    const [initialConsults, setInitialConsults] = useState<InitialConsultationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'all' | 'consultation' | 'initial'>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchHistory() {
            setLoading(true);
            const parsedId = parseInt(patientId);
            const numericId = isNaN(parsedId) ? patientId : parsedId;

            const [cRes, iRes] = await Promise.all([
                supabase.from('consultation').select('consultation_id, chief_complaints, diagnosis, hpi, family_history, medication_treatment, attending_provider').eq('patient_id', numericId).order('consultation_id', { ascending: false }),
                supabase.from('initial_consultation').select('initialconsultation_id, consultation_date, consultation_time, mode_of_transaction, referred_by, mode_of_transfer, chief_complaint, diagnosis').eq('patient_id', numericId).order('initialconsultation_id', { ascending: false }),
            ]);

            if (cRes.data) setConsultations(cRes.data);
            if (iRes.data) setInitialConsults(iRes.data as InitialConsultationRecord[]);
            setLoading(false);
        }
        fetchHistory();
    }, [patientId]);

    const formatDate = (str?: string) => {
        if (!str) return '—';
        const d = new Date(str);
        return isNaN(d.getTime()) ? str : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

    const sectionBtn = (label: string, key: typeof activeSection, count: number) => (
        <button onClick={() => setActiveSection(key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSection === key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {label} <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeSection === key ? 'bg-blue-500' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
        </button>
    );

    const RecordCard = ({ id, badge, badgeColor, date, title, subtitle, children }: any) => (
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-2">
            <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left">
                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${badgeColor}`}>{badge}</span>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{title}</div>
                    {subtitle && <div className="text-xs text-slate-400 truncate">{subtitle}</div>}
                </div>
                <span className="shrink-0 text-xs text-slate-400 font-medium">{date}</span>
                <span className="shrink-0 text-slate-400 ml-1">{expandedId === id ? '▲' : '▼'}</span>
            </button>
            {expandedId === id && <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-3">{children}</div>}
        </div>
    );

    const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
        value ? <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</div><div className="text-sm text-slate-700">{value}</div></div> : null
    );

    const totalCount = consultations.length + initialConsults.length;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white shrink-0">
                    <div>
                        <div className="font-bold text-slate-900 text-base">Patient History</div>
                        <div className="text-xs text-slate-500">{patientName} · {totalCount} record{totalCount !== 1 ? 's' : ''}</div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 font-bold text-lg transition-colors">✕</button>
                </div>
                <div className="flex gap-2 px-5 py-3 border-b border-slate-100 bg-white shrink-0 flex-wrap">
                    {sectionBtn('All', 'all', totalCount)}
                    {sectionBtn('Consultations', 'consultation', consultations.length)}
                    {sectionBtn('Initial', 'initial', initialConsults.length)}
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3"><span className="text-sm text-slate-400">Loading records...</span></div>
                    ) : totalCount === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2"><span className="text-3xl">📭</span><span className="text-sm text-slate-400">No history records found.</span></div>
                    ) : (
                        <>
                            {(activeSection === 'all' || activeSection === 'initial') && initialConsults.map((rec) => (
                                <RecordCard key={`initial-${rec.initialconsultation_id}`} id={`initial-${rec.initialconsultation_id}`} badge="Initial" badgeColor="bg-purple-100 text-purple-700" date={formatDate(rec.consultation_date)} title={rec.chief_complaint || 'Initial Consultation'} subtitle={rec.diagnosis}>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        <Field label="Date" value={formatDate(rec.consultation_date)} /><Field label="Time" value={rec.consultation_time} />
                                        <Field label="Chief Complaint" value={rec.chief_complaint} /><Field label="Diagnosis" value={rec.diagnosis} />
                                        <Field label="Mode of Transaction" value={rec.mode_of_transaction} /><Field label="Mode of Transfer" value={rec.mode_of_transfer} />
                                        <Field label="Referred By" value={rec.referred_by} />
                                    </div>
                                </RecordCard>
                            ))}
                            {(activeSection === 'all' || activeSection === 'consultation') && consultations.map((rec) => (
                                <RecordCard key={`consult-${rec.consultation_id}`} id={`consult-${rec.consultation_id}`} badge="Consult" badgeColor="bg-blue-100 text-blue-700" date={`#${rec.consultation_id}`} title={rec.chief_complaints || `Consultation #${rec.consultation_id}`} subtitle={rec.diagnosis}>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        <Field label="Chief Complaints" value={rec.chief_complaints} /><Field label="Diagnosis" value={rec.diagnosis} />
                                        <Field label="HPI" value={rec.hpi} /><Field label="Attending Provider" value={rec.attending_provider} />
                                    </div>
                                </RecordCard>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Exported Pure Component ──────────────────────────────────────────────────
// Notice the named export matches the expected structure.
export function ConsultationPage({ 
    doctorName, 
    doctorInitials = 'D', 
    patientIdProp, 
    icidProp, 
    onBack 
}: ConsultationPageProps) {
    
    // Support SPA props or fallback to direct URL params
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = patientIdProp || urlParams.get('id');
    const icidFromUrl = icidProp || urlParams.get('icid');

    const [formData, setFormData] = useState({
        familyHistory: '', immunizationHistory: '', smoking: '', smokingSticksPerDay: '', smokingYears: '',
        drinking: '', drinkingFrequency: '', drinkingYears: '', menarche: '', onsetSexualIntercourse: '',
        menopause: '', menopauseAge: '', lmp: '', intervalCycle: '', periodDuration: '', padsPerDay: '',
        birthControlMethod: '', gravidity: '', parity: '', typeOfDelivery: '', fullTerm: '', premature: '',
        abortion: '', livingChildren: '', preEclampsia: '', medicationAndTreatment: '',
        
        followUpDate: new Date().toISOString().split('T')[0], followUpTime: '', followUpModeOfTx: 'Walk-in',
        followUpModeOfTransfer: 'Ambulatory', followUpChiefComplaint: '', followUpDiagnosis: '', followUpHpi: '',
        followUpBp: '', followUpHr: '', followUpRr: '', followUpTemp: '', followUpO2: '', followUpWeight: '',
        followUpHeight: '', followUpMuac: '', followUpNutritionalStatus: '', followUpBmi: '', followUpVaL: '',
        followUpVaR: '', followUpBloodType: '', followUpGenSurvey: '', managementTreatment: '', followUpLabResults: '',
        attendingProvider: '', chiefComplaints: '', diagnosis: '', hpi: '',
        
        bp: '', hr: '', rr: '', temp: '', weight: '', height: '', o2Saturation: '', muac: '',
        nutritionalStatus: '', bmi: '', visualAcuityLeft: '', visualAcuityRight: '',
        
        labTests: {
            cbc: false, cbcPlatelet: false, hgbHct: false, chestXray: false, ultrasound: false, urinalysis: false, 
            fecalysis: false, sputum: false, rbs: false, fbs: false, uricAcid: false, cholesterol: false,
            hba1c: false, bloodTyping: false, creatinine: false, sgpt: false, lipidProfile: false, ecg: false, others: false,
        },
        labTestsOther: '', labChiefComplaint: '', labRequestedBy: '', rxLicNo: '', rxPtrNo: '',
    });

    const followUpBmiInfo = useMemo(() => {
        const w = parseFloat(formData.followUpWeight || '0');
        const h = parseFloat(formData.followUpHeight || '0');
        if (w > 0 && h > 0) {
            const bmiValue = parseFloat((w / ((h / 100) * (h / 100))).toFixed(1));
            let status = 'Normal'; let color = 'text-emerald-600';
            if (bmiValue < 18.5) { status = 'Underweight'; color = 'text-amber-500'; }
            else if (bmiValue >= 25 && bmiValue < 29.9) { status = 'Overweight'; color = 'text-orange-500'; }
            else if (bmiValue >= 30) { status = 'Obese'; color = 'text-red-500'; }
            return { value: bmiValue.toString(), status, color };
        }
        return null;
    }, [formData.followUpWeight, formData.followUpHeight]);

    const vitalsBmiInfo = useMemo(() => {
        const w = parseFloat(formData.weight || '0');
        const h = parseFloat(formData.height || '0');
        if (w > 0 && h > 0) {
            const bmiValue = parseFloat((w / ((h / 100) * (h / 100))).toFixed(1));
            let status = 'Normal';
            if (bmiValue < 18.5) status = 'Underweight';
            else if (bmiValue >= 25 && bmiValue < 29.9) status = 'Overweight';
            else if (bmiValue >= 30) status = 'Obese';
            return { value: bmiValue.toString(), status };
        }
        return null;
    }, [formData.weight, formData.height]);

    const [medications, setMedications] = useState<Medication[]>([{ name: '', dosage: '', frequency: '', duration: '', quantity: '' }]);
    const [consultationSaved, setConsultationSaved] = useState(false);
    const [followUpDone, setFollowUpDone] = useState(false);
    const sigCanvas = useRef<SignatureCanvas | null>(null);
    const followUpSigCanvas = useRef<SignatureCanvas | null>(null);

    const [activeTab, setActiveTab] = useState(1);
    const [patient, setPatient] = useState<PatientData | null>(null);
    const [patientLoading, setPatientLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [consultationId, setConsultationId] = useState<number | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const { isOnline, isSyncing } = useNetworkSync();
    const primaryBtnBg = isOnline ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20';

    const [vitalsId, setVitalsId] = useState<number | null>(null);
    const [vitalsLoading, setVitalsLoading] = useState(false);

    useEffect(() => {
        initIndexedDB('MediSensDB', 'offline_patients');

        // Dynamically set attending provider from the Prop passed by Doctor.tsx
        setFormData(prev => ({ 
            ...prev, 
            attendingProvider: doctorName, 
            labRequestedBy: doctorName 
        }));

        const loadPatient = async () => {
            if (!patientId) { setPatientLoading(false); return; }

            const { data, error } = await supabase
                .from('patients')
                .select('id, firstName, lastName, middleName, age, sex, bloodType, address, contactNumber')
                .eq('id', patientId)
                .single();

            if (error) console.error('Failed to fetch patient:', error);
            else if (data) setPatient(data as PatientData);
            
            setPatientLoading(false);
        };
        
        loadPatient();
    }, [patientId, doctorName]);

    // Data population effects
    useEffect(() => {
        if (!patient?.id) return;
        supabase.from('vital_sign').select('*').eq('patient_id', patient.id).order('vitals_id', { ascending: false }).limit(1).single().then(({ data }) => {
            if (data) {
                setVitalsId(data.vitals_id);
                setFormData(prev => ({
                    ...prev, bp: data.bp ?? '', hr: data.heart_rate?.toString() ?? '', rr: data.respiratory_rate?.toString() ?? '',
                    temp: data.temperature?.toString() ?? '', weight: data.weight?.toString() ?? '', height: data.height?.toString() ?? '',
                    o2Saturation: data.o2_saturation?.toString() ?? '', muac: data.muac?.toString() ?? '', nutritionalStatus: data.nutritional_status ?? '',
                    bmi: data.bmi?.toString() ?? '', visualAcuityLeft: data.visual_acuity_left ?? '', visualAcuityRight: data.visual_acuity_right ?? '',
                }));
            }
        });
    }, [patient?.id]);

    useEffect(() => {
        if (!patient?.id) return;
        supabase.from('lab_result').select('findings').eq('patient_id', patient.id).order('labresult_id', { ascending: false }).limit(1).maybeSingle()
            .then(({ data, error }) => {
                if (error) { console.error('Failed to fetch lab findings:', error); return; }
                if (data?.findings) setFormData(prev => ({ ...prev, followUpLabResults: data.findings }));
            });
    }, [patient?.id]);

    useEffect(() => {
        if (!patient?.id) return;
        const query = supabase.from('consultation').select('*').eq('patient_id', patient.id);
        
        if (icidFromUrl) {
            query.eq('initial_consultation_id', parseInt(icidFromUrl as string));
        } else {
            query.order('consultation_id', { ascending: false }).limit(1);
        }

        query.single().then(({ data }) => {
            if (!data) return;
            setConsultationId(data.consultation_id);
            setConsultationSaved(true);
            if (data.follow_up_status === 'done') setFollowUpDone(true);
            setFormData(prev => ({
                ...prev, familyHistory: data.family_history ?? '', chiefComplaints: data.chief_complaints ?? '', diagnosis: data.diagnosis ?? '', hpi: data.hpi ?? '',
                attendingProvider: data.attending_provider ?? prev.attendingProvider, medicationAndTreatment: data.medication_treatment ?? '',
            }));
        });
    }, [patient?.id, icidFromUrl]);

    useEffect(() => {
        if (!patient?.id) return;

        const buildFollowUpQuery = async () => {
            let resolvedConsultationId = consultationId;
            if (!resolvedConsultationId && icidFromUrl) {
                const { data } = await supabase.from('consultation').select('consultation_id').eq('initial_consultation_id', parseInt(icidFromUrl as string)).single();
                if (data) resolvedConsultationId = data.consultation_id;
            }

            const query = supabase.from('follow_up').select('*').eq('patient_id', patient.id);
            if (resolvedConsultationId) query.eq('consultation_id', resolvedConsultationId);
            else query.order('consultation_id', { ascending: false }).limit(1);

            const { data } = await query.single();
            if (!data) return;
            if (data.follow_up_status === 'done') setFollowUpDone(true);

            setFormData(prev => ({
                ...prev, followUpDate: data.visit_date ?? prev.followUpDate, followUpTime: data.visit_time ?? '',
                followUpModeOfTx: data.mode_of_transaction ?? prev.followUpModeOfTx, followUpModeOfTransfer: data.mode_of_transfer ?? prev.followUpModeOfTransfer,
                followUpChiefComplaint: data.chief_complaint ?? '', followUpDiagnosis: data.diagnosis ?? '', followUpHpi: data.history_of_present_illness ?? '',
                followUpBp: data.bp ?? '', followUpHr: data.heart_rate?.toString() ?? '', followUpRr: data.respiratory_rate?.toString() ?? '',
                followUpTemp: data.temperature?.toString() ?? '', followUpO2: data.o2_saturation?.toString() ?? '', followUpWeight: data.weight?.toString() ?? '',
                followUpHeight: data.height?.toString() ?? '', followUpMuac: data.muac?.toString() ?? '', followUpNutritionalStatus: data.nutritional_status ?? '',
                followUpBmi: data.bmi?.toString() ?? '', followUpVaL: data.visual_acuity_left ?? '', followUpVaR: data.visual_acuity_right ?? '',
                followUpBloodType: data.blood_type ?? '', followUpGenSurvey: data.general_survey ?? '', managementTreatment: data.medication_treatment ?? prev.managementTreatment, followUpLabResults: prev.followUpLabResults,
            }));
        };

        buildFollowUpQuery();
    }, [patient?.id, consultationId, icidFromUrl]);

    const buildConsultationPayload = () => ({
        patient_id: patient?.id, ...(icidFromUrl ? { initial_consultation_id: parseInt(icidFromUrl as string) } : {}),
        family_history: formData.familyHistory || null, immunization_history: formData.immunizationHistory || null,
        smoking_status: formData.smoking || null, smoking_sticks_per_day: formData.smokingSticksPerDay ? parseInt(formData.smokingSticksPerDay) : null,
        smoking_years: formData.smokingYears ? parseInt(formData.smokingYears) : null, drinking_status: formData.drinking || null,
        drinking_frequency: formData.drinkingFrequency || null, drinking_years: formData.drinkingYears ? parseInt(formData.drinkingYears) : null,
        menarche_age: formData.menarche ? parseInt(formData.menarche) : null, sexual_onset_age: formData.onsetSexualIntercourse ? parseInt(formData.onsetSexualIntercourse) : null,
        is_menopause: formData.menopause || null, menopause_age: formData.menopauseAge ? parseInt(formData.menopauseAge) : null, lmp: formData.lmp || null,
        interval_cycle: formData.intervalCycle || null, period_duration: formData.periodDuration || null, pads_per_day: formData.padsPerDay ? parseInt(formData.padsPerDay) : null,
        birth_control_method: formData.birthControlMethod || null, gravidity: formData.gravidity ? parseInt(formData.gravidity) : null, parity: formData.parity ? parseInt(formData.parity) : null,
        delivery_type: formData.typeOfDelivery || null, full_term_count: formData.fullTerm ? parseInt(formData.fullTerm) : null, premature_count: formData.premature ? parseInt(formData.premature) : null,
        abortion_count: formData.abortion ? parseInt(formData.abortion) : null, living_children_count: formData.livingChildren ? parseInt(formData.livingChildren) : null, pre_eclampsia: formData.preEclampsia || null,
        medication_treatment: formData.medicationAndTreatment || null, management_treatment: formData.managementTreatment || null, attending_provider: formData.attendingProvider || null,
        chief_complaints: formData.chiefComplaints || null, diagnosis: formData.diagnosis || null, hpi: formData.hpi || null,
    });

    const buildFollowUpPayload = (resolvedConsultationId: number | null, followUpStatus: string = 'pending') => {
        const sigUrl = followUpSigCanvas.current?.isEmpty() ? null : followUpSigCanvas.current?.getCanvas().toDataURL('image/png');
        return {
            patient_id: patient?.id, consultation_id: resolvedConsultationId!, visit_date: formData.followUpDate || null, visit_time: formData.followUpTime || null,
            mode_of_transaction: formData.followUpModeOfTx || null, mode_of_transfer: formData.followUpModeOfTransfer || null, chief_complaint: formData.followUpChiefComplaint || null,
            diagnosis: formData.followUpDiagnosis || null, history_of_present_illness: formData.followUpHpi || null, bp: formData.followUpBp || null,
            heart_rate: toNumberOrNull(formData.followUpHr), respiratory_rate: toNumberOrNull(formData.followUpRr), temperature: toNumberOrNull(formData.followUpTemp),
            o2_saturation: toNumberOrNull(formData.followUpO2), weight: toNumberOrNull(formData.followUpWeight), height: toNumberOrNull(formData.followUpHeight), muac: toNumberOrNull(formData.followUpMuac),
            nutritional_status: followUpBmiInfo?.status || formData.followUpNutritionalStatus || null, bmi: followUpBmiInfo ? parseFloat(followUpBmiInfo.value) : toNumberOrNull(formData.followUpBmi),
            visual_acuity_left: formData.followUpVaL || null, visual_acuity_right: formData.followUpVaR || null, blood_type: formData.followUpBloodType || patient?.bloodType || null,
            general_survey: formData.followUpGenSurvey || null, medication_treatment: formData.managementTreatment || null, lab_results: formData.followUpLabResults || null, signature_url: sigUrl || null,
            follow_up_status: followUpStatus,
        };
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleLabTestChange = (testName: keyof typeof formData.labTests) => setFormData(prev => ({ ...prev, labTests: { ...prev.labTests, [testName]: !prev.labTests[testName] } }));
    const handleMedChange = (index: number, field: keyof Medication, value: string) => { const newMeds = [...medications]; newMeds[index][field] = value; setMedications(newMeds); };
    const handleAddMed = () => setMedications(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '', quantity: '' }]);
    const handleRemoveMed = (index: number) => { if (medications.length === 1) return; setMedications(prev => prev.filter((_, i) => i !== index)); };
    
    // Use the onBack prop injected by doctor.tsx, otherwise fallback
    const goBack = () => { if (onBack) onBack(); else window.location.href = '/pages/doctor.html'; };

    const ensureConsultationExists = async (): Promise<number | null> => {
        if (consultationId) return consultationId;
        if (!patient?.id) return null;
        const payload = buildConsultationPayload();
        const { data, error } = await supabase.from('consultation').insert([payload]).select('consultation_id').single();
        if (error) { console.error('Failed to auto-create consultation:', error); return null; }
        if (data) { setConsultationId(data.consultation_id); setConsultationSaved(true); return data.consultation_id; }
        return null;
    };

    const handleSaveConsultation = async () => {
        if (!patient?.id) return;
        setLoading(true);
        try {
            const consultationPayload = buildConsultationPayload();
            if (isOnline) {
                let resolvedConsultationId = consultationId;
                if (resolvedConsultationId) {
                    const { error } = await supabase.from('consultation').update(consultationPayload).eq('consultation_id', resolvedConsultationId);
                    if (error) throw error;
                } else {
                    const { data, error } = await supabase.from('consultation').insert([consultationPayload]).select('consultation_id').single();
                    if (error) throw error;
                    resolvedConsultationId = data.consultation_id;
                    setConsultationId(data.consultation_id);
                }

                const followUpPayload = buildFollowUpPayload(resolvedConsultationId, 'pending');
                const { data: existingFollowUp, error: followUpCheckError } = await supabase.from('follow_up').select('consultation_id').eq('consultation_id', resolvedConsultationId).maybeSingle();
                if (followUpCheckError) throw followUpCheckError;

                if (existingFollowUp) {
                    const { error } = await supabase.from('follow_up').update(followUpPayload).eq('consultation_id', resolvedConsultationId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('follow_up').insert([followUpPayload]);
                    if (error) throw error;
                }
                setConsultationSaved(true);
                alert('Consultation saved successfully!');
            } else {
                await saveToIndexedDB('MediSensDB', 'offline_patients', { id: Date.now(), type: 'consultation', data: consultationPayload });
                setConsultationSaved(true);
                alert('Offline: Consultation saved locally and will sync when connection returns!');
            }
        } catch (err: any) { alert('Failed to save consultation: ' + err.message); } finally { setLoading(false); }
    };

    const handleMarkFollowUpDone = async () => {
        if (!patient?.id) return;
        setLoading(true);
        try {
            const resolvedConsultationId = await ensureConsultationExists();
            if (!resolvedConsultationId) throw new Error('Could not resolve consultation record.');
            const donePayload = buildFollowUpPayload(resolvedConsultationId, 'done');

            const { data: existing, error: checkError } = await supabase.from('follow_up').select('followup_id, consultation_id').eq('patient_id', patient.id).order('followup_id', { ascending: false }).limit(1).maybeSingle();
            if (checkError) throw checkError;
            if (existing) {
                const { error: updateError } = await supabase.from('follow_up').update(donePayload).eq('followup_id', existing.followup_id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from('follow_up').insert([donePayload]);
                if (insertError) throw insertError;
            }
            setFollowUpDone(true);
            alert('Follow-up marked as done!');
        } catch (err: any) { console.error('Full error:', err); alert('Failed to mark follow-up as done: ' + err.message); } finally { setLoading(false); }
    };

    const handleSaveLabRequest = async () => {
        if (!patient?.id) return;
        setLoading(true);
        try {
            if (isOnline) {
                const resolvedConsultationId = await ensureConsultationExists();
                if (!resolvedConsultationId) throw new Error('Could not create consultation record.');
                const labPayload = {
                    patient_id: patient.id, consultation_id: resolvedConsultationId, request_date: new Date().toISOString().split('T')[0], chief_complaint: formData.labChiefComplaint || null,
                    is_cbc: formData.labTests.cbc, is_cbc_platelet: formData.labTests.cbcPlatelet, is_hgb_hct: formData.labTests.hgbHct, is_xray: formData.labTests.chestXray, is_ultrasound: formData.labTests.ultrasound,
                    is_urinalysis: formData.labTests.urinalysis, is_fecalysis: formData.labTests.fecalysis, is_sputum: formData.labTests.sputum, is_rbs: formData.labTests.rbs, is_fbs: formData.labTests.fbs,
                    is_uric_acid: formData.labTests.uricAcid, is_cholesterol: formData.labTests.cholesterol, others: formData.labTestsOther || null, requested_by: formData.labRequestedBy || null, status: 'Pending',
                };
                const { error: labError } = await supabase.from('lab_request').insert([labPayload]);
                if (labError) throw labError;
                alert('Lab request sent to laboratory successfully!');
            } else { alert('Offline mode requires connecting to the server to generate a consultation ID first.'); }
        } catch (error: any) { console.error('Error:', error); alert('Failed to save lab request: ' + error.message); } finally { setLoading(false); }
    };

    const handleSavePrescription = async () => {
        if (!patient?.id) return;
        if (sigCanvas.current?.isEmpty()) { alert('Doctor signature is required before saving.'); return; }
        const validMedications = medications.filter(m => m.name.trim() !== '');
        if (validMedications.length === 0) { alert('Please add at least one medication before saving.'); return; }
        
        setLoading(true);
        try {
            if (isOnline) {
                const resolvedConsultationId = await ensureConsultationExists();
                if (!resolvedConsultationId) throw new Error('Could not create consultation record.');
                const sigUrl = sigCanvas.current?.getCanvas().toDataURL('image/png') || '';
                const rxPayload = {
                    patient_id: patient.id, consultation_id: resolvedConsultationId, prescription_date: new Date().toISOString().split('T')[0], rx_content: JSON.stringify(validMedications),
                    license_no: formData.rxLicNo ? Number(formData.rxLicNo) : null, ptr_no: formData.rxPtrNo || null, signature_url: sigUrl, status: 'Pending',
                };
                const { error } = await supabase.from('prescription').insert([rxPayload]);
                if (error) throw error;
                alert('Prescription saved and sent to pharmacy!');
                sigCanvas.current?.clear();
            } else { alert('Offline mode requires connecting to the server to generate a consultation ID first.'); }
        } catch (error: any) { console.error('Error:', error); alert('Failed to save prescription: ' + error.message); } finally { setLoading(false); }
    };

    // ─── UI Variables ────────────────────────────────────────────────────────────
    const patientFullName = patient ? `${patient.firstName} ${patient.middleName ? patient.middleName + ' ' : ''}${patient.lastName}` : '—';
    const patientInitials = patient ? `${patient.firstName?.[0] ?? ''}${patient.lastName?.[0] ?? ''}`.toUpperCase() : '?';
    const inputCls = "w-full bg-white border border-slate-200 rounded-lg p-3.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-800";
    const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2";
    const textareaCls = "w-full bg-white border border-slate-200 rounded-lg p-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm text-slate-800 resize-y";
    const cardCls = "space-y-6 animate-in fade-in pb-20 md:pb-0";

    const RadioGroup = ({ name, options, value }: { name: string; options: string[]; value: string }) => (
        <div className="flex gap-3 flex-wrap">
            {options.map(opt => (
                <label key={opt} className={`cursor-pointer px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${value === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                    <input type="radio" name={name} value={opt} checked={value === opt} onChange={handleRadioChange} className="hidden" />{opt}
                </label>
            ))}
        </div>
    );

    const renderCheckbox = (key: keyof typeof formData.labTests, label: string) => (
        <label key={key} className="flex items-center gap-3 cursor-pointer group min-h-[40px]">
            <div className="relative flex items-center justify-center w-5 h-5 border-2 border-slate-300 rounded bg-white shrink-0 transition-colors group-hover:border-blue-400">
                <input type="checkbox" checked={formData.labTests[key]} onChange={() => handleLabTestChange(key)} className="absolute opacity-0 w-0 h-0" />
                {formData.labTests[key] && <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>
            <span className="text-sm font-medium text-slate-700">{label}</span>
        </label>
    );

    if (patientLoading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Loading patient data...</div>;
    }

    if (!patient) {
        return (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-8 mb-6 text-amber-700 flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-4">🩺</div>
                <h2 className="text-xl font-bold mb-2">No Patient Selected</h2>
                <p className="text-sm font-semibold mb-6">Please go back to the dashboard and select a patient from the queue.</p>
                <button onClick={goBack} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-colors">
                    ← Return to Dashboard
                </button>
            </div>
        );
    }

    const renderTab1 = () => (
        <div className="space-y-6 animate-in fade-in pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">I. Histories</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div><label className={labelCls}>Family History</label><textarea name="familyHistory" value={formData.familyHistory} onChange={handleChange} rows={4} className={textareaCls} /></div>
                    <div><label className={labelCls}>Immunization History</label><textarea name="immunizationHistory" value={formData.immunizationHistory} onChange={handleChange} rows={4} className={textareaCls} /></div>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-6">
                    <div>
                        <label className={labelCls}>Smoking History</label>
                        <RadioGroup name="smoking" options={['Yes', 'No']} value={formData.smoking} />
                        {formData.smoking === 'Yes' && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div><label className={labelCls}>Sticks / Day</label><input type="number" name="smokingSticksPerDay" value={formData.smokingSticksPerDay} onChange={handleChange} className={inputCls} /></div>
                                <div><label className={labelCls}>Years</label><input type="number" name="smokingYears" value={formData.smokingYears} onChange={handleChange} className={inputCls} /></div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className={labelCls}>Drinking History</label>
                        <RadioGroup name="drinking" options={['Yes', 'No']} value={formData.drinking} />
                        {formData.drinking === 'Yes' && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div><label className={labelCls}>Frequency</label><input type="text" name="drinkingFrequency" value={formData.drinkingFrequency} onChange={handleChange} className={inputCls} /></div>
                                <div><label className={labelCls}>Years</label><input type="number" name="drinkingYears" value={formData.drinkingYears} onChange={handleChange} className={inputCls} /></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex justify-end pt-4"><button onClick={() => setActiveTab(2)} className={`w-full md:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>Next: OBGyne &amp; Pregnancy →</button></div>
        </div>
    );

    const renderTab2 = () => (
        <div className="space-y-6 animate-in fade-in pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">II. OBGyne &amp; Pregnancy History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">OBGyne</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelCls}>Menarche (y/o)</label><input type="number" name="menarche" value={formData.menarche} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}>Onset Sexual Intercourse</label><input type="number" name="onsetSexualIntercourse" value={formData.onsetSexualIntercourse} onChange={handleChange} className={inputCls} /></div>
                    </div>
                    <div>
                        <label className={labelCls}>Menopause</label>
                        <RadioGroup name="menopause" options={['Yes', 'No']} value={formData.menopause} />
                        {formData.menopause === 'Yes' && <div className="mt-3"><label className={labelCls}>Age at Menopause</label><input type="number" name="menopauseAge" value={formData.menopauseAge} onChange={handleChange} className={inputCls} /></div>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelCls}>LMP</label><input type="date" name="lmp" value={formData.lmp} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}>Interval Cycle (Days)</label><input type="text" name="intervalCycle" value={formData.intervalCycle} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}>Period Duration (Days)</label><input type="text" name="periodDuration" value={formData.periodDuration} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}># of Pads / Day</label><input type="number" name="padsPerDay" value={formData.padsPerDay} onChange={handleChange} className={inputCls} /></div>
                    </div>
                    <div><label className={labelCls}>Birth Control Method</label><input type="text" name="birthControlMethod" value={formData.birthControlMethod} onChange={handleChange} className={inputCls} /></div>
                </div>
                <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pregnancy History</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelCls}>Gravidity</label><input type="number" name="gravidity" value={formData.gravidity} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}>Parity</label><input type="number" name="parity" value={formData.parity} onChange={handleChange} className={inputCls} /></div>
                    </div>
                    <div>
                        <label className={labelCls}>Type of Delivery</label>
                        <select name="typeOfDelivery" value={formData.typeOfDelivery} onChange={handleChange} className={inputCls}><option value="">Select type...</option><option value="Normal">Normal</option><option value="CS">CS</option><option value="Both">Both Normal and CS</option></select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelCls}># Full Term</label><input type="number" name="fullTerm" value={formData.fullTerm} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}># Premature</label><input type="number" name="premature" value={formData.premature} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}># Abortion</label><input type="number" name="abortion" value={formData.abortion} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}># Living Children</label><input type="number" name="livingChildren" value={formData.livingChildren} onChange={handleChange} className={inputCls} /></div>
                    </div>
                    <div><label className={labelCls}>Pre-eclampsia</label><RadioGroup name="preEclampsia" options={['Yes', 'No']} value={formData.preEclampsia} /></div>
                </div>
            </div>
            <div className="flex justify-between pt-4"><button onClick={() => setActiveTab(1)} className="bg-slate-100 py-3 px-6 rounded-lg font-semibold">← Back</button><button onClick={() => setActiveTab(3)} className={`text-white py-3 px-8 rounded-lg shadow-md font-semibold ${primaryBtnBg}`}>Next: Clinical Assessment →</button></div>
        </div>
    );

    const renderTab3 = () => (
        <div className="space-y-6 animate-in fade-in pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">III. Clinical Assessment</h3>
            <div><label className={labelCls}>Medication and Treatment</label><textarea name="medicationAndTreatment" value={formData.medicationAndTreatment} onChange={handleChange} rows={7} className={textareaCls} /></div>
            <div className="flex justify-between pt-4"><button onClick={() => setActiveTab(2)} className="bg-slate-100 py-3 px-6 rounded-lg font-semibold">← Back</button><button onClick={() => setActiveTab(4)} className={`text-white py-3 px-8 rounded-lg shadow-md font-semibold ${primaryBtnBg}`}>Next: Follow-up →</button></div>
        </div>
    );

    const renderTab4 = () => (
        <div className="space-y-6 animate-in fade-in pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">IV. Follow-up Visit</h3>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Visit Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className={labelCls}>Visit Date</label><input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleChange} className={inputCls} /></div>
                    <div><label className={labelCls}>Visit Time</label><input type="time" name="followUpTime" value={formData.followUpTime} onChange={handleChange} className={inputCls} /></div>
                    <div><label className={labelCls}>Mode of Transaction</label><select name="followUpModeOfTx" value={formData.followUpModeOfTx} onChange={handleChange} className={inputCls}><option value="Walk-in">Walk-in</option><option value="Teleconsult">Teleconsult</option><option value="Referral">Referral</option></select></div>
                </div>
            </div>
            <div className="flex justify-between pt-4"><button onClick={() => setActiveTab(3)} className="bg-slate-100 py-3 px-6 rounded-lg font-semibold">← Back</button><button onClick={() => setActiveTab(5)} className={`text-white py-3 px-8 rounded-lg shadow-md font-semibold ${primaryBtnBg}`}>Next: Clinical Notes →</button></div>
        </div>
    );

    const renderTab5 = () => (
        <div className="space-y-6 animate-in fade-in pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">V. Doctor's Clinical Notes</h3>
            <div><label className={labelCls}>Chief Complaints</label><textarea name="chiefComplaints" value={formData.chiefComplaints} onChange={handleChange} className={`${textareaCls} min-h-[120px]`} /></div>
            <div><label className={labelCls}>Diagnosis</label><textarea name="diagnosis" value={formData.diagnosis} onChange={handleChange} className={`${textareaCls} min-h-[100px]`} /></div>
            <div><label className={labelCls}>History of Present Illnesses</label><textarea name="hpi" value={formData.hpi} onChange={handleChange} className={`${textareaCls} min-h-[120px]`} /></div>
            <div className="flex justify-between pt-4">
                <button onClick={() => setActiveTab(4)} className="bg-slate-100 py-3 px-6 rounded-lg font-semibold">← Back</button>
                <div className="flex gap-3">
                    <button onClick={handleSaveConsultation} className="bg-white border-blue-300 text-blue-700 py-3 px-6 rounded-lg border font-semibold">💾 Save Consultation</button>
                    <button onClick={() => setActiveTab(7)} className={`text-white py-3 px-8 rounded-lg shadow-md font-semibold ${primaryBtnBg}`}>Next: Lab Request →</button>
                </div>
            </div>
        </div>
    );

    const renderTab7 = () => (
        <div className={cardCls}>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">VI. Laboratory Request</h3>
            </div>
            
            <div className="space-y-2">

                <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6 space-y-6">
                    {/* Routine Tests */}
                    <div>
                        <div className="inline-block px-3 py-1 bg-white border border-slate-200 shadow-sm text-slate-600 text-xs font-black uppercase tracking-widest rounded-md mb-4">Routine Tests</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                            {renderCheckbox('cbc', 'Complete Blood Count (CBC)')}
                            {renderCheckbox('urinalysis', 'Urinalysis')}
                            {renderCheckbox('cbcPlatelet', 'CBC with Platelet Count')}
                            {renderCheckbox('fecalysis', 'Fecalysis')}
                            {renderCheckbox('hgbHct', 'Hemoglobin and Hematocrit')}
                            {renderCheckbox('sputum', 'Sputum')}
                            {renderCheckbox('chestXray', 'Chest X-Ray (PA View)')}
                            {renderCheckbox('ultrasound', 'Ultrasound')}
                            {renderCheckbox('bloodTyping', 'Blood Typing')}
                            {renderCheckbox('ecg', 'ECG')}
                        </div>
                    </div>

                    {/* Fasting Tests */}
                    <div className="pt-6 border-t border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="inline-block px-3 py-1 bg-white border border-slate-200 shadow-sm text-slate-600 text-xs font-black uppercase tracking-widest rounded-md">Fasting Tests</div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">8–10 hrs required</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                            {renderCheckbox('rbs', 'Random Blood Sugar (RBS)')}
                            {renderCheckbox('fbs', 'Fasting Blood Sugar (FBS)')}
                            {renderCheckbox('uricAcid', 'Uric Acid')}
                            {renderCheckbox('cholesterol', 'Cholesterol')}
                            {renderCheckbox('lipidProfile', 'Lipid Profile')}
                            {renderCheckbox('hba1c', 'HbA1c')}
                            {renderCheckbox('creatinine', 'Creatinine')}
                            {renderCheckbox('sgpt', 'SGPT')}
                        </div>
                    </div>

                    {/* Others */}
                    <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="shrink-0">
                            {renderCheckbox('others', 'Others:')}
                        </div>
                        <input
                            type="text"
                            name="labTestsOther"
                            value={formData.labTestsOther}
                            onChange={handleChange}
                            disabled={!formData.labTests.others}
                            className={`flex-1 bg-white border-2 ${formData.labTests.others ? 'border-blue-400 focus:border-blue-500 shadow-sm' : 'border-slate-100'} rounded-xl outline-none px-4 py-2.5 text-sm font-medium text-slate-800 disabled:opacity-50 disabled:bg-slate-50 transition-all`}
                            placeholder={formData.labTests.others ? 'Specify other tests here...' : ''}
                        />
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Requested By</label>
                    <input type="text" name="labRequestedBy" value={formData.labRequestedBy} onChange={handleChange} className={inputCls} />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-8 mt-6 border-t border-slate-100">
                <button onClick={() => setActiveTab(6)} className="order-2 sm:order-1 w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 px-6 rounded-xl font-bold transition-colors">← Back</button>
                <div className="flex flex-col sm:flex-row gap-4 order-1 sm:order-2">
                    <button onClick={handleSaveLabRequest} disabled={loading || !patient?.id} className={`w-full sm:w-auto py-3.5 px-6 rounded-xl font-extrabold transition-colors shadow-sm border-2 disabled:opacity-50 ${isOnline ? 'bg-white border-blue-500 text-blue-600 hover:bg-blue-50' : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'}`}>
                        {loading ? 'Sending...' : '📋 Send to Laboratory'}
                    </button>
                    <button onClick={() => setActiveTab(8)} className={`w-full sm:w-auto text-white py-3.5 px-8 rounded-xl font-bold transition-all active:scale-95 ${primaryBtnBg}`}>Next: E-Prescription →</button>
                </div>
            </div>
        </div>
    );

    const renderTab8 = () => (
        <div className="space-y-6 animate-in fade-in pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">VII. E-Prescription</h3>
            <div className="space-y-3">
                {medications.map((med, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 md:col-span-2"><label className={labelCls}>Medication Name</label><input type="text" value={med.name} onChange={e => handleMedChange(i, 'name', e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Dosage</label><input type="text" value={med.dosage} onChange={e => handleMedChange(i, 'dosage', e.target.value)} className={inputCls} /></div>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={handleAddMed} className="text-sm font-semibold text-blue-600">+ Add Another Medication</button>
            <div className="flex justify-between pt-4">
                <button onClick={() => setActiveTab(7)} className="bg-slate-100 py-3 px-6 rounded-lg font-semibold">← Back</button>
                <button onClick={handleSavePrescription} className={`text-white py-3 px-8 rounded-lg shadow-md font-semibold ${primaryBtnBg}`}>💊 Authorize & Send to Pharmacy</button>
            </div>
        </div>
    );

    const tabs = [
        { id: 1, label: "1. Histories" }, { id: 2, label: "2. OBGyne" }, { id: 3, label: "3. Assessment" },
        { id: 4, label: "4. Follow-up" }, { id: 5, label: "5. Clinical Notes" },
        { id: 7, label: "6. Lab Request" }, { id: 8, label: ". E-Prescription" },
    ];

    return (
        <div className="w-full flex justify-center pb-12">
            <div className="w-full max-w-5xl">
                
                {/* Embedded Patient Info Card */}
                <div className="w-full bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">{patientInitials}</div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-base leading-tight truncate">{patientFullName}</div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            <span className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{patient?.age ?? '—'}</span> yrs old</span>
                            <span className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{patient?.sex || '—'}</span></span>
                            <span className="text-xs text-slate-500">Blood Type: <span className="font-semibold text-slate-700">{patient?.bloodType || '—'}</span></span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setShowHistory(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg transition-all flex items-center gap-1.5">🕐 View History</button>
                        <button onClick={goBack} className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-all">← Dashboard</button>
                    </div>
                </div>

                {/* Tabs Row */}
                <div className="flex gap-1 mb-8 border-b border-slate-200 overflow-x-auto whitespace-nowrap w-full scrollbar-hide">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-bold rounded-t-xl transition-all border-b-2 flex-shrink-0 ${activeTab === tab.id ? 'text-blue-600 bg-white border-blue-600 shadow-[0_-4px_15px_rgba(0,0,0,0.03)]' : 'text-slate-400 border-transparent hover:bg-white hover:text-slate-600'}`}>{tab.label}</button>
                    ))}
                </div>

                {/* Form Content Area */}
                <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
                    {activeTab === 1 && renderTab1()}
                    {activeTab === 2 && renderTab2()}
                    {activeTab === 3 && renderTab3()}
                    {activeTab === 4 && renderTab4()}
                    {activeTab === 5 && renderTab5()}
                    {activeTab === 7 && renderTab7()}
                    {activeTab === 8 && renderTab8()}
                </div>
            </div>

            {showHistory && patient && (
                <HistoryPanel patientId={patient.id} patientName={patientFullName} onClose={() => setShowHistory(false)} />
            )}
        </div>
    );
}

export default ConsultationPage;