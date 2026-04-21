import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../shared/supabase';
import { useNetworkSync, saveToIndexedDB, initIndexedDB } from '../shared/useNetworkSync';

// ─── Reusable Tailwind Classes ───────────────────────────────────────────────
const inputClasses = "w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white transition-colors text-slate-800 placeholder:text-slate-400";
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
function RadioOption({ name, value, label, checked, onChange }: { name: string; value: string; label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }) {
    return (
        <label className={`cursor-pointer px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${checked ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}>
            <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="hidden" />
            {label}
        </label>
    );
}

// ─── Exported Pure Component ──────────────────────────────────────────────────
export function TemplatesComponent() {
    const [session, setSession] = useState<Session | null>(null);
    const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm(f => ({ ...f, [id]: value }));
    };

    const handleRadio = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value, ...(name === 'category' && value === '4Ps' ? { categoryOthers: '' } : {}) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                                <div><label className={labelClasses}>Last Name</label><input type="text" id="lastName" value={form.lastName} onChange={handleChange} className={inputClasses} placeholder="Dela Cruz" required /></div>
                                <div><label className={labelClasses}>First Name</label><input type="text" id="firstName" value={form.firstName} onChange={handleChange} className={inputClasses} placeholder="Juan" required /></div>
                                <div><label className={labelClasses}>Middle Name</label><input type="text" id="middleName" value={form.middleName} onChange={handleChange} className={inputClasses} placeholder="Santos" /></div>
                                <div><label className={labelClasses}>Suffix</label><input type="text" id="suffix" value={form.suffix} onChange={handleChange} className={inputClasses} placeholder="Jr." /></div>
                                
                                <div><label className={labelClasses}>Age</label><input type="number" id="age" value={form.age} onChange={handleChange} className={inputClasses} placeholder="30" required min="0" max="150" /></div>
                                <div>
                                    <label className={labelClasses}>Sex</label>
                                    <select id="sex" value={form.sex} onChange={handleChange} className={inputClasses} required>
                                        <option value="" disabled>Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Civil Status</label>
                                    <select id="civilStatus" value={form.civilStatus} onChange={handleChange} className={inputClasses} required>
                                        <option value="" disabled>Select</option>
                                        {CIVIL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div><label className={labelClasses}>Birthday</label><input type="date" id="birthday" value={form.birthday} onChange={handleChange} className={inputClasses} required /></div>

                                <div className="col-span-1 sm:col-span-2 md:col-span-4">
                                    <label className={labelClasses}>Address (Brgy, Malvar)</label>
                                    <AddressField value={form.address} onChange={(val) => setForm(f => ({ ...f, address: val }))} />
                                </div>

                                <div className="col-span-1 sm:col-span-2"><label className={labelClasses}>Contact #</label><input type="tel" id="contactNumber" value={form.contactNumber} onChange={handleChange} className={inputClasses} placeholder="09XXXXXXXXX" pattern="[0-9]*" /></div>
                                <div className="col-span-1 sm:col-span-2"><label className={labelClasses}>Nationality</label><input type="text" id="nationality" value={form.nationality} onChange={handleChange} className={inputClasses} placeholder="Filipino" required /></div>
                                <div className="col-span-1 sm:col-span-2"><label className={labelClasses}>Religion</label><input type="text" id="religion" value={form.religion} onChange={handleChange} className={inputClasses} placeholder="Catholic" /></div>
                                <div className="col-span-1 sm:col-span-2"><label className={labelClasses}>Birth Place</label><input type="text" id="birthPlace" value={form.birthPlace} onChange={handleChange} className={inputClasses} placeholder="Malvar, Batangas" /></div>
                                
                                <div className="col-span-1 sm:col-span-2">
                                    <label className={labelClasses}>Educational Attainment</label>
                                    <select id="educationalAttain" value={form.educationalAttain} onChange={handleChange} className={inputClasses} required>
                                        <option value="" disabled>Select</option>
                                        {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-1 sm:col-span-2">
                                    <label className={labelClasses}>Employment Status</label>
                                    <select id="employmentStatus" value={form.employmentStatus} onChange={handleChange} className={inputClasses} required>
                                        <option value="" disabled>Select</option>
                                        {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
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
                                <div>
                                    <label className={labelClasses}>PhilHealth No.</label>
                                    <input type="text" id="philhealthNo" value={form.philhealthNo} onChange={handleChange} className={inputClasses} placeholder="XX-XXXXXXXXX-X" />
                                </div>
                                <div>
                                    <label className={labelClasses}>Category</label>
                                    <div className="flex flex-wrap gap-3">
                                        {['Member', 'Dependent', '4Ps', 'None'].map(v => (
                                            <RadioOption key={v} name="philhealthStatus" value={v} label={v} checked={form.philhealthStatus === v} onChange={handleRadio} />
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className={labelClasses}>Classification</label>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <RadioOption name="category" value="4Ps" label="4Ps" checked={form.category === '4Ps'} onChange={handleRadio} />
                                        <RadioOption name="category" value="Other/s" label="Other/s" checked={form.category === 'Other/s'} onChange={handleRadio} />
                                        {form.category === 'Other/s' && (
                                            <input type="text" id="categoryOthers" value={form.categoryOthers} onChange={handleChange} className={`${inputClasses} w-auto min-w-[200px]`} placeholder="Please specify" required />
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
                                <div><label className={labelClasses}>Relative's Name</label><input type="text" id="relativeName" value={form.relativeName} onChange={handleChange} className={inputClasses} placeholder="Full Name" /></div>
                                <div><label className={labelClasses}>Relationship</label><input type="text" id="relativeRelation" value={form.relativeRelation} onChange={handleChange} className={inputClasses} placeholder="e.g. Spouse" /></div>
                                <div><label className={labelClasses}>Relative's Address</label><input type="text" id="relativeAddress" value={form.relativeAddress} onChange={handleChange} className={inputClasses} placeholder="Address" /></div>
                            </div>
                        </div>
                    </fieldset>

                    <div className="flex justify-end gap-4 mt-6 mb-12 border-t border-slate-200 pt-6">
                        <button type="submit" disabled={saving} className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-lg text-sm transition-all ${saving ? 'bg-blue-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-blue-500/30'}`}>
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

