import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

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

// ─── Radio Option Component ───────────────────────────────────────────────────
function RadioOption({ name, value, label, checked, onChange }: {
    name: string; value: string; label: string;
    checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <label className={`radio-option${checked ? ' selected' : ''}`}>
            <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
            <span className="radio-dot">{checked && <span></span>}</span>
            {label}
        </label>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function Templates() {
    const [session, setSession] = useState<Session | null>(null);
    const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    // Auth guard
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) window.location.href = '/pages/login.html';
            else {
                setSession(session);
                const emailEl = document.getElementById('userEmail');
                if (emailEl) emailEl.textContent = session.user.email || '';
            }
        });
    }, []);

    // Logout
    useEffect(() => {
        const btn = document.getElementById('logoutBtn');
        if (!btn) return;
        const handler = async () => { await supabase.auth.signOut(); window.location.href = '/pages/login.html'; };
        btn.addEventListener('click', handler);
        return () => btn.removeEventListener('click', handler);
    }, []);

    // Fetch patients
    const fetchPatients = useCallback(async (filterText = '') => {
        const { data, error } = await supabase.from('patients').select('*').order('lastName', { ascending: true });
        if (error) { console.error(error); return; }
        const lower = filterText.toLowerCase();
        setPatients((data as Patient[]).filter(p =>
            `${p.firstName} ${p.middleName} ${p.lastName}`.toLowerCase().includes(lower)
        ));
    }, []);

    useEffect(() => { if (session) fetchPatients(); }, [session, fetchPatients]);

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
        const { error } = await supabase.from('patients').insert([{ ...form, age: parseInt(form.age) }]);
        setSaving(false);
        if (error) { alert('Error saving record: ' + error.message); return; }
        alert('Patient record saved!');
        setForm(EMPTY_FORM);
        fetchPatients();
    };

    if (!session) return null;

    return (
        <div className="page">
            {/* Page header */}
            <div className="page-header">
                <h1>Patient Intake &amp; Triage</h1>
                <p>Register a new patient into the system.</p>
            </div>

            {/* ── LEFT: Form ── */}
            <div>
                <form onSubmit={handleSubmit}>

                    {/* Section I: Patient Info */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-header-icon">👤</div>
                            <div className="card-header-title">I. Patient's Information Record</div>
                        </div>
                        <div className="card-body">
                            <div className="form-grid cols-4">
                                <div className="field">
                                    <label>Last Name</label>
                                    <input type="text" id="lastName" value={form.lastName} onChange={handleChange} placeholder="Dela Cruz" required />
                                </div>
                                <div className="field">
                                    <label>First Name</label>
                                    <input type="text" id="firstName" value={form.firstName} onChange={handleChange} placeholder="Juan" required />
                                </div>
                                <div className="field">
                                    <label>Middle Name</label>
                                    <input type="text" id="middleName" value={form.middleName} onChange={handleChange} placeholder="Santos" />
                                </div>
                                <div className="field">
                                    <label>Suffix</label>
                                    <input type="text" id="suffix" value={form.suffix} onChange={handleChange} placeholder="Jr." />
                                </div>

                                <div className="field">
                                    <label>Age</label>
                                    <input type="number" id="age" value={form.age} onChange={handleChange} placeholder="30" required min="0" max="150" />
                                </div>
                                <div className="field">
                                    <label>Sex</label>
                                    <select id="sex" value={form.sex} onChange={handleChange} required>
                                        <option value="" disabled>Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label>Civil Status</label>
                                    <select id="civilStatus" value={form.civilStatus} onChange={handleChange} required>
                                        <option value="" disabled>Select</option>
                                        {CIVIL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="field">
                                    <label>Birthday</label>
                                    <input type="date" id="birthday" value={form.birthday} onChange={handleChange} required />
                                </div>

                                <div className="field col-span-2">
                                    <label>Address (Brgy, Malvar)</label>
                                    <input type="text" id="address" value={form.address} onChange={handleChange} placeholder="Barangay, Malvar, Batangas" required />
                                </div>
                                <div className="field col-span-2">
                                    <label>Contact #</label>
                                    <input type="tel" id="contactNumber" value={form.contactNumber} onChange={handleChange} placeholder="09XXXXXXXXX" pattern="[0-9]*" />
                                </div>

                                <div className="field col-span-2">
                                    <label>Nationality</label>
                                    <input type="text" id="nationality" value={form.nationality} onChange={handleChange} placeholder="Filipino" required />
                                </div>
                                <div className="field">
                                    <label>Religion</label>
                                    <input type="text" id="religion" value={form.religion} onChange={handleChange} placeholder="Catholic" />
                                </div>
                                <div className="field">
                                    <label>Birth Place</label>
                                    <input type="text" id="birthPlace" value={form.birthPlace} onChange={handleChange} placeholder="Malvar, Batangas" />
                                </div>

                                <div className="field col-span-2">
                                    <label>Educational Attainment</label>
                                    <select id="educationalAttain" value={form.educationalAttain} onChange={handleChange} required>
                                        <option value="" disabled>Select</option>
                                        {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="field col-span-2">
                                    <label>Employment Status</label>
                                    <select id="employmentStatus" value={form.employmentStatus} onChange={handleChange} required>
                                        <option value="" disabled>Select</option>
                                        {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div className="field col-span-2">
                                    <label>Blood Type</label>
                                    <select id="bloodType" value={form.bloodType} onChange={handleChange} required>
                                        <option value="" disabled>Select Blood Type</option>
                                        {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section II: PhilHealth */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-header-icon">🏥</div>
                            <div className="card-header-title">II. PhilHealth &amp; Categorization</div>
                        </div>
                        <div className="card-body">
                            <div className="form-grid cols-2">
                                <div className="field">
                                    <label>PhilHealth No.</label>
                                    <input type="text" id="philhealthNo" value={form.philhealthNo} onChange={handleChange} placeholder="XX-XXXXXXXXX-X" />
                                </div>
                                <div className="field">
                                    <label>Category</label>
                                    <div className="radio-group">
                                        {['Member', 'Dependent', '4Ps', 'None'].map(v => (
                                            <RadioOption key={v} name="philhealthStatus" value={v} label={v} checked={form.philhealthStatus === v} onChange={handleRadio} />
                                        ))}
                                    </div>
                                </div>
                                <div className="field col-span-2">
                                    <label>Classification</label>
                                    <div className="radio-group">
                                        <RadioOption name="category" value="4Ps" label="4Ps" checked={form.category === '4Ps'} onChange={handleRadio} />
                                        <RadioOption name="category" value="Other/s" label="Other/s" checked={form.category === 'Other/s'} onChange={handleRadio} />
                                        {form.category === 'Other/s' && (
                                            <input type="text" id="categoryOthers" value={form.categoryOthers} onChange={handleChange}
                                                placeholder="Please specify" required
                                                style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none', minWidth: '180px' }} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section III: Emergency Contact */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-header-icon">🆘</div>
                            <div className="card-header-title">III. Emergency Contact</div>
                        </div>
                        <div className="card-body">
                            <div className="form-grid cols-3">
                                <div className="field">
                                    <label>Relative's Name</label>
                                    <input type="text" id="relativeName" value={form.relativeName} onChange={handleChange} placeholder="Full Name" />
                                </div>
                                <div className="field">
                                    <label>Relationship</label>
                                    <input type="text" id="relativeRelation" value={form.relativeRelation} onChange={handleChange} placeholder="e.g. Spouse" />
                                </div>
                                <div className="field">
                                    <label>Relative's Address</label>
                                    <input type="text" id="relativeAddress" value={form.relativeAddress} onChange={handleChange} placeholder="Address" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save button */}
                    <button type="submit" className="save-btn" disabled={saving}>
                        💾 {saving ? 'Saving...' : 'Save Registration'}
                    </button>
                </form>
            </div>

            {/* ── RIGHT: Patient list ── */}
            <div>
                <div className="list-card">
                    <div className="list-header">
                        <div className="list-header-title">Patient Records</div>
                        <span className="list-count" id="listCount">{patients.length}</span>
                    </div>
                    <div className="search-wrap">
                        <input
                            type="text"
                            placeholder="🔍  Search by name..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); fetchPatients(e.target.value); }}
                        />
                    </div>
                    <div className="patient-list">
                        {patients.length === 0 ? (
                            <div className="empty-list">No patients found.</div>
                        ) : patients.map(p => (
                            <div key={p.id} className="patient-row" onClick={() => window.location.href = `/pages/details.html?id=${p.id}`}>
                                <div className="patient-av">{(p.firstName?.[0] || '?').toUpperCase()}</div>
                                <div className="patient-info">
                                    <div className="patient-name">{p.lastName}, {p.firstName} {p.middleName || ''}</div>
                                    <div className="patient-meta">{p.sex || '—'} · {p.age ?? '—'} yrs · {p.bloodType || '—'}</div>
                                </div>
                                <span className="patient-arrow">→</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><Templates /></React.StrictMode>
);