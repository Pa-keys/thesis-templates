import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';
import { Sidebar } from './sidebar';
import { useNetworkSync, saveToIndexedDB, initIndexedDB } from '../shared/useNetworkSync';
import { OfflineBanner } from './OfflineBanner';

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

interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: string;
}

function ConsultationPage() {

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

        // ── Lab Tests ──────────────────────────────────────────────────────
        labTests: {
            cbc: false, cbcPlatelet: false, hgbHct: false, chestXray: false,
            ultrasound: false, urinalysis: false, fecalysis: false, sputum: false,
            rbs: false, fbs: false, uricAcid: false, cholesterol: false,
            hba1c: false, bloodTyping: false, creatinine: false,
            sgpt: false, lipidProfile: false, ecg: false, others: false,
        },
        labTestsOther: '',
        labChiefComplaint: '',
        labRequestedBy: '',

        // ── Prescription ───────────────────────────────────────────────────
        rxLicNo: '',
        rxPtrNo: '',
        rxSignatureUrl: '',
    });

    // Medications list for prescription
    const [medications, setMedications] = useState<Medication[]>([
        { name: '', dosage: '', frequency: '', duration: '', quantity: '' }
    ]);

    // ── NEW: track whether consultation has been saved ──────────────────────
    const [consultationSaved, setConsultationSaved] = useState(false);

    const sigCanvas = useRef<SignatureCanvas | null>(null);

    const [activeTab, setActiveTab] = useState(1);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [patient, setPatient] = useState<PatientData | null>(null);
    const [patientLoading, setPatientLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [consultationId, setConsultationId] = useState<number | null>(null);

    const [doctorName, setDoctorName] = useState('Loading...');
    const [doctorInitials, setDoctorInitials] = useState('D');

    const { isOnline, isSyncing } = useNetworkSync();

    const primaryBtnBg = isOnline
        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20';

    const [vitalsId, setVitalsId] = useState<number | null>(null);
    const [vitalsLoading, setVitalsLoading] = useState(false);

    // ─── INIT ────────────────────────────────────────────────────────────────
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
            setFormData(prev => ({
                ...prev,
                attendingProvider: profile.fullName,
                labRequestedBy: profile.fullName,
            }));

            const patientId = new URLSearchParams(window.location.search).get('id');
            if (!patientId) { setPatientLoading(false); return; }

            const { data, error } = await supabase
                .from('patients')
                .select('id, firstName, lastName, middleName, age, sex, bloodType, address, contactNumber')
                .eq('id', patientId)
                .single();

            if (error) console.error('Failed to fetch patient:', error);
            else if (data) setPatient(data as PatientData);

            setPatientLoading(false);
        });
    }, []);

    // ─── VITALS FETCH ────────────────────────────────────────────────────────
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

    // ─── CONSULTATION FETCH ───────────────────────────────────────────────────
    useEffect(() => {
        if (!patient?.id) return;

        supabase
            .from('consultation')
            .select('*')
            .eq('patient_id', patient.id)
            .order('consultation_id', { ascending: false })
            .limit(1)
            .single()
            .then(({ data }) => {
                if (!data) return;
                setConsultationId(data.consultation_id);
                setConsultationSaved(true); // already has a saved record
                setFormData(prev => ({
                    ...prev,
                    familyHistory:          data.family_history ?? '',
                    immunizationHistory:    data.immunization_history ?? '',
                    smoking:                data.smoking_status ?? '',
                    smokingSticksPerDay:    data.smoking_sticks_per_day?.toString() ?? '',
                    smokingYears:           data.smoking_years?.toString() ?? '',
                    drinking:               data.drinking_status ?? '',
                    drinkingFrequency:      data.drinking_frequency ?? '',
                    drinkingYears:          data.drinking_years?.toString() ?? '',
                    menarche:               data.menarche_age?.toString() ?? '',
                    onsetSexualIntercourse: data.sexual_onset_age?.toString() ?? '',
                    menopause:              data.is_menopause ?? '',
                    menopauseAge:           data.menopause_age?.toString() ?? '',
                    lmp:                    data.lmp ?? '',
                    intervalCycle:          data.interval_cycle ?? '',
                    periodDuration:         data.period_duration ?? '',
                    padsPerDay:             data.pads_per_day?.toString() ?? '',
                    birthControlMethod:     data.birth_control_method ?? '',
                    gravidity:              data.gravidity?.toString() ?? '',
                    parity:                 data.parity?.toString() ?? '',
                    typeOfDelivery:         data.delivery_type ?? '',
                    fullTerm:               data.full_term_count?.toString() ?? '',
                    premature:              data.premature_count?.toString() ?? '',
                    abortion:               data.abortion_count?.toString() ?? '',
                    livingChildren:         data.living_children_count?.toString() ?? '',
                    preEclampsia:           data.pre_eclampsia ?? '',
                    medicationAndTreatment: data.medication_treatment ?? '',
                    followUpDate:           data.follow_up_date ?? new Date().toISOString().split('T')[0],
                    followUpTime:           data.follow_up_time ?? '',
                    managementTreatment:    data.management_treatment ?? '',
                    attendingProvider:      data.attending_provider ?? prev.attendingProvider,
                    chiefComplaints:        data.chief_complaints ?? '',
                    diagnosis:              data.diagnosis ?? '',
                    hpi:                    data.hpi ?? ''
                }));
            });
    }, [patient?.id]);

    useEffect(() => {
        const handleResize = () => { if (window.innerWidth >= 768) setIsMobileMenuOpen(false); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    const buildConsultationPayload = () => ({
        patient_id:              patient?.id,
        family_history:          formData.familyHistory || null,
        immunization_history:    formData.immunizationHistory || null,
        smoking_status:          formData.smoking || null,
        smoking_sticks_per_day:  formData.smokingSticksPerDay ? parseInt(formData.smokingSticksPerDay) : null,
        smoking_years:           formData.smokingYears ? parseInt(formData.smokingYears) : null,
        drinking_status:         formData.drinking || null,
        drinking_frequency:      formData.drinkingFrequency || null,
        drinking_years:          formData.drinkingYears ? parseInt(formData.drinkingYears) : null,
        menarche_age:            formData.menarche ? parseInt(formData.menarche) : null,
        sexual_onset_age:        formData.onsetSexualIntercourse ? parseInt(formData.onsetSexualIntercourse) : null,
        is_menopause:            formData.menopause || null,
        menopause_age:           formData.menopauseAge ? parseInt(formData.menopauseAge) : null,
        lmp:                     formData.lmp || null,
        interval_cycle:          formData.intervalCycle || null,
        period_duration:         formData.periodDuration || null,
        pads_per_day:            formData.padsPerDay ? parseInt(formData.padsPerDay) : null,
        birth_control_method:    formData.birthControlMethod || null,
        gravidity:               formData.gravidity ? parseInt(formData.gravidity) : null,
        parity:                  formData.parity ? parseInt(formData.parity) : null,
        delivery_type:           formData.typeOfDelivery || null,
        full_term_count:         formData.fullTerm ? parseInt(formData.fullTerm) : null,
        premature_count:         formData.premature ? parseInt(formData.premature) : null,
        abortion_count:          formData.abortion ? parseInt(formData.abortion) : null,
        living_children_count:   formData.livingChildren ? parseInt(formData.livingChildren) : null,
        pre_eclampsia:           formData.preEclampsia || null,
        medication_treatment:    formData.medicationAndTreatment || null,
        follow_up_date:          formData.followUpDate || null,
        follow_up_time:          formData.followUpTime || null,
        management_treatment:    formData.managementTreatment || null,
        attending_provider:      formData.attendingProvider || null,
        chief_complaints:        formData.chiefComplaints || null,
        diagnosis:               formData.diagnosis || null,
        hpi:                     formData.hpi || null
    });

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

    const handleMedChange = (index: number, field: keyof Medication, value: string) => {
        const newMeds = [...medications];
        newMeds[index][field] = value;
        setMedications(newMeds);
    };

    const handleAddMed = () => {
        setMedications(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '', quantity: '' }]);
    };

    const handleRemoveMed = (index: number) => {
        if (medications.length === 1) return;
        setMedications(prev => prev.filter((_, i) => i !== index));
    };

    // ── NEW: Save Consultation ────────────────────────────────────────────────
    const handleSaveConsultation = async () => {
        if (!patient?.id) return;
        setLoading(true);
        const payload = buildConsultationPayload();

        try {
            if (isOnline) {
                if (consultationId) {
                    const { error } = await supabase
                        .from('consultation')
                        .update(payload)
                        .eq('consultation_id', consultationId);
                    if (error) throw error;
                } else {
                    const { data, error } = await supabase
                        .from('consultation')
                        .insert([payload])
                        .select('consultation_id')
                        .single();
                    if (error) throw error;
                    if (data) setConsultationId(data.consultation_id);
                }
                setConsultationSaved(true);
                alert('Consultation saved successfully!');
            } else {
                await saveToIndexedDB('MediSensDB', 'offline_patients', {
                    id: Date.now(),
                    type: 'consultation',
                    data: payload,
                });
                setConsultationSaved(true);
                alert('Offline: Consultation saved locally and will sync when connection returns!');
            }
        } catch (err: any) {
            alert('Failed to save consultation: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Save Lab Request
    const handleSaveLabRequest = async () => {
        if (!patient?.id) return;
        setLoading(true);
        
        const consultPayload = buildConsultationPayload();
        // HOLD THE ID LOCALLY
        let currentConsultId = consultationId; 

        try {
            if (isOnline) {
                // Save consultation first
                if (currentConsultId) {
                    const { error } = await supabase.from('consultation').update(consultPayload).eq('consultation_id', currentConsultId);
                    if (error) throw error;
                } else {
                    const { data, error } = await supabase.from('consultation').insert([consultPayload]).select('consultation_id').single();
                    if (error) throw error;
                    if (data) {
                        currentConsultId = data.consultation_id; // Capture new ID
                        setConsultationId(data.consultation_id); // Update state for later
                        setConsultationSaved(true);
                    }
                }

                // BUILD LAB PAYLOAD WITH THE ID
                const labPayload = {
                    patient_id: patient.id,
                    consultation_id: currentConsultId, // LINKED!
                    request_date: new Date().toISOString().split('T')[0],
                    chief_complaint: formData.labChiefComplaint || null,
                    is_cbc: formData.labTests.cbc,
                    is_cbc_platelet: formData.labTests.cbcPlatelet,
                    is_hgb_hct: formData.labTests.hgbHct,
                    is_xray: formData.labTests.chestXray,
                    is_ultrasound: formData.labTests.ultrasound,
                    is_urinalysis: formData.labTests.urinalysis,
                    is_fecalysis: formData.labTests.fecalysis,
                    is_sputum: formData.labTests.sputum,
                    is_rbs: formData.labTests.rbs,
                    is_fbs: formData.labTests.fbs,
                    is_uric_acid: formData.labTests.uricAcid,
                    is_cholesterol: formData.labTests.cholesterol,
                    others: formData.labTestsOther || null,
                    requested_by: formData.labRequestedBy || null,
                    status: 'Pending',
                };

                // Save lab request
                const { error: labError } = await supabase.from('lab_request').insert([labPayload]);
                if (labError) throw labError;
                
                alert('Lab request sent to laboratory successfully!');
            } else {
                alert('Offline mode requires connecting to the server to generate a consultation ID first.');
            }
        } catch (error: any) {
            console.error('Error:', error);
            alert('Failed to save lab request: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Save Prescription
    const handleSavePrescription = async () => {
        if (!patient?.id) return;

        // REQUIRE CONSULTATION TO EXIST FIRST
        if (!consultationId) {
             alert('Please save the Clinical Assessment / Consultation first before issuing a prescription.');
             return;
        }

        if (sigCanvas.current?.isEmpty()) {
            alert('Doctor signature is required before saving.');
            return;
        }

        // 1. FILTER OUT ANY BLANK ROWS
        const validMedications = medications.filter(m => m.name.trim() !== '');

        // 2. CHECK IF WE HAVE AT LEAST ONE VALID MEDICATION LEFT
        if (validMedications.length === 0) {
            alert('Please add at least one medication before saving.');
            return;
        }
        
        setLoading(true);
        const sigUrl = sigCanvas.current?.getCanvas().toDataURL('image/png') || '';
        
        const rxPayload = {
            patient_id: patient.id,
            consultation_id: consultationId, // LINKED!
            prescription_date: new Date().toISOString().split('T')[0],
            // 3. STRINGIFY ONLY THE VALID MEDICATIONS
            rx_content: JSON.stringify(validMedications), 
            license_no: formData.rxLicNo ? Number(formData.rxLicNo) : null,
            ptr_no: formData.rxPtrNo || null,
            signature_url: sigUrl,
            status: 'Pending',
        };

        try {
            if (isOnline) {
                const { error } = await supabase.from('prescription').insert([rxPayload]);
                if (error) throw error;
                alert('Prescription saved and sent to pharmacy!');
                sigCanvas.current?.clear();
            } else {
                alert('Offline mode requires connecting to the server to generate a consultation ID first.');
            }
        } catch (error: any) {
            console.error('Error:', error);
            alert('Failed to save prescription: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const patientFullName = patient
        ? `${patient.firstName} ${patient.middleName ? patient.middleName + ' ' : ''}${patient.lastName}`
        : '—';
    const patientInitials = patient
        ? `${patient.firstName?.[0] ?? ''}${patient.lastName?.[0] ?? ''}`.toUpperCase()
        : '?';

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

    const renderCheckbox = (key: keyof typeof formData.labTests, label: string) => (
        <label key={key} className="flex items-center gap-3 cursor-pointer group min-h-[40px]">
            <div className="relative flex items-center justify-center w-5 h-5 border-2 border-slate-300 rounded bg-white shrink-0 transition-colors group-hover:border-blue-400">
                <input type="checkbox" checked={formData.labTests[key]} onChange={() => handleLabTestChange(key)} className="absolute opacity-0 w-0 h-0" />
                {formData.labTests[key] && (
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
            <span className="text-sm font-medium text-slate-700">{label}</span>
        </label>
    );

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
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                    {patientInitials}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-base leading-tight truncate">{patientFullName}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{patient.age ?? '—'}</span> yrs old</span>
                        <span className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{patient.sex || '—'}</span></span>
                        <span className="text-xs text-slate-500">Blood Type: <span className="font-semibold text-slate-700">{patient.bloodType || '—'}</span></span>
                        {patient.contactNumber && <span className="text-xs text-slate-500">📞 <span className="font-semibold text-slate-700">{patient.contactNumber}</span></span>}
                        {patient.address && <span className="text-xs text-slate-500 truncate max-w-xs">📍 {patient.address}</span>}
                    </div>
                </div>
                <button onClick={() => window.location.href = 'doctor.html'} className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-all">← Dashboard</button>
            </div>
        );
    };

    // ─── TAB RENDERS ─────────────────────────────────────────────────────────

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
                                <div><label className={labelCls}>Sticks / Day</label><input type="number" name="smokingSticksPerDay" value={formData.smokingSticksPerDay} onChange={handleChange} className={inputCls} placeholder="e.g. 5" /></div>
                                <div><label className={labelCls}>Years</label><input type="number" name="smokingYears" value={formData.smokingYears} onChange={handleChange} className={inputCls} placeholder="e.g. 3" /></div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className={labelCls}>Drinking History</label>
                        <RadioGroup name="drinking" options={['Yes', 'No']} value={formData.drinking} />
                        {formData.drinking === 'Yes' && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div><label className={labelCls}>Frequency</label><input type="text" name="drinkingFrequency" value={formData.drinkingFrequency} onChange={handleChange} className={inputCls} placeholder="e.g. Weekly" /></div>
                                <div><label className={labelCls}>Years</label><input type="number" name="drinkingYears" value={formData.drinkingYears} onChange={handleChange} className={inputCls} placeholder="e.g. 2" /></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex justify-end pt-4">
                <button onClick={() => setActiveTab(2)} className={`w-full md:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>Next: OBGyne &amp; Pregnancy →</button>
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
                        <div><label className={labelCls}>Menarche (y/o)</label><input type="number" name="menarche" value={formData.menarche} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}>Onset Sexual Intercourse (y/o)</label><input type="number" name="onsetSexualIntercourse" value={formData.onsetSexualIntercourse} onChange={handleChange} className={inputCls} /></div>
                    </div>
                    <div>
                        <label className={labelCls}>Menopause</label>
                        <RadioGroup name="menopause" options={['Yes', 'No']} value={formData.menopause} />
                        {formData.menopause === 'Yes' && (
                            <div className="mt-3"><label className={labelCls}>Age at Menopause</label><input type="number" name="menopauseAge" value={formData.menopauseAge} onChange={handleChange} className={inputCls} placeholder="Age" /></div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelCls}>LMP</label><input type="date" name="lmp" value={formData.lmp} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}>Interval Cycle (Days)</label><input type="text" name="intervalCycle" value={formData.intervalCycle} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}>Period Duration (Days)</label><input type="text" name="periodDuration" value={formData.periodDuration} onChange={handleChange} className={inputCls} /></div>
                        <div><label className={labelCls}># of Pads / Day</label><input type="number" name="padsPerDay" value={formData.padsPerDay} onChange={handleChange} className={inputCls} /></div>
                    </div>
                    <div><label className={labelCls}>Birth Control Method</label><input type="text" name="birthControlMethod" value={formData.birthControlMethod} onChange={handleChange} className={inputCls} placeholder="e.g. Pills, IUD..." /></div>
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
                    <div><label className={labelCls}>Pre-eclampsia</label><RadioGroup name="preEclampsia" options={['Yes', 'No']} value={formData.preEclampsia} /></div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <button onClick={() => setActiveTab(1)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">← Back</button>
                <button onClick={() => setActiveTab(3)} className={`order-1 sm:order-2 w-full sm:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>Next: Clinical Assessment →</button>
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
                <button onClick={() => setActiveTab(2)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">← Back</button>
                <button onClick={() => setActiveTab(4)} className={`order-1 sm:order-2 w-full sm:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>Next: Follow-up →</button>
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
                <button onClick={() => setActiveTab(3)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">← Back</button>
                <button onClick={() => setActiveTab(5)} className={`order-1 sm:order-2 w-full sm:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>Next: Clinical Notes →</button>
            </div>
        </div>
    );

    // ── Tab 5 now has a Save Consultation button ──────────────────────────────
    const renderTab5 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">V. Doctor's Clinical Notes</h3>
            <div><label className={labelCls}>Chief Complaints</label><textarea name="chiefComplaints" value={formData.chiefComplaints} onChange={handleChange} className={`${textareaCls} min-h-[120px]`} placeholder="Describe patient's primary symptoms..." /></div>
            <div><label className={labelCls}>Diagnosis</label><textarea name="diagnosis" value={formData.diagnosis} onChange={handleChange} className={`${textareaCls} min-h-[100px]`} /></div>
            <div><label className={labelCls}>History of Present Illnesses <span className="text-slate-400 font-normal normal-case">(Optional)</span></label><textarea name="hpi" value={formData.hpi} onChange={handleChange} className={`${textareaCls} min-h-[120px]`} /></div>

            {/* Save Consultation banner hint */}
            {!consultationSaved && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    <span className="text-lg leading-none">💡</span>
                    <span>Save the consultation here before proceeding to Lab Request or E-Prescription — both require a saved consultation record.</span>
                </div>
            )}
            {consultationSaved && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold">
                    <span>✅</span>
                    <span>Consultation record saved — you can now issue lab requests and prescriptions.</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setActiveTab(4)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">← Back</button>
                <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
                    <button
                        onClick={handleSaveConsultation}
                        disabled={loading || !patient?.id}
                        className={`w-full sm:w-auto font-semibold py-3 px-6 rounded-lg border transition-all active:scale-95 disabled:opacity-50 text-sm
                            ${consultationSaved
                                ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                                : isOnline
                                    ? 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50'
                                    : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                            }`}
                    >
                        {loading ? 'Saving...' : consultationSaved ? '✓ Consultation Saved' : '💾 Save Consultation'}
                    </button>
                    <button onClick={() => setActiveTab(6)} className={`w-full sm:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>Next: Physical Exam →</button>
                </div>
            </div>
        </div>
    );

    const renderTab6 = () => {
        const handleSaveVitals = async () => {
            if (!patient?.id) return;
            setLoading(true);
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
                        const { error } = await supabase.from('vital_sign').update(payload).eq('vitals_id', vitalsId);
                        if (error) throw error;
                    } else {
                        const { data, error } = await supabase.from('vital_sign').insert([payload]).select('vitals_id').single();
                        if (error) throw error;
                        if (data) setVitalsId(data.vitals_id);
                    }
                    alert('Vitals saved successfully!');
                } else {
                    await saveToIndexedDB('MediSensDB', 'offline_patients', { id: Date.now(), type: 'vital_sign', data: payload });
                    alert('Offline: Vitals saved locally and will sync when connection returns!');
                }
            } catch (err: any) {
                alert('Failed to save vitals: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        const w = parseFloat(formData.weight);
        const h = parseFloat(formData.height);
        const computedBmi = (w > 0 && h > 0) ? (w / ((h / 100) * (h / 100))).toFixed(1) : '';
        const bmiLabel = computedBmi ? parseFloat(computedBmi) < 18.5 ? 'Underweight' : parseFloat(computedBmi) < 25 ? 'Normal weight' : parseFloat(computedBmi) < 30 ? 'Overweight' : 'Obese' : '';
        const bmiColor = computedBmi ? parseFloat(computedBmi) < 18.5 ? 'text-amber-500' : parseFloat(computedBmi) < 25 ? 'text-green-600' : parseFloat(computedBmi) < 30 ? 'text-orange-500' : 'text-red-500' : '';

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-bold text-slate-900">VI. Physical Examination</h3>
                    {vitalsLoading && <span className="text-xs text-slate-400 flex items-center gap-1.5"><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Loading latest vitals...</span>}
                    {vitalsId && !vitalsLoading && <span className="text-xs text-green-600 font-semibold bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">✓ Loaded from record #{vitalsId}</span>}
                    {!vitalsId && !vitalsLoading && patient && <span className="text-xs text-slate-400 font-semibold bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">No previous vitals found</span>}
                </div>
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
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Anthropometrics</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                        <div><label className={labelCls}>Weight (kg)</label><input type="text" name="weight" value={formData.weight} onChange={handleChange} className={inputCls} placeholder="65" /></div>
                        <div><label className={labelCls}>Height (cm)</label><input type="text" name="height" value={formData.height} onChange={handleChange} className={inputCls} placeholder="165" /></div>
                        <div>
                            <label className={labelCls}>BMI <span className="text-slate-400 font-normal normal-case">(auto-computed)</span></label>
                            <input type="text" name="bmi" value={computedBmi || formData.bmi} readOnly={!!computedBmi} onChange={handleChange} className={`${inputCls} ${computedBmi ? 'bg-slate-50 text-slate-500 cursor-default' : ''}`} placeholder="—" />
                            {computedBmi && <p className={`text-xs mt-1.5 font-semibold ${bmiColor}`}>{bmiLabel}</p>}
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
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Visual Acuity</p>
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div><label className={labelCls}>Left Eye</label><input type="text" name="visualAcuityLeft" value={formData.visualAcuityLeft} onChange={handleChange} className={inputCls} placeholder="20/20" /></div>
                        <div><label className={labelCls}>Right Eye</label><input type="text" name="visualAcuityRight" value={formData.visualAcuityRight} onChange={handleChange} className={inputCls} placeholder="20/20" /></div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => setActiveTab(5)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">← Back</button>
                    <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
                        <button onClick={handleSaveVitals} disabled={loading || !patient?.id} className={`w-full sm:w-auto font-semibold py-3 px-6 rounded-lg border transition-all active:scale-95 disabled:opacity-50 text-sm ${isOnline ? 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50' : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'}`}>
                            {loading ? 'Saving...' : vitalsId ? '💾 Update Vitals' : '💾 Save Vitals'}
                        </button>
                        <button onClick={() => setActiveTab(7)} className={`w-full sm:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>Next: Lab Request →</button>
                    </div>
                </div>
            </div>
        );
    };

    // ─── TAB 7: LABORATORY REQUEST ────────────────────────────────────────────
    const renderTab7 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">VII. Laboratory Request</h3>

            {/* Chief complaint */}
            <div>
                <label className={labelCls}>Chief Complaint</label>
                <input type="text" name="labChiefComplaint" value={formData.labChiefComplaint} onChange={handleChange} className={inputCls} placeholder="Enter chief complaint for lab request..." />
            </div>

            {/* Tests grid */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Routine Tests</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
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

                <div className="border-t border-slate-200 pt-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Fasting Tests <span className="text-slate-300 font-normal normal-case">(8–10 hrs)</span></p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
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
                <div className="border-t border-slate-200 pt-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    {renderCheckbox('others', 'Others:')}
                    <input
                        type="text"
                        name="labTestsOther"
                        value={formData.labTestsOther}
                        onChange={handleChange}
                        disabled={!formData.labTests.others}
                        className={`flex-1 bg-white border-b-2 ${formData.labTests.others ? 'border-slate-300 focus:border-blue-500' : 'border-slate-100'} outline-none px-2 py-2 text-sm font-medium text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed`}
                        placeholder={formData.labTests.others ? 'Specify test here...' : ''}
                    />
                </div>
            </div>

            {/* Requested by */}
            <div>
                <label className={labelCls}>Requested By</label>
                <input type="text" name="labRequestedBy" value={formData.labRequestedBy} onChange={handleChange} className={inputCls} />
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setActiveTab(6)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">← Back</button>
                <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
                    <button
                        onClick={handleSaveLabRequest}
                        disabled={loading || !patient?.id}
                        className={`w-full sm:w-auto font-semibold py-3 px-6 rounded-lg border transition-all active:scale-95 disabled:opacity-50 text-sm ${isOnline ? 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50' : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'}`}
                    >
                        {loading ? 'Sending...' : '📋 Send to Laboratory'}
                    </button>
                    <button onClick={() => setActiveTab(8)} className={`w-full sm:w-auto text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 duration-200 ${primaryBtnBg}`}>Next: E-Prescription →</button>
                </div>
            </div>
        </div>
    );

    // ─── TAB 8: E-PRESCRIPTION ────────────────────────────────────────────────
    const renderTab8 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 md:pb-0">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">VIII. E-Prescription</h3>

            {/* Patient summary strip */}
            {patient && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span><span className="text-slate-500">Patient:</span> <span className="font-semibold text-slate-800">{patientFullName}</span></span>
                    <span><span className="text-slate-500">Age:</span> <span className="font-semibold text-slate-800">{patient.age ?? '—'}</span></span>
                    <span><span className="text-slate-500">Sex:</span> <span className="font-semibold text-slate-800">{patient.sex || '—'}</span></span>
                    <span><span className="text-slate-500">Address:</span> <span className="font-semibold text-slate-800">{patient.address || '—'}</span></span>
                </div>
            )}

            {/* Rx symbol */}
            <div className="flex items-center gap-3">
                <span className="text-5xl font-serif leading-none text-slate-800 select-none">℞</span>
                <span className="text-sm text-slate-400 font-medium">Add medications below</span>
            </div>

            {/* Medications list */}
            <div className="space-y-3">
                {medications.map((med, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Medication {i + 1}</span>
                            {medications.length > 1 && (
                                <button onClick={() => handleRemoveMed(i)} className="text-xs text-red-400 hover:text-red-600 font-semibold transition-colors">Remove</button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 md:col-span-2">
                                <label className={labelCls}>Medication Name</label>
                                <input type="text" value={med.name} onChange={e => handleMedChange(i, 'name', e.target.value)} className={inputCls} placeholder="e.g. Amoxicillin 500mg" />
                            </div>
                            <div>
                                <label className={labelCls}>Dosage</label>
                                <input type="text" value={med.dosage} onChange={e => handleMedChange(i, 'dosage', e.target.value)} className={inputCls} placeholder="e.g. 500mg" />
                            </div>
                            <div>
                                <label className={labelCls}>Frequency (Sig)</label>
                                <input type="text" value={med.frequency} onChange={e => handleMedChange(i, 'frequency', e.target.value)} className={inputCls} placeholder="e.g. 1x a day" />
                            </div>
                            <div>
                                <label className={labelCls}>Duration</label>
                                <input type="text" value={med.duration} onChange={e => handleMedChange(i, 'duration', e.target.value)} className={inputCls} placeholder="e.g. 7 days" />
                            </div>
                            <div>
                                <label className={labelCls}>Quantity</label>
                                <input type="text" value={med.quantity} onChange={e => handleMedChange(i, 'quantity', e.target.value)} className={inputCls} placeholder="e.g. #21" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={handleAddMed}
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-lg transition-all active:scale-95"
            >
                + Add Another Medication
            </button>

            {/* Signature + credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                    <label className={labelCls}>Doctor's Signature</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-white relative">
                        <div className="absolute top-2 left-3 text-xs text-slate-300 pointer-events-none select-none">Sign here</div>
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor="#1e293b"
                            canvasProps={{ className: 'w-full', height: 130 }}
                        />
                    </div>
                    <button
                        onClick={() => sigCanvas.current?.clear()}
                        className="mt-2 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                    >
                        Clear signature
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className={labelCls}>License No.</label>
                        <input type="text" name="rxLicNo" value={formData.rxLicNo} onChange={handleChange} className={inputCls} placeholder="PRC license number" />
                    </div>
                    <div>
                        <label className={labelCls}>PTR No.</label>
                        <input type="text" name="rxPtrNo" value={formData.rxPtrNo} onChange={handleChange} className={inputCls} placeholder="PTR number" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setActiveTab(7)} className="order-2 sm:order-1 w-full sm:w-auto text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">← Back</button>
                <button
                    onClick={handleSavePrescription}
                    disabled={loading || !patient?.id}
                    className={`order-1 sm:order-2 w-full sm:w-auto text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 duration-200 ${primaryBtnBg}`}
                >
                    {loading ? 'Saving...' : '💊 Authorize & Send to Pharmacy'}
                </button>
            </div>
        </div>
    );

    const tabs = [
        { id: 1, label: "1. Histories" },
        { id: 2, label: "2. OBGyne" },
        { id: 3, label: "3. Assessment" },
        { id: 4, label: "4. Follow-up" },
        { id: 5, label: "5. Clinical Notes" },
        { id: 6, label: "6. Physical Exam" },
        { id: 7, label: "7. Lab Request" },
        { id: 8, label: "8. E-Prescription" },
    ];

    return (
        <div className="flex w-full min-h-screen bg-[#F8FAFC] text-slate-800 overflow-x-hidden">
            {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />}

            <Sidebar activePage="consultation" doctorName={doctorName} doctorInitials={doctorInitials} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} isOnline={isOnline} />

            <div className="flex-1 flex flex-col min-h-screen w-full md:pl-[240px] print:pl-0">
                <header className="h-[64px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 print:hidden shadow-sm md:shadow-none">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <div>
                            <div className="font-bold text-lg text-slate-800 leading-tight">Consultation</div>
                            {patient && !patientLoading && <div className="text-xs text-slate-500 leading-tight">{patientFullName} · {patient.sex || '—'} · {patient.age ?? '—'} y/o</div>}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors duration-300 ${!isOnline ? 'bg-amber-50 border-amber-200' : isSyncing ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                            <span className="relative flex h-2.5 w-2.5">
                                {isOnline && !isSyncing && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
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
                        {renderPatientCard()}
                        <div className="flex gap-1 mb-8 border-b border-slate-200 print:hidden overflow-x-auto whitespace-nowrap w-full scrollbar-hide">
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-bold rounded-t-xl transition-all border-b-2 flex-shrink-0 ${activeTab === tab.id ? 'text-blue-600 bg-white border-blue-600 shadow-[0_-4px_15px_rgba(0,0,0,0.03)]' : 'text-slate-400 border-transparent hover:bg-white hover:text-slate-600'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 print:hidden">
                            {activeTab === 1 && renderTab1()}
                            {activeTab === 2 && renderTab2()}
                            {activeTab === 3 && renderTab3()}
                            {activeTab === 4 && renderTab4()}
                            {activeTab === 5 && renderTab5()}
                            {activeTab === 6 && renderTab6()}
                            {activeTab === 7 && renderTab7()}
                            {activeTab === 8 && renderTab8()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<ConsultationPage />);
}