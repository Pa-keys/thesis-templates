import React, { useState, useEffect } from 'react';
import { useToast } from '../feedback/Toast';
import { updatePatientRecord } from '../../features/patients/services';
import { getErrorMessage } from '../../lib/utils/errors';
import { fetchPatientTransactions, type PatientTransaction } from '../../features/patients/history';
import { PatientTransactionHistory } from './PatientTransactionHistory';
import { saveVaccineRecord, fetchVaccineRecords, removeVaccineRecord } from '../../features/patients/vaccineService';
import type { VaccineRecord } from '../../features/patients/itemization';

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

// Type-specific icon and label helpers for the history view
const TYPE_ICON: Record<string, string> = {
    registration: '📋',
    consent: '✍️',
    initial_consultation: '🩺',
    doctor_consultation: '👨‍⚕️',
    lab_request: '🔬',
    lab_result: '📊',
    prescription: '💊',
    pharmacy: '💊',
    vaccine: '💉',
    follow_up: '📅',
};

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
    const [transactions, setTransactions] = useState<PatientTransaction[]>([]);

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState<Patient>({ ...initialPatient });
    const { showToast, ToastComponent } = useToast();

    const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([]);
    const [vaccineLoading, setVaccineLoading] = useState(false);
    const [showAddVaccine, setShowAddVaccine] = useState(false);
    const [newVaccine, setNewVaccine] = useState<VaccineRecord>({
        vaccine_name: '',
        dose_label: '',
        date_given: '',
        remarks: '',
    });

    // Sync local state if prop changes (though usually initialPatient won't change while modal is open)
    useEffect(() => {
        setPatient(initialPatient);
        setEditForm({ ...initialPatient });
    }, [initialPatient]);

    const loadHistory = async () => {
        setShowHistory(true);
        setHistoryLoading(true);
        try {
            const transactionData = await fetchPatientTransactions(patient.id);
            setTransactions(transactionData);
        } catch (err) {
            console.error('Failed to load history:', err);
            showToast('Failed to load complete transaction history: ' + getErrorMessage(err), true);
            setTransactions([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const loadVaccineRecords = async () => {
        setVaccineLoading(true);
        try {
            const records = await fetchVaccineRecords(patient.id);
            setVaccineRecords(records);
        } catch (err) {
            console.error('Failed to load vaccine records:', err);
            showToast('Failed to load vaccine records: ' + getErrorMessage(err), true);
        } finally {
            setVaccineLoading(false);
        }
    };

    useEffect(() => {
        loadVaccineRecords();
    }, [patient.id]);

    const handleAddVaccine = async () => {
        if (!newVaccine.vaccine_name.trim() || !newVaccine.date_given) {
            showToast('Vaccine name and date are required.', true);
            return;
        }
        try {
            await saveVaccineRecord(patient.id, newVaccine);
            showToast('Vaccine record saved successfully.', false);
            setShowAddVaccine(false);
            setNewVaccine({ vaccine_name: '', dose_label: '', date_given: '', remarks: '' });
            await loadVaccineRecords();
        } catch (err) {
            showToast('Failed to save vaccine record: ' + getErrorMessage(err), true);
        }
    };

    const handleRemoveVaccine = async (index: number) => {
        try {
            await removeVaccineRecord(patient.id, index);
            showToast('Vaccine record removed.', false);
            await loadVaccineRecords();
        } catch (err) {
            showToast('Failed to remove vaccine record: ' + getErrorMessage(err), true);
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

            await updatePatientRecord(patient.id, updateData);

            setPatient(payload);
            setIsEditing(false);
            if (onPatientUpdate) {
                onPatientUpdate(payload);
            }
            showToast('Patient details updated.', false);
        } catch (err) {
            showToast('Failed to save changes: ' + getErrorMessage(err), true);
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
                    <label className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">{label}</label>
                    {type === "select" ? (
                        <select
                            name={name}
                            value={editForm[name] as string || ''}
                            onChange={handleInputChange}
                            className="text-left text-sm font-semibold border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white text-slate-900 shadow-sm"
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
                            className="text-left text-sm font-semibold border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white text-slate-900 shadow-sm"
                        />
                    )}
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-1">
                <div className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">{label}</div>
                <div className={`min-h-[2.25rem] rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold ${isEmpty ? 'text-slate-500 italic' : 'text-slate-800'}`}>
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
    const headerCls = "flex items-center gap-2 text-xs font-extrabold text-blue-600  uppercase tracking-widest border-b border-blue-100  pb-2 mb-4";

    return (
        <>
            <ToastComponent />
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]" onClick={onClose} />

            {/* Modal Panel */}
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-transparent">

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
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">

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
                                {!isEditing && (
                                    <div className={sectionCls}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className={headerCls} style={{ marginBottom: 0 }}><span>💉</span> Vaccination Records ({vaccineRecords.length})</div>
                                            <button
                                                onClick={() => setShowAddVaccine(!showAddVaccine)}
                                                className="text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                {showAddVaccine ? '✕ Cancel' : '+ Add Vaccine'}
                                            </button>
                                        </div>

                                        {showAddVaccine && (
                                            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Vaccine Name *</label>
                                                        <input
                                                            type="text"
                                                            value={newVaccine.vaccine_name}
                                                            onChange={(e) => setNewVaccine(p => ({ ...p, vaccine_name: e.target.value }))}
                                                            placeholder="e.g. BCG, OPV, DPT"
                                                            className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Dose / Label</label>
                                                        <input
                                                            type="text"
                                                            value={newVaccine.dose_label}
                                                            onChange={(e) => setNewVaccine(p => ({ ...p, dose_label: e.target.value }))}
                                                            placeholder="e.g. Dose 1, Booster"
                                                            className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Date Given *</label>
                                                        <input
                                                            type="date"
                                                            value={newVaccine.date_given}
                                                            onChange={(e) => setNewVaccine(p => ({ ...p, date_given: e.target.value }))}
                                                            className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Remarks</label>
                                                        <input
                                                            type="text"
                                                            value={newVaccine.remarks || ''}
                                                            onChange={(e) => setNewVaccine(p => ({ ...p, remarks: e.target.value }))}
                                                            placeholder="Optional notes"
                                                            className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleAddVaccine}
                                                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2 rounded-lg transition-colors"
                                                >
                                                    Save Vaccine Record
                                                </button>
                                            </div>
                                        )}

                                        {vaccineLoading ? (
                                            <div className="py-4 flex justify-center">
                                                <svg className="animate-spin w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                </svg>
                                            </div>
                                        ) : vaccineRecords.length === 0 ? (
                                            <p className="text-sm text-slate-400 italic text-center py-4 bg-white rounded-xl border border-slate-200">
                                                No vaccination records found.
                                            </p>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                {vaccineRecords.map((vr, i) => (
                                                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-teal-300 transition-colors relative">
                                                        <button
                                                            onClick={() => handleRemoveVaccine(i)}
                                                            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors text-xs font-bold"
                                                            title="Remove vaccine record"
                                                        >
                                                            ✕
                                                        </button>
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                            <div>
                                                                <div className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Vaccine</div>
                                                                <div className="text-sm font-bold text-slate-800">{vr.vaccine_name}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dose</div>
                                                                <div className="text-sm font-semibold text-slate-700">{vr.dose_label || '—'}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Date Given</div>
                                                                <div className="text-sm font-semibold text-slate-700">{vr.date_given || '—'}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Remarks</div>
                                                                <div className="text-sm font-semibold text-slate-700">{vr.remarks || '—'}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

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
                                    <div className="sticky bottom-0 bg-[#F8FAFC] pt-4 border-t border-slate-100 flex gap-3">
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
                                    className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    ← Back to Details
                                </button>

                                {historyLoading ? (
                                    <div className="py-16 flex flex-col items-center text-slate-400">
                                        <svg className="animate-spin w-10 h-10 text-teal-500 mb-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        <span className="text-sm font-bold">Loading complete patient history...</span>
                                    </div>
                                ) : (
                                    <div className="mb-6">
                                        <div className={headerCls}>
                                            <span>📋</span> Complete Patient History ({transactions.length} events)
                                        </div>
                                        <PatientTransactionHistory transactions={transactions} isLoading={historyLoading} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
