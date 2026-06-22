import React, { useState, useEffect } from 'react';
import { useToast } from '../feedback/Toast';
import { updatePatientRecord } from '../../features/patients/services';
import { getErrorMessage } from '../../lib/utils/errors';
import { PatientTransactionHistory } from './PatientTransactionHistory';
import { saveVaccineRecord, fetchVaccineRecords, removeVaccineRecord } from '../../features/patients/vaccineService';
import type { VaccineRecord } from '../../features/patients/itemization';
import {
    OTHER_VACCINE_NAME,
    VACCINE_OPTIONS,
    cleanVaccineRecord,
    createVaccineRecord,
    getVaccineCategory,
    getVaccineDisplayName,
} from '../../features/vaccines/vaccineOptions';

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

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState<Patient>({ ...initialPatient });
    const { showToast, ToastComponent } = useToast();

    const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([]);
    const [vaccineLoading, setVaccineLoading] = useState(false);
    const [vaccineSaving, setVaccineSaving] = useState(false);
    const [removingVaccineId, setRemovingVaccineId] = useState<string | null>(null);
    const [pendingRemoveVaccine, setPendingRemoveVaccine] = useState<VaccineRecord | null>(null);
    const [vaccineLoadError, setVaccineLoadError] = useState<string | null>(null);
    const [showAddVaccine, setShowAddVaccine] = useState(false);
    const [newVaccine, setNewVaccine] = useState<VaccineRecord>(createVaccineRecord());

    // Sync local state if prop changes (though usually initialPatient won't change while modal is open)
    useEffect(() => {
        setPatient(initialPatient);
        setEditForm({ ...initialPatient });
    }, [initialPatient]);

    const loadHistory = () => setShowHistory(true);

    const loadVaccineRecords = async () => {
        setVaccineLoading(true);
        setVaccineLoadError(null);
        try {
            const records = await fetchVaccineRecords(patient.id);
            setVaccineRecords(records);
        } catch (err) {
            console.error('Failed to load vaccine records:', err);
            const message = getErrorMessage(err);
            setVaccineLoadError(message);
            showToast('Failed to load vaccine records: ' + message, true);
        } finally {
            setVaccineLoading(false);
        }
    };

    useEffect(() => {
        loadVaccineRecords();
    }, [patient.id]);

    const updateNewVaccine = (field: keyof VaccineRecord, value: string) => {
        setNewVaccine(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'vaccine_name') {
                next.vaccine_category = getVaccineCategory(value);
                if (value !== OTHER_VACCINE_NAME) next.other_vaccine_name = '';
            }
            return next;
        });
    };

    const handleAddVaccine = async () => {
        if (!navigator.onLine) {
            showToast('You are offline. Vaccine records cannot be saved until the connection is restored.', true);
            return;
        }

        const cleanRecord = cleanVaccineRecord(newVaccine);
        if (!cleanRecord.vaccine_name || !cleanRecord.date_given) {
            showToast('Vaccine name and date are required.', true);
            return;
        }
        if (cleanRecord.vaccine_name === OTHER_VACCINE_NAME && !cleanRecord.other_vaccine_name) {
            showToast('Specify the vaccine name for Others / Specify.', true);
            return;
        }
        try {
            setVaccineSaving(true);
            await saveVaccineRecord(patient.id, cleanRecord);
            showToast('Vaccine record saved successfully.', false);
            setShowAddVaccine(false);
            setNewVaccine(createVaccineRecord());
            await loadVaccineRecords();
        } catch (err) {
            showToast('Failed to save vaccine record: ' + getErrorMessage(err), true);
        } finally {
            setVaccineSaving(false);
        }
    };

    const handleRemoveVaccine = async (record: VaccineRecord) => {
        if (!navigator.onLine) {
            showToast('You are offline. Vaccine records cannot be removed until the connection is restored.', true);
            return;
        }
        try {
            setRemovingVaccineId(record.id);
            await removeVaccineRecord(patient.id, record.id);
            showToast('Vaccine record removed.', false);
            setPendingRemoveVaccine(null);
            await loadVaccineRecords();
        } catch (err) {
            showToast('Failed to remove vaccine record: ' + getErrorMessage(err), true);
        } finally {
            setRemovingVaccineId(null);
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
                            className={inputCls}
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
                            className={inputCls}
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

    const sectionCls = "mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
    const headerCls = "flex items-center gap-2 text-xs font-extrabold text-blue-700 uppercase tracking-widest border-b border-blue-100 pb-2 mb-4";
    const focusCls = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
    const inputCls = `w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${focusCls}`;
    const vaccineInputCls = `w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${focusCls}`;

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
                                    type="button"
                                    onClick={handleEditToggle}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${focusCls} ${isEditing ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                >
                                    {isEditing ? 'Cancel' : 'Edit Profile'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close patient details"
                                className={`w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors font-bold text-sm ${focusCls}`}
                            >
                                X
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">

                        {!showHistory ? (
                            <>
                                {/* Patient Info */}
                                <div className={sectionCls}>
                                    <div className={headerCls}>Personal Information</div>
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
                                    <div className={headerCls}>PhilHealth & Categorization</div>
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
                                {!isEditing && (
                                    <div className={sectionCls}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className={headerCls} style={{ marginBottom: 0 }}>Vaccination Records ({vaccineRecords.length})</div>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddVaccine(!showAddVaccine)}
                                                className={`text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${focusCls}`}
                                            >
                                                {showAddVaccine ? 'Cancel' : 'Add Vaccine'}
                                            </button>
                                        </div>

                                        {showAddVaccine && (
                                            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Vaccine Name *</label>
                                                        <select
                                                            value={newVaccine.vaccine_name}
                                                            onChange={(e) => updateNewVaccine('vaccine_name', e.target.value)}
                                                            className={vaccineInputCls}
                                                        >
                                                            <option value="">Select vaccine...</option>
                                                            {VACCINE_OPTIONS.map(option => (
                                                                <option key={`${option.category}-${option.name}`} value={option.name}>{option.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {newVaccine.vaccine_name === OTHER_VACCINE_NAME && (
                                                        <div>
                                                            <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Specify Vaccine *</label>
                                                            <input
                                                                type="text"
                                                                value={newVaccine.other_vaccine_name || ''}
                                                                onChange={(e) => updateNewVaccine('other_vaccine_name', e.target.value)}
                                                                placeholder="Enter vaccine name"
                                                                className={vaccineInputCls}
                                                            />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Category</label>
                                                        <input
                                                            type="text"
                                                            value={newVaccine.vaccine_category || 'Select a vaccine'}
                                                            readOnly
                                                            className="w-full rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Dose / Label</label>
                                                        <input
                                                            type="text"
                                                            value={newVaccine.dose_label}
                                                            onChange={(e) => updateNewVaccine('dose_label', e.target.value)}
                                                            placeholder="e.g. Dose 1, Booster"
                                                            className={vaccineInputCls}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Date Given *</label>
                                                        <input
                                                            type="date"
                                                            value={newVaccine.date_given}
                                                            onChange={(e) => updateNewVaccine('date_given', e.target.value)}
                                                            className={vaccineInputCls}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Next Due Date</label>
                                                        <input
                                                            type="date"
                                                            value={newVaccine.next_due_date || ''}
                                                            onChange={(e) => updateNewVaccine('next_due_date', e.target.value)}
                                                            className={vaccineInputCls}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Administered By</label>
                                                        <input
                                                            type="text"
                                                            value={newVaccine.administered_by || ''}
                                                            onChange={(e) => updateNewVaccine('administered_by', e.target.value)}
                                                            placeholder="Staff name"
                                                            className={vaccineInputCls}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Facility</label>
                                                        <input
                                                            type="text"
                                                            value={newVaccine.facility || ''}
                                                            onChange={(e) => updateNewVaccine('facility', e.target.value)}
                                                            placeholder="RHU / barangay"
                                                            className={vaccineInputCls}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Lot Number</label>
                                                        <input
                                                            type="text"
                                                            value={newVaccine.lot_number || ''}
                                                            onChange={(e) => updateNewVaccine('lot_number', e.target.value)}
                                                            placeholder="Optional"
                                                            className={vaccineInputCls}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[0.65rem] font-bold text-teal-700 uppercase tracking-widest mb-1 block">Remarks</label>
                                                        <input
                                                            type="text"
                                                            value={newVaccine.remarks || ''}
                                                            onChange={(e) => updateNewVaccine('remarks', e.target.value)}
                                                            placeholder="Optional notes"
                                                            className={vaccineInputCls}
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleAddVaccine}
                                                    disabled={vaccineSaving || !navigator.onLine}
                                                    className={`bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focusCls}`}
                                                >
                                                    {vaccineSaving ? 'Saving...' : 'Save Vaccine Record'}
                                                </button>
                                            </div>
                                        )}

                                        {vaccineLoadError ? (
                                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                                <div className="font-bold">Vaccine records could not be loaded.</div>
                                                <div className="mt-1">{vaccineLoadError}</div>
                                                <button type="button" onClick={loadVaccineRecords} className={`mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 ${focusCls}`}>
                                                    Retry
                                                </button>
                                            </div>
                                        ) : vaccineLoading ? (
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
                                                {vaccineRecords.map((vr) => (
                                                    <div key={vr.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-teal-300 transition-colors relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingRemoveVaccine(vr)}
                                                            disabled={removingVaccineId === vr.id}
                                                            aria-label={`Remove ${getVaccineDisplayName(vr)} vaccine record`}
                                                            className={`absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 ${focusCls}`}
                                                            title="Remove vaccine record"
                                                        >
                                                            X
                                                        </button>
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pr-6">
                                                            <div>
                                                                <div className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Vaccine</div>
                                                                <div className="text-sm font-bold text-slate-800">{getVaccineDisplayName(vr)}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Category</div>
                                                                <div className="text-sm font-semibold text-slate-700">{vr.vaccine_category || '-'}</div>
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
                                                            <div>
                                                                <div className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Next Due</div>
                                                                <div className="text-sm font-semibold text-slate-700">{vr.next_due_date || '-'}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Administered By</div>
                                                                <div className="text-sm font-semibold text-slate-700">{vr.administered_by || '-'}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Facility</div>
                                                                <div className="text-sm font-semibold text-slate-700">{vr.facility || '-'}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Lot No.</div>
                                                                <div className="text-sm font-semibold text-slate-700">{vr.lot_number || '-'}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className={sectionCls}>
                                    <div className={headerCls}>Emergency Contact</div>
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
                                            type="button"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className={`flex-1 bg-green-600 hover:bg-green-700 text-white font-extrabold text-sm uppercase tracking-wider py-3.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${focusCls}`}
                                        >
                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={loadHistory}
                                        className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm uppercase tracking-wider py-3.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 mt-2 ${focusCls}`}
                                    >
                                        View Consultation History
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Back to Details */}
                                <button
                                    type="button"
                                    onClick={() => setShowHistory(false)}
                                    className={`mb-5 flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors ${focusCls}`}
                                >
                                    Back to Details
                                </button>

                                <div className="mb-6">
                                    <div className={headerCls}>Complete Patient History</div>
                                    <PatientTransactionHistory patientId={patient.id} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {pendingRemoveVaccine && (
                <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-extrabold text-slate-900">Remove Vaccine Record?</h3>
                        <p className="mt-2 text-sm font-medium text-slate-600">
                            This will remove {getVaccineDisplayName(pendingRemoveVaccine)} from this patient record.
                        </p>
                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setPendingRemoveVaccine(null)}
                                disabled={Boolean(removingVaccineId)}
                                className={`flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${focusCls}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRemoveVaccine(pendingRemoveVaccine)}
                                disabled={Boolean(removingVaccineId)}
                                className={`flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusCls}`}
                            >
                                {removingVaccineId ? 'Removing...' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
