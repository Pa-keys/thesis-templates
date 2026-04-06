import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import PatientConsent from './patient_consent';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Patient {
    id: string; firstName: string; middleName: string; lastName: string;
    age: number | null; sex: string; birthday: string; birthPlace: string;
    bloodType: string; nationality: string; religion: string; civilStatus: string;
    suffix: string; address: string; contactNumber: string;
    educationalAttain: string; employmentStatus: string;
    philhealthNo: string; philhealthStatus: string;
    category: string; categoryOthers: string;
    relativeName: string; relativeRelation: string; relativeAddress: string;
}

interface EditForm extends Omit<Patient, 'id' | 'age'> { age: string; }

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;
const EDUCATION_LEVELS = [
    'No Formal Education', 'Elementary Level', 'Elementary Graduate',
    'High School Level', 'High School Graduate', 'Vocational',
    'College Level', 'College Graduate', 'Post-Graduate'
] as const;
const EMPLOYMENT_STATUSES = ['Employed', 'Unemployed', 'Self-Employed', 'Student', 'Retired'] as const;

const patientId = new URLSearchParams(window.location.search).get('id');

// ─── Sub-components ───────────────────────────────────────────────────────────
function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
    const isEmpty = value === null || value === undefined || value === '';
    return (
        <div className="detail-item">
            <div className="di-label">{label}</div>
            <div className={`di-value${isEmpty ? ' empty' : ''}`}>{isEmpty ? 'Not provided' : value}</div>
        </div>
    );
}

