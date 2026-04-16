import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';
import { Sidebar } from './sidebar';
import SignatureCanvas from 'react-signature-canvas';
import { useNetworkSync, saveToIndexedDB, initIndexedDB } from '../shared/useNetworkSync';
import { OfflineBanner } from './OfflineBanner';

interface FollowUpData {
    date: string; time: string; modeOfTx: string; modeOfTransfer: string;
    chiefComplaint: string; diagnosis: string; hpi: string;
    vitals: { bp: string; hr: string; rr: string; temp: string; o2: string; wt: string; ht: string; muac: string; nutStatus: string; bmi: string; vaL: string; vaR: string; bloodType: string; genSurvey: string; };
    medicationTreatment: string; labResults: string; signatureUrl: string;
}

const EMPTY_FORM: FollowUpData = {
    date: '', time: '', modeOfTx: '', modeOfTransfer: '', chiefComplaint: '', diagnosis: '', hpi: '',
    vitals: { bp: '', hr: '', rr: '', temp: '', o2: '', wt: '', ht: '', muac: '', nutStatus: '', bmi: '', vaL: '', vaR: '', bloodType: '', genSurvey: '' },
    medicationTreatment: '', labResults: '', signatureUrl: ''
};

export default function FollowUp() {
    const [role, setRole] = useState<string | null>(null);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('');
    const [patient, setPatient] = useState<any>(null);
    const [patientId, setPatientId] = useState<string | null>(null);
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const [formData, setFormData] = useState<FollowUpData>(EMPTY_FORM);
    const sigCanvas = useRef<SignatureCanvas | null>(null);

    const { isOnline, isSyncing } = useNetworkSync();

    // ─── INIT & AUTH ─────────────────────────────────────────────────────────
    useEffect(() => {
        initIndexedDB('MediSensDB', 'offline_patients');

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) return window.location.href = '/pages/login.html';
            
            const { data } = await supabase.from('profiles').select('role, full_name').eq('id', session.user.id).single();
            if (!data || !['doctor', 'nurse'].includes(data.role)) return window.location.href = '/pages/login.html';
            
            setRole(data.role);
            setUserName(data.full_name);
            setUserInitials(data.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2));

            // Fetch Patient Info
            const pId = new URLSearchParams(window.location.search).get('id');
            if (pId) {
                setPatientId(pId);
                const { data: ptData } = await supabase.from('patients').select('*').eq('id', pId).single();
                if (ptData) setPatient(ptData);
            }
        });
    }, []);

    // ─── HANDLERS ────────────────────────────────────────────────────────────
    const handleVitalChange = (field: string, value: string) => setFormData(prev => ({ ...prev, vitals: { ...prev.vitals, [field]: value } }));
    
    const toNumberOrNull = (val: string) => {
        if (!val || val.trim() === '') return null;
        const parsed = Number(val);
        return isNaN(parsed) ? null : parsed;
    };

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 4000);
    };

    const w = parseFloat(formData.vitals.wt);
    const h = parseFloat(formData.vitals.ht);
    const computedBmi = (w > 0 && h > 0) ? (w / ((h / 100) * (h / 100))).toFixed(1) : '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId) { alert('No patient selected.'); return; }
        setIsSubmitting(true);

        try {
            const sigUrl = sigCanvas.current?.getCanvas().toDataURL('image/png') || '';
            const payload = { 
                patient_id: patientId,
                visit_date: formData.date || null,
                visit_time: formData.time || null,
                mode_of_transaction: formData.modeOfTx || null,
                mode_of_transfer: formData.modeOfTransfer || null,
                chief_complaint: formData.chiefComplaint || null,
                diagnosis: formData.diagnosis || null,
                history_of_present_illness: formData.hpi || null,
                
                bp: formData.vitals.bp || null,
                heart_rate: toNumberOrNull(formData.vitals.hr),
                respiratory_rate: toNumberOrNull(formData.vitals.rr),
                temperature: toNumberOrNull(formData.vitals.temp),
                o2_saturation: toNumberOrNull(formData.vitals.o2),
                weight: toNumberOrNull(formData.vitals.wt),
                height: toNumberOrNull(formData.vitals.ht),
                muac: toNumberOrNull(formData.vitals.muac),
                nutritional_status: formData.vitals.nutStatus || null,
                bmi: computedBmi ? parseFloat(computedBmi) : toNumberOrNull(formData.vitals.bmi),
                visual_acuity_left: formData.vitals.vaL || null,
                visual_acuity_right: formData.vitals.vaR || null,
                blood_type: formData.vitals.bloodType || null,
                general_survey: formData.vitals.genSurvey || null,
                
                medication_treatment: formData.medicationTreatment || null,
                lab_results: formData.labResults || null,
                signature_url: sigUrl
            };

            if (isOnline) {
                const { error } = await supabase.from('follow_up').insert([payload]);
                if (error) throw error;
                showToast('Follow-up record saved to database successfully!', true);
            } else {
                await saveToIndexedDB('MediSensDB', 'offline_patients', { id: Date.now(), type: 'follow_up', data: payload });
                showToast('Offline Mode: Follow-up record saved locally!', true);
            }
            
            setFormData(EMPTY_FORM);
            sigCanvas.current?.clear();
        } catch (err: any) { 
            showToast('Error: ' + err.message, false); 
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── STYLES & RENDER ─────────────────────────────────────────────────────
    if (!role) return null;

    const inputCls = "w-full bg-white border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm text-slate-800 transition-all disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";
    const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";
    const sectionCls = "bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm mb-6";
    const headerCls = "text-sm font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-5";

    const navItems = role === 'doctor' 
        ? [ { id: 'dashboard', label: 'Dashboard', icon: '🏠' }, { id: 'records', label: 'Patient Records', icon: '📁' }, { id: 'consultation', label: 'Consultation', icon: '📋' } ]
        : [ { id: 'dashboard', label: 'Dashboard', icon: '🏠' }, { id: 'new-record', label: 'New Record', icon: '➕' }, { id: 'consultation', label: 'Consultation', icon: '📋' } ];

    const patientFullName = patient ? `${patient.lastName}, ${patient.firstName} ${patient.middleName || ''}`.trim() : 'Loading...';
    const patientInitials = patient ? `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase() : '?';

    return (
        <div className="flex w-full min-h-screen bg-[#F8FAFC] text-slate-800 overflow-x-hidden font-sans">
            
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 fade-in ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">{toast.ok ? '✓' : '✕'}</div>
                    <p className="font-bold text-sm">{toast.msg}</p>
                </div>
            )}

            {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

            <Sidebar 
                activePage="consultation"
                userName={userName} 
                userInitials={userInitials}
                userRole={role === 'doctor' ? 'General Practitioner' : 'Registered Nurse'}
                navItems={navItems}
                onNavigate={(pageId) => {
                    if (pageId === 'dashboard') window.location.href = `/pages/${role}.html`;
                    if (pageId === 'records') window.location.href = '/pages/records.html';
                    if (pageId === 'new-record') window.location.href = '/pages/templates.html';
                    if (pageId === 'consultation') window.location.href = role === 'doctor' ? '/pages/consultation.html' : '/pages/initial_consultation.html';
                }}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            <div className="flex-1 flex flex-col min-h-screen w-full md:pl-[240px] print:pl-0">
                {/* TOPBAR */}
                <header className="h-[64px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm md:shadow-none">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <div className="font-bold text-lg text-slate-800">Follow-Up Visitation</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{userName}</div>
                            <div className="text-[0.7rem] text-slate-500 capitalize">{role}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">{userInitials}</div>
                    </div>
                </header>

                <OfflineBanner isOnline={isOnline} />

                {/* MAIN CONTENT */}
                <main className="w-full flex-1 p-4 md:p-8 flex justify-center">
                    <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => window.history.back()} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-colors">← Back</button>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Follow-Up Record</h1>
                                <p className="text-sm text-slate-500 font-medium mt-1">RHU Form Part IV</p>
                            </div>
                        </div>

                        {/* Patient Card */}
                        {patient && (
                            <div className="w-full bg-white border border-slate-200 rounded-xl p-5 mb-6 flex flex-wrap items-center gap-4 shadow-sm">
                                <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                                    {patientInitials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-900 text-lg leading-tight truncate">{patientFullName}</div>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5">
                                        <span className="text-sm text-slate-500"><span className="font-semibold text-slate-700">{patient.age ?? '—'}</span> yrs old</span>
                                        <span className="text-sm text-slate-500"><span className="font-semibold text-slate-700">{patient.sex || '—'}</span></span>
                                        <span className="text-sm text-slate-500">Blood Type: <span className="font-semibold text-slate-700">{patient.bloodType || '—'}</span></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* SECTION 1: General Info */}
                            <div className={sectionCls}>
                                <h3 className={headerCls}>General Information</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                                    <div><label className={labelCls}>Date</label><input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputCls} required /></div>
                                    <div><label className={labelCls}>Time</label><input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className={inputCls} /></div>
                                    <div>
                                        <label className={labelCls}>Mode of Tx</label>
                                        <select value={formData.modeOfTx} onChange={e => setFormData({...formData, modeOfTx: e.target.value})} className={inputCls}>
                                            <option value="">Select...</option><option value="Walk-in">Walk-in</option><option value="Referral">Referral</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Mode of Transfer</label>
                                        <select value={formData.modeOfTransfer} onChange={e => setFormData({...formData, modeOfTransfer: e.target.value})} className={inputCls}>
                                            <option value="">Select...</option><option value="Ambulatory">Ambulatory</option><option value="Wheelchair">Via wheelchair</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: Clinical Assessment */}
                            <div className={sectionCls}>
                                <h3 className={headerCls}>Clinical Assessment</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                                    <div><label className={labelCls}>Chief Complaints</label><textarea rows={4} value={formData.chiefComplaint} onChange={e => setFormData({...formData, chiefComplaint: e.target.value})} className={`${inputCls} resize-y`} placeholder="Describe current symptoms..." /></div>
                                    <div>
                                        <label className={labelCls}>Diagnosis <span className="text-slate-400 font-normal normal-case">(Doctor Only)</span></label>
                                        <textarea rows={4} value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} className={`${inputCls} resize-y`} disabled={role === 'nurse'} placeholder={role === 'nurse' ? 'Awaiting Doctor\'s diagnosis' : 'Enter diagnosis...'} />
                                    </div>
                                </div>
                                <div><label className={labelCls}>History of Present Illness</label><textarea rows={3} value={formData.hpi} onChange={e => setFormData({...formData, hpi: e.target.value})} className={`${inputCls} resize-y`} placeholder="Updates since last visit..." /></div>
                            </div>

                            {/* SECTION 3: Vitals */}
                            <div className={sectionCls}>
                                <h3 className={headerCls}>Physical Examination (Vitals)</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                                    <div><label className={labelCls}>BP (mmHg)</label><input type="text" value={formData.vitals.bp} onChange={e => handleVitalChange('bp', e.target.value)} className={inputCls} placeholder="120/80" /></div>
                                    <div><label className={labelCls}>Heart Rate (bpm)</label><input type="number" value={formData.vitals.hr} onChange={e => handleVitalChange('hr', e.target.value)} className={inputCls} placeholder="72" /></div>
                                    <div><label className={labelCls}>Resp Rate (cpm)</label><input type="number" value={formData.vitals.rr} onChange={e => handleVitalChange('rr', e.target.value)} className={inputCls} placeholder="16" /></div>
                                    <div><label className={labelCls}>Temp (°C)</label><input type="number" step="0.1" value={formData.vitals.temp} onChange={e => handleVitalChange('temp', e.target.value)} className={inputCls} placeholder="36.5" /></div>
                                    <div><label className={labelCls}>O₂ Sat (%)</label><input type="number" value={formData.vitals.o2} onChange={e => handleVitalChange('o2', e.target.value)} className={inputCls} placeholder="98" /></div>
                                    <div><label className={labelCls}>Weight (kg)</label><input type="number" step="0.1" value={formData.vitals.wt} onChange={e => handleVitalChange('wt', e.target.value)} className={inputCls} placeholder="65.0" /></div>
                                    <div><label className={labelCls}>Height (cm)</label><input type="number" step="0.1" value={formData.vitals.ht} onChange={e => handleVitalChange('ht', e.target.value)} className={inputCls} placeholder="165.0" /></div>
                                    <div>
                                        <label className={labelCls}>BMI</label>
                                        <input type="text" value={computedBmi || formData.vitals.bmi} readOnly={!!computedBmi} onChange={e => handleVitalChange('bmi', e.target.value)} className={`${inputCls} ${computedBmi ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''}`} placeholder="—" />
                                    </div>
                                    <div><label className={labelCls}>MUAC (cm)</label><input type="number" step="0.1" value={formData.vitals.muac} onChange={e => handleVitalChange('muac', e.target.value)} className={inputCls} placeholder="28.5" /></div>
                                    
                                    <div className="col-span-2 sm:col-span-1 md:col-span-2">
                                        <label className={labelCls}>Nutritional Status</label>
                                        <select value={formData.vitals.nutStatus} onChange={e => handleVitalChange('nutStatus', e.target.value)} className={inputCls}>
                                            <option value="">Select...</option>
                                            <option value="Normal">Normal</option>
                                            <option value="Underweight">Underweight</option>
                                            <option value="Overweight">Overweight</option>
                                            <option value="Obese">Obese</option>
                                        </select>
                                    </div>
                                    <div><label className={labelCls}>Blood Type</label><input type="text" value={formData.vitals.bloodType} onChange={e => handleVitalChange('bloodType', e.target.value)} className={inputCls} placeholder="O+" /></div>

                                    <div><label className={labelCls}>VA Left Eye</label><input type="text" value={formData.vitals.vaL} onChange={e => handleVitalChange('vaL', e.target.value)} className={inputCls} placeholder="20/20" /></div>
                                    <div><label className={labelCls}>VA Right Eye</label><input type="text" value={formData.vitals.vaR} onChange={e => handleVitalChange('vaR', e.target.value)} className={inputCls} placeholder="20/20" /></div>
                                    
                                    <div className="col-span-2 md:col-span-2">
                                        <label className={labelCls}>General Survey</label>
                                        <input type="text" value={formData.vitals.genSurvey} onChange={e => handleVitalChange('genSurvey', e.target.value)} className={inputCls} placeholder="Awake, alert..." />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: Treatment & Signature */}
                            <div className={sectionCls}>
                                <h3 className={headerCls}>Treatment & Authentication</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <label className={labelCls}>Medication and Treatment <span className="text-slate-400 font-normal normal-case">(Doctor Only)</span></label>
                                        <textarea rows={5} value={formData.medicationTreatment} onChange={e => setFormData({...formData, medicationTreatment: e.target.value})} className={`${inputCls} resize-y`} disabled={role === 'nurse'} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Laboratory Result/s <span className="text-slate-400 font-normal normal-case">(Doctor Only)</span></label>
                                        <textarea rows={5} value={formData.labResults} onChange={e => setFormData({...formData, labResults: e.target.value})} className={`${inputCls} resize-y`} disabled={role === 'nurse'} />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <div className="w-full md:w-96">
                                        <label className={labelCls}>Name & Signature of Provider</label>
                                        <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl h-36 mb-2 relative overflow-hidden cursor-crosshair">
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold text-sm pointer-events-none select-none uppercase tracking-widest">Sign Here</div>
                                            <SignatureCanvas ref={sigCanvas} canvasProps={{ className: 'w-full h-full relative z-10' }} />
                                        </div>
                                        <button type="button" onClick={() => sigCanvas.current?.clear()} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider">Clear Signature</button>
                                    </div>
                                </div>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <div className="flex justify-end pb-10">
                                <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white font-extrabold text-sm rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
                                    {isSubmitting ? <span className="animate-pulse">Saving Record...</span> : '💾 Save Follow-up Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}

const rootEl = document.getElementById('root');
if (rootEl) ReactDOM.createRoot(rootEl).render(<React.StrictMode><FollowUp /></React.StrictMode>);