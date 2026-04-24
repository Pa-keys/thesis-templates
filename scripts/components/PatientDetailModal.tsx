import React, { useState, useEffect } from 'react';
import { supabase } from '../../shared/supabase';

export interface Patient {
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

export interface InitialConsultation {
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

export interface Consultation {
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

interface PatientDetailModalProps {
    patient: Patient;
    onClose: () => void;
    onPatientUpdate?: (updatedPatient: Patient) => void;
}

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown'] as const;
const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'] as const;
const EDUCATION_LEVELS = [
    'No Formal Education', 'Elementary Level', 'Elementary Graduate',
    'High School Level', 'High School Graduate', 'Vocational',
    'College Level', 'College Graduate', 'Post-Graduate'
] as const;
const EMPLOYMENT_STATUSES = ['Employed', 'Unemployed', 'Self-Employed', 'Student', 'Retired'] as const;

export function PatientDetailModal({
    patient: initialPatient,
    onClose,
    onPatientUpdate,
}: PatientDetailModalProps) {
    const [patient, setPatient] = useState<Patient>(initialPatient);
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [initialConsults, setInitialConsults] = useState<InitialConsultation[]>([]);
    const [consultations, setConsultations] = useState<Consultation[]>([]);

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState<Patient>({ ...initialPatient });

    // Sync local state if prop changes (though usually initialPatient won't change while modal is open)
    useEffect(() => {
        setPatient(initialPatient);
        setEditForm({ ...initialPatient });
    }, [initialPatient]);

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

    const handleEditToggle = () => {
        if (isEditing) {
            setEditForm({ ...patient }); // Reset form on cancel
        }
        setIsEditing(!isEditing);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Convert age to number if it's a string from input
            const payload = {
                ...editForm,
                age: editForm.age ? parseInt(editForm.age.toString()) : null
            };

            // Remove fields that shouldn't be updated or cause issues
            const { id, createdAt, created_at, ...updateData } = payload as any;

            const { error } = await supabase
                .from('patients')
                .update(updateData)
                .eq('id', patient.id);

            if (error) throw error;

            setPatient(payload);
            setIsEditing(false);
            if (onPatientUpdate) {
                onPatientUpdate(payload);
            }
        } catch (err: any) {
            alert('Failed to save changes: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const DetailItem = ({ label, value, name, type = "text", options }: {
        label: string;
        value?: string | number | null;
        name: keyof Patient;
        type?: "text" | "select" | "date" | "number";
        options?: readonly string[];
    }) => {
        const isEmpty = value === null || value === undefined || value === '';

        if (isEditing) {
            return (
                <div className="flex flex-col gap-1">
                    <label className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">{label}</label>
                    {type === "select" ? (
                        <select
                            name={name}
                            value={editForm[name] as string || ''}
                            onChange={handleInputChange}
                            className="text-sm font-semibold border border-slate-200 dark:border-neutral-800 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100"
                        >
                            <option value="">Select...</option>
                            {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ) : (
                        <input
                            type={type}
                            name={name}
                            value={editForm[name] as string | number || ''}
                            onChange={handleInputChange}
                            className="text-sm font-semibold border border-slate-200 dark:border-neutral-800 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100"
                        />
                    )}
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-1">
                <div className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">{label}</div>
                <div className={`text-sm font-semibold ${isEmpty ? 'text-slate-400 italic' : 'text-slate-800 dark:text-neutral-200'}`}>
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
    const headerCls = "flex items-center gap-2 text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest border-b border-blue-100 dark:border-blue-900/50 pb-2 mb-4";

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]" onClick={onClose} />

            {/* Modal Panel */}
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-transparent dark:border-neutral-800">

                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-base shadow-sm ${patient.sex === 'Male' ? 'bg-blue-600' : 'bg-pink-500'}`}>
                                {(patient.firstName?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                                <div className="font-extrabold text-slate-900 dark:text-neutral-100 leading-tight">
                                    {patient.lastName}, {patient.firstName} {patient.middleName || ''}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-neutral-400 font-medium mt-0.5">
                                    {patient.sex || '—'} · {patient.age ?? '—'} yrs · {patient.bloodType || '—'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!showHistory && (
                                <button
                                    onClick={handleEditToggle}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${isEditing ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                >
                                    {isEditing ? '✕ Cancel' : 'Edit Profile'}
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC] dark:bg-neutral-950">

                        {!showHistory ? (
                            <>
                                {/* Patient Info */}
                                <div className={sectionCls}>
                                    <div className={headerCls}><span>👤</span> Personal Information</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <DetailItem label="First Name" value={patient.firstName} name="firstName" />
                                        <DetailItem label="Middle Name" value={patient.middleName} name="middleName" />
                                        <DetailItem label="Last Name" value={patient.lastName} name="lastName" />
                                        <DetailItem label="Age" value={patient.age} name="age" type="number" />
                                        <DetailItem label="Sex" value={patient.sex} name="sex" type="select" options={['Male', 'Female']} />
                                        <DetailItem label="Birthday" value={patient.birthday} name="birthday" type="date" />
                                        <DetailItem label="Blood Type" value={patient.bloodType} name="bloodType" type="select" options={BLOOD_TYPES} />
                                        <DetailItem label="Civil Status" value={patient.civilStatus} name="civilStatus" type="select" options={CIVIL_STATUSES} />
                                        <DetailItem label="Nationality" value={patient.nationality} name="nationality" />
                                        <DetailItem label="Religion" value={patient.religion} name="religion" />
                                        <DetailItem label="Contact Number" value={patient.contactNumber} name="contactNumber" />
                                        <DetailItem label="Educational Attainment" value={patient.educationalAttain} name="educationalAttain" type="select" options={EDUCATION_LEVELS} />
                                        <DetailItem label="Employment Status" value={patient.employmentStatus} name="employmentStatus" type="select" options={EMPLOYMENT_STATUSES} />
                                        <div className="col-span-2 sm:col-span-3">
                                            <DetailItem label="Address" value={patient.address} name="address" />
                                        </div>
                                    </div>
                                </div>

                                <div className={sectionCls}>
                                    <div className={headerCls}><span>🏥</span> PhilHealth & Categorization</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <DetailItem label="PhilHealth No." value={patient.philhealthNo} name="philhealthNo" />
                                        <DetailItem label="PhilHealth Status" value={patient.philhealthStatus} name="philhealthStatus" type="select" options={['Member', 'Dependent', '4Ps', 'None']} />
                                        {isEditing ? (
                                            <>
                                                <DetailItem label="Category" value={editForm.category} name="category" type="select" options={['4Ps', 'Other/s']} />
                                                {editForm.category === 'Other/s' && (
                                                    <DetailItem label="Specify Category" value={editForm.categoryOthers} name="categoryOthers" />
                                                )}
                                            </>
                                        ) : (
                                            <DetailItem label="Category" value={displayCategory()} name="category" />
                                        )}
                                    </div>
                                </div>

                                <div className={sectionCls}>
                                    <div className={headerCls}><span>🆘</span> Emergency Contact</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <DetailItem label="Relative's Name" value={patient.relativeName} name="relativeName" />
                                        <DetailItem label="Relationship" value={patient.relativeRelation} name="relativeRelation" />
                                        <div className="col-span-2 sm:col-span-3">
                                            <DetailItem label="Relative's Address" value={patient.relativeAddress} name="relativeAddress" />
                                        </div>
                                    </div>
                                </div>

                                {isEditing ? (
                                    <div className="sticky bottom-0 bg-[#F8FAFC] dark:bg-neutral-950 pt-4 border-t border-slate-100 dark:border-neutral-800 flex gap-3">
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-extrabold text-sm uppercase tracking-wider py-3.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {isSaving ? '⏳ Saving...' : '💾 Save Changes'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={loadHistory}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm uppercase tracking-wider py-3.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                                    >
                                        📋 View Consultation History
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Back to Details */}
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200 transition-colors"
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
                                                        <div key={ic.initialconsultation_id} className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
                                                            <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100 dark:border-neutral-800 gap-2">
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
                                                                <div className="sm:col-span-2 bg-slate-50 dark:bg-neutral-800 rounded-lg p-3 border border-slate-100 dark:border-neutral-700">
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Chief Complaint</div>
                                                                    <div className="text-sm font-semibold text-slate-800 dark:text-neutral-200">{ic.chief_complaint || 'None recorded'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Diagnosis</div>
                                                                    <div className="text-sm text-slate-800 dark:text-neutral-300">{ic.diagnosis || '—'}</div>
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
                                                <div className="flex-col flex gap-3">
                                                    {consultations.map((c) => (
                                                        <div key={c.consultation_id} className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="sm:col-span-2 bg-slate-50 dark:bg-neutral-800 rounded-lg p-3 border border-slate-100 dark:border-neutral-700">
                                                                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Chief Complaints</div>
                                                                    <div className="text-sm font-semibold text-slate-800 dark:text-neutral-200">{c.chief_complaints || 'None recorded'}</div>
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