function RadioOption({ name, value, label, checked, onChange }: {
    name: string; value: string; label: string;
    checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <label className={`radio-option${checked ? ' selected' : ''}`}>
            <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
            <span className="radio-dot"></span>
            {label}
        </label>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function Details() {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [showConsent, setShowConsent] = useState(false);
    const [editForm, setEditForm] = useState<EditForm>({
        firstName: '', middleName: '', lastName: '', age: '', sex: '',
        nationality: '', bloodType: 'O+', religion: '', birthday: '',
        birthPlace: '', address: '', contactNumber: '', civilStatus: '',
        suffix: '', educationalAttain: '', employmentStatus: '',
        philhealthNo: '', philhealthStatus: '', category: '', categoryOthers: '',
        relativeName: '', relativeRelation: '', relativeAddress: ''
    });

    useEffect(() => {
        if (!patientId) { setError('No patient ID provided in URL.'); return; }
        loadPatient();
    }, []);

    async function loadPatient() {
        const { data, error } = await supabase.from('patients').select('*').eq('id', patientId).single();
        if (error || !data) { setError('Patient not found. They may have been deleted.'); return; }
        setPatient(data as Patient);
        setEditForm({
            firstName:         data.firstName         || '',
            middleName:        data.middleName         || '',
            lastName:          data.lastName           || '',
            age:               data.age?.toString()    ?? '',
            sex:               data.sex                || '',
            nationality:       data.nationality        || '',
            bloodType:         data.bloodType          || 'O+',
            religion:          data.religion           || '',
            birthday:          data.birthday           || '',
            birthPlace:        data.birthPlace         || '',
            suffix:            data.suffix             || '',
            civilStatus:       data.civilStatus          || '',
            address:           data.address            || '',
            contactNumber:     data.contactNumber      || '',
            educationalAttain: data.educationalAttain  || '',
            employmentStatus:  data.employmentStatus   || '',
            philhealthNo:      data.philhealthNo       || '',
            philhealthStatus:  data.philhealthStatus   || '',
            category:          data.category           || '',
            categoryOthers:    data.categoryOthers     || '',
            relativeName:      data.relativeName       || '',
            relativeRelation:  data.relativeRelation   || '',
            relativeAddress:   data.relativeAddress    || ''
        });
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setEditForm(f => ({ ...f, [id]: value }));
    };

    const handleRadio = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditForm(f => ({ ...f, [name]: value, ...(name === 'category' && value === '4Ps' ? { categoryOthers: '' } : {}) }));
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const parsed = parseInt(editForm.age);
        const updates = { ...editForm, age: isNaN(parsed) ? null : parsed };
        const { data, error } = await supabase.from('patients').update(updates).eq('id', patientId).select();
        setSaving(false);
        if (error) { alert('Error updating record: ' + error.message); return; }
        if (!data || data.length === 0) { alert('Update failed — check your RLS policies in Supabase.'); return; }
        alert('Record updated successfully!');
        setPatient(p => p ? { ...p, ...updates } : null);
        setEditing(false);
    };

    const handleDelete = async () => {
        if (!confirm('Permanently delete this patient record? This cannot be undone.')) return;
        const { error } = await supabase.from('patients').delete().eq('id', patientId);
        if (error) { alert('Error deleting record: ' + error.message); return; }
        window.location.href = '/pages/templates.html';
    };

    const displayCategory = (p: Patient) => {
        if (p.category === 'Other/s') return `Others (${p.categoryOthers || 'Unspecified'})`;
        return p.category || 'N/A';
    };

    // ── Error ──────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="page">
                <div className="error-box">⚠️ {error}</div>
            </div>
        );
    }

    if (!patient) {
        return <div className="page" style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>Loading patient...</div>;
    }

    // ── Consent view ──────────────────────────────────────────────────────────
    if (showConsent) {
        return (
            <div className="page">
                <button className="btn btn-ghost" style={{ marginBottom: 20 }} onClick={() => setShowConsent(false)}>
                    ← Back to Profile
                </button>
                <PatientConsent
                    patientId={patient.id}
                    patientName={`${patient.firstName} ${patient.lastName}`}
                    onConsentSaved={() => { setShowConsent(false); loadPatient(); }}
                />
            </div>
        );
    }

    // ── Edit view ─────────────────────────────────────────────────────────────
    if (editing) {
        return (
            <div className="page">
                <form onSubmit={handleEditSubmit}>
                    {/* Header */}
                    <div className="profile-hero" style={{ marginBottom: 20 }}>
                        <div className="profile-av">{(patient.firstName?.[0] || '?').toUpperCase()}</div>
                        <div className="profile-info">
                            <div className="profile-name">Editing: {patient.firstName} {patient.lastName}</div>
                            <div className="profile-meta"><span>Make changes below and click Save</span></div>
                        </div>
                        <div className="profile-actions">
                            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? '⏳ Saving...' : '💾 Save Changes'}
                            </button>
                        </div>
                    </div>

                    {/* Section I */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-header-icon">👤</div>
                            <div className="card-header-title">I. Patient's Information Record</div>
                        </div>
                        <div className="card-body">
                            <div className="form-grid cols-3">
                                <div className="field"><label>First Name</label><input type="text" id="firstName" value={editForm.firstName} onChange={handleChange} required /></div>
                                <div className="field"><label>Middle Name</label><input type="text" id="middleName" value={editForm.middleName} onChange={handleChange} /></div>
                                <div className="field"><label>Last Name</label><input type="text" id="lastName" value={editForm.lastName} onChange={handleChange} required /></div>

                                <div className="field"><label>Age</label><input type="number" id="age" value={editForm.age} onChange={handleChange} required min="0" /></div>
                                <div className="field">
                                    <label>Sex</label>
                                    <div className="radio-group">
                                        <RadioOption name="sex" value="Male" label="Male" checked={editForm.sex === 'Male'} onChange={handleRadio} />
                                        <RadioOption name="sex" value="Female" label="Female" checked={editForm.sex === 'Female'} onChange={handleRadio} />
                                    </div>
                                </div>
                                <div className="field"><label>Birthday</label><input type="date" id="birthday" value={editForm.birthday} onChange={handleChange} /></div>

                                <div className="field col-span-2"><label>Address</label><input type="text" id="address" value={editForm.address} onChange={handleChange} required /></div>
                                <div className="field"><label>Contact Number</label><input type="tel" id="contactNumber" value={editForm.contactNumber} onChange={handleChange} placeholder="09XXXXXXXXX" /></div>

                                <div className="field"><label>Nationality</label><input type="text" id="nationality" value={editForm.nationality} onChange={handleChange} /></div>
                                <div className="field"><label>Religion</label><input type="text" id="religion" value={editForm.religion} onChange={handleChange} /></div>
                                <div className="field"><label>Birth Place</label><input type="text" id="birthPlace" value={editForm.birthPlace} onChange={handleChange} /></div>

                                <div className="field">
                                    <label>Blood Type</label>
                                    <select id="bloodType" value={editForm.bloodType} onChange={handleChange}>
                                        {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                    </select>
                                </div>
                                <div className="field">
                                    <label>Educational Attainment</label>
                                    <select id="educationalAttain" value={editForm.educationalAttain} onChange={handleChange} required>
                                        <option value="" disabled>Select</option>
                                        {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="field">
                                    <label>Employment Status</label>
                                    <select id="employmentStatus" value={editForm.employmentStatus} onChange={handleChange} required>
                                        <option value="" disabled>Select</option>
                                        {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section II */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-header-icon">🏥</div>
                            <div className="card-header-title">II. PhilHealth &amp; Categorization</div>
                        </div>
                        <div className="card-body">
                            <div className="form-grid cols-2">
                                <div className="field"><label>PhilHealth No.</label><input type="text" id="philhealthNo" value={editForm.philhealthNo} onChange={handleChange} placeholder="XX-XXXXXXXXX-X" /></div>
                                <div className="field">
                                    <label>PhilHealth Status</label>
                                    <div className="radio-group">
                                        {['Member', 'Dependent', 'None'].map(v => (
                                            <RadioOption key={v} name="philhealthStatus" value={v} label={v} checked={editForm.philhealthStatus === v} onChange={handleRadio} />
                                        ))}
                                    </div>
                                </div>
                                <div className="field col-span-2">
                                    <label>Category</label>
                                    <div className="radio-group">
                                        <RadioOption name="category" value="4Ps" label="4Ps" checked={editForm.category === '4Ps'} onChange={handleRadio} />
                                        <RadioOption name="category" value="Other/s" label="Other/s" checked={editForm.category === 'Other/s'} onChange={handleRadio} />
                                        {editForm.category === 'Other/s' && (
                                            <input type="text" id="categoryOthers" value={editForm.categoryOthers} onChange={handleChange}
                                                placeholder="Please specify" required
                                                style={{ padding: '7px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none', minWidth: '160px' }} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section III */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-header-icon">🆘</div>
                            <div className="card-header-title">III. Emergency Contact</div>
                        </div>
                        <div className="card-body">
                            <div className="form-grid cols-3">
                                <div className="field"><label>Relative's Name</label><input type="text" id="relativeName" value={editForm.relativeName} onChange={handleChange} /></div>
                                <div className="field"><label>Relationship</label><input type="text" id="relativeRelation" value={editForm.relativeRelation} onChange={handleChange} /></div>
                                <div className="field"><label>Relative's Address</label><input type="text" id="relativeAddress" value={editForm.relativeAddress} onChange={handleChange} /></div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        );
    }

    // ── Read-only view ────────────────────────────────────────────────────────
    return (
        <div className="page">
            {/* Profile hero */}
            <div className="profile-hero">
                <div className="profile-av">{(patient.firstName?.[0] || '?').toUpperCase()}</div>
                <div className="profile-info">
                    <div className="profile-name">{patient.firstName} {patient.middleName || ''} {patient.lastName}</div>
                    <div className="profile-meta">
                        <span>🩸 {patient.bloodType || 'Unknown'}</span>
                        <span>👤 {patient.sex || '—'}</span>
                        <span>🎂 {patient.age ?? '—'} yrs</span>
                        <span>📍 {patient.address || '—'}</span>
                    </div>
                </div>
                <div className="profile-actions">
                    <button className="btn btn-orange" onClick={() => setEditing(true)}>✏️ Edit</button>
                    <button className="btn btn-danger" onClick={handleDelete}>🗑 Delete</button>
                </div>
            </div>

            {/* Section I */}
            <div className="card">
                <div className="card-header">
                    <div className="card-header-icon">👤</div>
                    <div className="card-header-title">I. Patient's Information Record</div>
                </div>
                <div className="card-body">
                    <div className="detail-grid">
                        <DetailItem label="First Name" value={patient.firstName} />
                        <DetailItem label="Middle Name" value={patient.middleName} />
                        <DetailItem label="Last Name" value={patient.lastName} />
                        <DetailItem label="Age" value={patient.age} />
                        <DetailItem label="Sex" value={patient.sex} />
                        <DetailItem label="Birthday" value={patient.birthday} />
                        <DetailItem label="Birth Place" value={patient.birthPlace} />
                        <DetailItem label="Blood Type" value={patient.bloodType} />
                        <DetailItem label="Nationality" value={patient.nationality} />
                        <DetailItem label="Religion" value={patient.religion} />
                        <DetailItem label="Contact Number" value={patient.contactNumber} />
                        <DetailItem label="Address" value={patient.address} />
                        <DetailItem label="Educational Attainment" value={patient.educationalAttain} />
                        <DetailItem label="Employment Status" value={patient.employmentStatus} />
                    </div>
                </div>
            </div>

            {/* Section II */}
            <div className="card">
                <div className="card-header">
                    <div className="card-header-icon">🏥</div>
                    <div className="card-header-title">II. PhilHealth &amp; Categorization</div>
                </div>
                <div className="card-body">
                    <div className="detail-grid">
                        <DetailItem label="PhilHealth No." value={patient.philhealthNo} />
                        <DetailItem label="PhilHealth Status" value={patient.philhealthStatus} />
                        <DetailItem label="Category" value={displayCategory(patient)} />
                    </div>
                </div>
            </div>

            {/* Section III */}
            <div className="card">
                <div className="card-header">
                    <div className="card-header-icon">🆘</div>
                    <div className="card-header-title">III. Emergency Contact</div>
                </div>
                <div className="card-body">
                    <div className="detail-grid">
                        <DetailItem label="Relative's Name" value={patient.relativeName} />
                        <DetailItem label="Relationship" value={patient.relativeRelation} />
                        <DetailItem label="Relative's Address" value={patient.relativeAddress} />
                    </div>
                </div>
            </div>

            {/* Consent button */}
            <button className="consent-btn" onClick={() => setShowConsent(true)}>
                📋 Proceed to Patient Consent →
            </button>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><Details /></React.StrictMode>
);