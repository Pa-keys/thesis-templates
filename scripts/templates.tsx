import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../shared/supabase';
import { useNetworkSync, saveToIndexedDB, initIndexedDB } from '../shared/useNetworkSync';

// ─── Reusable Tailwind Classes ───────────────────────────────────────────────
const inputClasses = "w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white transition-colors text-slate-800 placeholder:text-slate-400";
const inputErrorClasses = "w-full border border-red-400 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-red-50 focus:bg-white transition-colors text-slate-800 placeholder:text-slate-400";
const labelClasses = "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5";
const fieldsetClasses = "bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden";
const legendClasses = "w-full px-6 py-4 border-b border-slate-100 text-sm font-extrabold text-slate-800 uppercase tracking-wider bg-slate-50/50 flex items-center gap-2";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PatientForm {
    firstName: string; middleName: string; lastName: string; suffix: string;
    age: string; sex: string; civilStatus: string; birthday: string;
    nationality: string; bloodType: string; religion: string;
    birthPlace: string; address: string; contactNumber: string;
    educationalAttain: string; employmentStatus: string;
    philhealthNo: string; philhealthStatus: string;
    category: string; categoryOthers: string;
    relativeName: string; relativeRelation: string; relativeAddress: string;
}

interface Patient extends Omit<PatientForm, 'age'> {
    id: string; age: number | null;
}

interface FieldErrors {
    [key: string]: string;
}

const EMPTY_FORM: PatientForm = {
    firstName: '', middleName: '', lastName: '', suffix: '',
    age: '', sex: '', civilStatus: '', birthday: '',
    nationality: '', bloodType: '', religion: '',
    birthPlace: '', address: '', contactNumber: '',
    educationalAttain: '', employmentStatus: '',
    philhealthNo: '', philhealthStatus: '',
    category: '', categoryOthers: '',
    relativeName: '', relativeRelation: '', relativeAddress: '',
};

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;
const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'] as const;
const EDUCATION_LEVELS = [
    'No Formal Education', 'Elementary Level', 'Elementary Graduate',
    'High School Level', 'High School Graduate', 'Vocational',
    'College Level', 'College Graduate', 'Post-Graduate'
] as const;
const EMPLOYMENT_STATUSES = ['Employed', 'Unemployed', 'Self-Employed', 'Student', 'Retired'] as const;

// ─── Malvar Barangays ─────────────────────────────────────────────────────────
const MALVAR_BARANGAYS = [
    'Bagong Pook, Malvar, Batangas', 'Bilucao, Malvar, Batangas',
    'Bulihan, Malvar, Batangas', 'Luta del Norte, Malvar, Batangas',
    'Luta del Sur, Malvar, Batangas', 'Poblacion, Malvar, Batangas',
    'San Andres, Malvar, Batangas', 'San Fernando, Malvar, Batangas',
    'San Gregorio, Malvar, Batangas', 'San Isidro, Malvar, Batangas',
    'San Juan, Malvar, Batangas', 'San Pedro I, Malvar, Batangas',
    'San Pedro II, Malvar, Batangas', 'San Pioquinto, Malvar, Batangas',
    'Santiago, Malvar, Batangas',
] as const;

const OUTSIDE_MALVAR = '__outside__';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Calculates age in years from an ISO date string (YYYY-MM-DD). Returns '' if invalid. */
function calcAge(birthday: string): string {
    if (!birthday) return '';
    const dob = new Date(birthday);
    if (isNaN(dob.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 0 ? String(age) : '';
}

/**
 * Formats raw PhilHealth digits into XX-XXXXXXXXX-X pattern.
 * Accepts up to 12 digits, inserts dashes at positions 2 and 11.
 */
function formatPhilhealth(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 12);
    if (digits.length <= 2) return digits;
    if (digits.length <= 11) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11)}`;
}

/** Strips all non-digit characters from a PhilHealth formatted string. */
function philhealthDigits(formatted: string): string {
    return formatted.replace(/\D/g, '');
}

// ─── Address Field Component ──────────────────────────────────────────────────
function AddressField({ value, onChange }: { value: string; onChange: (val: string) => void; }) {
    const isKnownBarangay = MALVAR_BARANGAYS.includes(value as typeof MALVAR_BARANGAYS[number]);
    const isCustom = value !== '' && !isKnownBarangay;

    const [selectVal, setSelectVal] = useState<string>(
        isCustom ? OUTSIDE_MALVAR : (value || '')
    );

    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectVal(val);
        if (val === OUTSIDE_MALVAR) {
            onChange('');
        } else {
            onChange(val);
        }
    };

    return (
        <div className="flex flex-col gap-3 w-full">
            <select value={selectVal} onChange={handleSelect} required={selectVal !== OUTSIDE_MALVAR} className={inputClasses}>
                <option value="" disabled>Select barangay...</option>
                {MALVAR_BARANGAYS.map(b => (
                    <option key={b} value={b}>{b}</option>
                ))}
                <option value={OUTSIDE_MALVAR}>📍 Outside Malvar / Type manually</option>
            </select>

            {selectVal === OUTSIDE_MALVAR && (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Enter full address..."
                    required
                    className={inputClasses}
                />
            )}
        </div>
    );
}

// ─── Radio Option Component (Modern Chips) ────────────────────────────────────
function RadioOption({ name, value, label, checked, onChange }: {
    name: string; value: string; label: string;
    checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <label className={`cursor-pointer px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${checked ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}>
            <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="hidden" />
            {label}
        </label>
    );
}

// ─── Inline Error Message ─────────────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="mt-1.5 text-xs text-red-500 font-semibold flex items-center gap-1"><span>⚠</span>{message}</p>;
}

// ─── Exported Pure Component ──────────────────────────────────────────────────
export function TemplatesComponent() {
    const [session, setSession] = useState<Session | null>(null);
    const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [errors, setErrors] = useState<FieldErrors>({});

    const { isOnline } = useNetworkSync();

    useEffect(() => {
        initIndexedDB('MediSensDB', 'offline_patients');
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
    }, []);

    const fetchPatients = useCallback(async (filterText = '') => {
        const { data, error } = await supabase.from('patients').select('*').order('lastName', { ascending: true });
        if (error) { console.error(error); return; }
        const lower = filterText.toLowerCase();
        setPatients((data as Patient[]).filter(p => `${p.firstName} ${p.middleName} ${p.lastName}`.toLowerCase().includes(lower)));
    }, []);

    useEffect(() => { if (session) fetchPatients(); }, [session, fetchPatients]);

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 4000);
    };

    // ── Generic field change ──
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm(f => ({ ...f, [id]: value }));
        // Clear error on change
        if (errors[id]) setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
    };

    // ── Text-only fields (letters, spaces, hyphens, periods, ñ, accented chars) ──
    const handleTextOnly = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        // Allow letters (including accented/Filipino chars), spaces, hyphens, apostrophes, periods
        const filtered = value.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿñÑ\s\-'.]/g, '');
        setForm(f => ({ ...f, [id]: filtered }));
        if (errors[id]) setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
    };

    // ── Birthday change — auto-calculate age ──
    const handleBirthday = (e: React.ChangeEvent<HTMLInputElement>) => {
        const birthday = e.target.value;
        const age = calcAge(birthday);
        setForm(f => ({ ...f, birthday, age }));
        if (errors['birthday']) setErrors(prev => { const n = { ...prev }; delete n['birthday']; return n; });
    };

    // ── Phone number — digits only, max 11 ──
    const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
        setForm(f => ({ ...f, contactNumber: digits }));
        if (errors['contactNumber']) setErrors(prev => { const n = { ...prev }; delete n['contactNumber']; return n; });
    };

    // ── PhilHealth — auto-format with dashes, digits only ──
    const handlePhilhealth = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhilhealth(e.target.value);
        setForm(f => ({ ...f, philhealthNo: formatted }));
        if (errors['philhealthNo']) setErrors(prev => { const n = { ...prev }; delete n['philhealthNo']; return n; });
    };

    const handleRadio = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value, ...(name === 'category' && value === '4Ps' ? { categoryOthers: '' } : {}) }));
    };

    // ── Validation ──────────────────────────────────────────────────────────────
    const validate = (): boolean => {
        const newErrors: FieldErrors = {};

        // Phone: must be exactly 11 digits if provided
        if (form.contactNumber && form.contactNumber.length !== 11) {
            newErrors['contactNumber'] = 'Contact number must be exactly 11 digits.';
        }

        // PhilHealth: must be exactly 12 digits if provided
        if (form.philhealthNo) {
            const digits = philhealthDigits(form.philhealthNo);
            if (digits.length !== 12) {
                newErrors['philhealthNo'] = 'PhilHealth number must be 12 digits (XX-XXXXXXXXX-X).';
            }
        }

        // Birthday must not be in the future
        if (form.birthday) {
            const dob = new Date(form.birthday);
            if (dob > new Date()) {
                newErrors['birthday'] = 'Birthday cannot be a future date.';
            }
        }

        // Age sanity check
        if (form.age && (parseInt(form.age) < 0 || parseInt(form.age) > 150)) {
            newErrors['age'] = 'Please enter a valid age.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            showToast('Please fix the errors before saving.', false);
            return;
        }

        setSaving(true);
        const payload = { ...form, age: parseInt(form.age) };

        try {
            if (isOnline) {
                const { error } = await supabase.from('patients').insert([payload]);
                if (error) throw error;
                showToast('Patient record saved to database!', true);
            } else {
                await saveToIndexedDB('MediSensDB', 'offline_patients', { id: Date.now(), type: 'patient_registration', data: payload });
                showToast('Offline Mode: Record saved locally. Will sync when online.', true);
            }
            setForm(EMPTY_FORM);
            setErrors({});
            fetchPatients();
        } catch (error: any) {
            console.error("Save Error:", error);
            showToast('Error saving record: ' + error.message, false);
        } finally {
            setSaving(false);
        }
    };

    if (!session) return null;

    return (
        <div className="w-full relative">
            {toast && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl text-sm font-bold shadow-xl flex items-center gap-2 border transition-all ${toast.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    <span>{toast.ok ? '✅' : '❌'}</span> {toast.msg}
                </div>
            )}

            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                        Patient Registration
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Register a new patient into the system for initial triage.</p>
                </div>

                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-700">Live • Auto-sync enabled</span>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <form onSubmit={handleSubmit} className="flex-1 w-full min-w-0">

                    {/* Section I: Patient Info */}
                    <fieldset className={fieldsetClasses}>
                        <div className={legendClasses}>
                            <span className="text-blue-600">①</span> Patient's Information Record
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                                {/* Last Name */}
                                <div>
                                    <label className={labelClasses}>Last Name</label>
                                    <input
                                        type="text" id="lastName" value={form.lastName}
                                        onChange={handleTextOnly}
                                        className={errors['lastName'] ? inputErrorClasses : inputClasses}
                                        placeholder="Dela Cruz" required
                                    />
                                    <FieldError message={errors['lastName']} />
                                </div>

                                {/* First Name */}
                                <div>
                                    <label className={labelClasses}>First Name</label>
                                    <input
                                        type="text" id="firstName" value={form.firstName}
                                        onChange={handleTextOnly}
                                        className={errors['firstName'] ? inputErrorClasses : inputClasses}
                                        placeholder="Juan" required
                                    />
                                    <FieldError message={errors['firstName']} />
                                </div>

                                {/* Middle Name */}
                                <div>
                                    <label className={labelClasses}>Middle Name</label>
                                    <input
                                        type="text" id="middleName" value={form.middleName}
                                        onChange={handleTextOnly}
                                        className={inputClasses}
                                        placeholder="Santos"
                                    />
                                </div>

                                {/* Suffix */}
                                <div>
                                    <label className={labelClasses}>Suffix</label>
                                    <input
                                        type="text" id="suffix" value={form.suffix}
                                        onChange={handleTextOnly}
                                        className={inputClasses}
                                        placeholder="Jr."
                                    />
                                </div>

                                {/* Age — read-only, auto-calculated */}
                                <div>
                                    <label className={labelClasses}>
                                        Age <span className="text-blue-400 font-normal normal-case tracking-normal">(auto)</span>
                                    </label>
                                    <input
                                        type="text" id="age" value={form.age}
                                        readOnly
                                        className={`${inputClasses} bg-slate-100 cursor-not-allowed text-slate-500`}
                                        placeholder="Set birthday"
                                        tabIndex={-1}
                                    />
                                    <FieldError message={errors['age']} />
                                </div>

                                {/* Sex */}
                                <div>
                                    <label className={labelClasses}>Sex</label>
                                    <select id="sex" value={form.sex} onChange={handleChange} className={inputClasses} required>
                                        <option value="" disabled>Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>

                                {/* Civil Status */}
                                <div>
                                    <label className={labelClasses}>Civil Status</label>
                                    <select id="civilStatus" value={form.civilStatus} onChange={handleChange} className={inputClasses} required>
                                        <option value="" disabled>Select</option>
                                        {CIVIL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                {/* Birthday */}
                                <div>
                                    <label className={labelClasses}>Birthday</label>
                                    <input
                                        type="date" id="birthday" value={form.birthday}
                                        onChange={handleBirthday}
                                        className={errors['birthday'] ? inputErrorClasses : inputClasses}
                                        max={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                    <FieldError message={errors['birthday']} />
                                </div>

                                {/* Address */}
                                <div className="col-span-1 sm:col-span-2 md:col-span-4">
                                    <label className={labelClasses}>Address (Brgy, Malvar)</label>
                                    <AddressField value={form.address} onChange={(val) => setForm(f => ({ ...f, address: val }))} />
                                </div>

                                {/* Contact Number */}
                                <div className="col-span-1 sm:col-span-2">
                                    <label className={labelClasses}>
                                        Contact # <span className="text-slate-400 font-normal normal-case tracking-normal">(11 digits)</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="contactNumber"
                                        value={form.contactNumber}
                                        onChange={handlePhone}
                                        inputMode="numeric"
                                        className={errors['contactNumber'] ? inputErrorClasses : inputClasses}
                                        placeholder="09XXXXXXXXX"
                                        maxLength={11}
                                    />
                                    <div className="flex items-center justify-between mt-1">
                                        <FieldError message={errors['contactNumber']} />
                                        <span className={`text-xs ml-auto font-semibold ${form.contactNumber.length === 11 ? 'text-green-500' : 'text-slate-400'}`}>
                                            {form.contactNumber.length}/11
                                        </span>
                                    </div>
                                </div>

                                {/* Nationality */}
                                <div className="col-span-1 sm:col-span-2">
                                    <label className={labelClasses}>Nationality</label>
                                    <input
                                        type="text" id="nationality" value={form.nationality}
                                        onChange={handleTextOnly}
                                        className={errors['nationality'] ? inputErrorClasses : inputClasses}
                                        placeholder="Filipino" required
                                    />
                                    <FieldError message={errors['nationality']} />
                                </div>

                                {/* Religion */}
                                <div className="col-span-1 sm:col-span-2">
                                    <label className={labelClasses}>Religion</label>
                                    <input
                                        type="text" id="religion" value={form.religion}
                                        onChange={handleTextOnly}
                                        className={inputClasses}
                                        placeholder="Catholic"
                                    />
                                </div>

                                {/* Birth Place */}
                                <div className="col-span-1 sm:col-span-2">
                                    <label className={labelClasses}>Birth Place</label>
                                    <input
                                        type="text" id="birthPlace" value={form.birthPlace}
                                        onChange={handleTextOnly}
                                        className={errors['birthPlace'] ? inputErrorClasses : inputClasses}
                                        placeholder="Malvar, Batangas"
                                    />
                                    <FieldError message={errors['birthPlace']} />
                                </div>

                                {/* Educational Attainment */}
                                <div className="col-span-1 sm:col-span-2">
                                    <label className={labelClasses}>Educational Attainment</label>
                                    <select id="educationalAttain" value={form.educationalAttain} onChange={handleChange} className={inputClasses} required>
                                        <option value="" disabled>Select</option>
                                        {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>

                                {/* Employment Status */}
                                <div className="col-span-1 sm:col-span-2">
                                    <label className={labelClasses}>Employment Status</label>
                                    <select id="employmentStatus" value={form.employmentStatus} onChange={handleChange} className={inputClasses} required>
                                        <option value="" disabled>Select</option>
                                        {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                {/* Blood Type */}
                                <div className="col-span-1 sm:col-span-2">
                                    <label className={labelClasses}>Blood Type</label>
                                    <select id="bloodType" value={form.bloodType} onChange={handleChange} className={inputClasses} required>
                                        <option value="" disabled>Select Blood Type</option>
                                        {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    {/* Section II: PhilHealth */}
                    <fieldset className={fieldsetClasses}>
                        <div className={legendClasses}>
                            <span className="text-pink-600">②</span> PhilHealth & Categorization
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* PhilHealth No */}
                                <div>
                                    <label className={labelClasses}>
                                        PhilHealth No. <span className="text-slate-400 font-normal normal-case tracking-normal">(XX-XXXXXXXXX-X)</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="philhealthNo"
                                        value={form.philhealthNo}
                                        onChange={handlePhilhealth}
                                        inputMode="numeric"
                                        className={errors['philhealthNo'] ? inputErrorClasses : inputClasses}
                                        placeholder="XX-XXXXXXXXX-X"
                                        maxLength={14} // 12 digits + 2 dashes
                                    />
                                    <div className="flex items-center justify-between mt-1">
                                        <FieldError message={errors['philhealthNo']} />
                                        <span className={`text-xs ml-auto font-semibold ${philhealthDigits(form.philhealthNo).length === 12 ? 'text-green-500' : 'text-slate-400'}`}>
                                            {philhealthDigits(form.philhealthNo).length}/12 digits
                                        </span>
                                    </div>
                                </div>

                                {/* PhilHealth Status */}
                                <div>
                                    <label className={labelClasses}>Category</label>
                                    <div className="flex flex-wrap gap-3">
                                        {['Member', 'Dependent', '4Ps', 'None'].map(v => (
                                            <RadioOption key={v} name="philhealthStatus" value={v} label={v} checked={form.philhealthStatus === v} onChange={handleRadio} />
                                        ))}
                                    </div>
                                </div>

                                {/* Classification */}
                                <div className="col-span-1 md:col-span-2">
                                    <label className={labelClasses}>Classification</label>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <RadioOption name="category" value="4Ps" label="4Ps" checked={form.category === '4Ps'} onChange={handleRadio} />
                                        <RadioOption name="category" value="Other/s" label="Other/s" checked={form.category === 'Other/s'} onChange={handleRadio} />
                                        {form.category === 'Other/s' && (
                                            <input
                                                type="text" id="categoryOthers" value={form.categoryOthers}
                                                onChange={handleChange}
                                                className={`${inputClasses} w-auto min-w-[200px]`}
                                                placeholder="Please specify" required
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    {/* Section III: Emergency Contact */}
                    <fieldset className={fieldsetClasses}>
                        <div className={legendClasses}>
                            <span className="text-green-600">③</span> Emergency Contact
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className={labelClasses}>Relative's Name</label>
                                    <input
                                        type="text" id="relativeName" value={form.relativeName}
                                        onChange={handleTextOnly}
                                        className={inputClasses}
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div>
                                    <label className={labelClasses}>Relationship</label>
                                    <input
                                        type="text" id="relativeRelation" value={form.relativeRelation}
                                        onChange={handleTextOnly}
                                        className={inputClasses}
                                        placeholder="e.g. Spouse"
                                    />
                                </div>
                                <div>
                                    <label className={labelClasses}>Relative's Address</label>
                                    <input
                                        type="text" id="relativeAddress" value={form.relativeAddress}
                                        onChange={handleChange}
                                        className={inputClasses}
                                        placeholder="Address"
                                    />
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <div className="flex justify-end gap-4 mt-6 mb-12 border-t border-slate-200 pt-6">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-lg text-sm transition-all ${saving ? 'bg-blue-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-blue-500/30'}`}
                        >
                            {saving ? '⏳ Saving...' : '💾 Save Registration'}
                        </button>
                    </div>
                </form>

                {/* ── RIGHT: Recent Patients Sidebar ── */}
                <div className="w-full lg:w-[350px] shrink-0">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-6">
                        <div className="flex justify-between items-center mb-5">
                            <div className="font-bold text-slate-800">Recent Records</div>
                            <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md text-xs font-bold">{patients.length}</span>
                        </div>
                        <div className="relative mb-5">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); fetchPatients(e.target.value); }}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                            />
                        </div>
                        <div className="max-h-[600px] overflow-y-auto pr-2 flex flex-col gap-2 scrollbar-thin">
                            {patients.length === 0 ? (
                                <div className="text-center text-slate-400 text-sm py-8">No patients found.</div>
                            ) : patients.map(p => (
                                <div
                                    key={p.id}
                                    className="flex items-center gap-3 p-3 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl cursor-pointer transition-all group"
                                    onClick={() => window.location.href = `/pages/details.html?id=${p.id}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-sm">
                                        {(p.firstName?.[0] || '?').toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors truncate">
                                            {p.lastName}, {p.firstName} {p.middleName || ''}
                                        </div>
                                        <div className="text-[0.65rem] text-slate-500 mt-0.5 truncate uppercase tracking-wider font-semibold">
                                            {p.sex || '—'} · {p.age ?? '—'} YRS · {p.bloodType || '—'}
                                        </div>
                                    </div>
                                    <span className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all font-bold">→</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}