import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import PatientConsent from './patient_consent'; 

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Patient {
    id: string;
    firstName: string;
    middleName: string;
    lastName: string;
    age: number | null;
    sex: string;
    birthday: string;
    birthPlace: string;
    bloodType: string;
    nationality: string;
    religion: string;
    address: string;
    contactNumber: string;
    educationalAttain: string;
    employmentStatus: string;
    philhealthNo: string;
    philhealthStatus: string;
    category: string;
    categoryOthers: string;
    relativeName: string;
    relativeRelation: string;
    relativeAddress: string;
}

interface EditForm {
    firstName: string;
    middleName: string;
    lastName: string;
    age: string;
    sex: string;
    nationality: string;
    bloodType: string;
    religion: string;
    birthday: string;
    birthPlace: string;
    address: string;
    contactNumber: string;
    educationalAttain: string;
    employmentStatus: string;
    philhealthNo: string;
    philhealthStatus: string;
    category: string;
    categoryOthers: string;
    relativeName: string;
    relativeRelation: string;
    relativeAddress: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;
const EDUCATION_LEVELS = [
    'No Formal Education', 'Elementary Level', 'Elementary Graduate',
    'High School Level', 'High School Graduate', 'Vocational',
    'College Level', 'College Graduate', 'Post-Graduate'
] as const;
const EMPLOYMENT_STATUSES = [
    'Employed', 'Unemployed', 'Self-Employed', 'Student', 'Retired'
] as const;

const patientId = new URLSearchParams(window.location.search).get('id');

// ─── Component ────────────────────────────────────────────────────────────────
function Details() {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [editing, setEditing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({
        firstName: '', middleName: '', lastName: '',
        age: '', sex: '', nationality: '', bloodType: 'O+', religion: '',
        birthday: '', birthPlace: '', address: '', contactNumber: '',
        educationalAttain: '', employmentStatus: '',
        philhealthNo: '', philhealthStatus: '', category: '', categoryOthers: '',
        relativeName: '', relativeRelation: '', relativeAddress: ''
    });
    const [showConsentForm, setShowConsentForm] = useState<boolean>(false);

    // 1. Load patient on mount
    useEffect(() => {
        if (!patientId) {
            setError('No patient ID provided in URL.');
            return;
        }
        loadPatient();
    }, []);

    async function loadPatient(): Promise<void> {
        const { data: patient, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

        if (error || !patient) {
            setError('Patient not found. They may have been deleted.');
            return;
        }

        setPatient(patient as Patient);
        setEditForm({
            firstName:         patient.firstName         || '',
            middleName:        patient.middleName        || '',
            lastName:          patient.lastName          || '',
            age:               patient.age?.toString()   ?? '',
            sex:               patient.sex               || '',
            nationality:       patient.nationality       || '',
            bloodType:         patient.bloodType         || 'O+',
            religion:          patient.religion          || '',
            birthday:          patient.birthday          || '',
            birthPlace:        patient.birthPlace        || '',
            address:           patient.address           || '',
            contactNumber:     patient.contactNumber     || '',
            educationalAttain: patient.educationalAttain || '',
            employmentStatus:  patient.employmentStatus  || '',
            philhealthNo:      patient.philhealthNo      || '',
            philhealthStatus:  patient.philhealthStatus  || '',
            category:          patient.category          || '',
            categoryOthers:    patient.categoryOthers    || '',
            relativeName:      patient.relativeName      || '',
            relativeRelation:  patient.relativeRelation  || '',
            relativeAddress:   patient.relativeAddress   || ''
        });
    }

    // 2. Toggle edit mode
    const toggleEdit = (): void => setEditing(v => !v);

    // 3. Handle edit form input
    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const { id, value } = e.target;
        setEditForm(f => ({ ...f, [id]: value }));
    };

    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        setEditForm(f => ({ ...f, [name]: value }));
        
        // Clear 'Others' text input if 4Ps is selected
        if (name === 'category' && value === '4Ps') {
            setEditForm(f => ({ ...f, categoryOthers: '' }));
        }
    };

    // 4. Save updated record
    // 4. Save updated record
    const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        
        // Parse the age safely. If it's empty, send null to prevent NaN database errors
        const parsedAge = parseInt(editForm.age);
        const updates = { 
            ...editForm, 
            age: isNaN(parsedAge) ? null : parsedAge 
        };

        console.log("Attempting to update patient ID:", patientId, "with data:", updates);

        // We add .select() so Supabase returns the updated row. 
        const { data, error } = await supabase
            .from('patients')
            .update(updates)
            .eq('id', patientId)
            .select(); // <--- CRITICAL ADDITION

        if (error) {
            alert('Error updating record: ' + error.message);
            console.error("Supabase Error:", error);
            return;
        }

        // Check if Supabase silently ignored the update (Usually an RLS issue)
        if (!data || data.length === 0) {
            alert("Update failed! Supabase blocked the edit. This is usually caused by missing 'UPDATE' Row Level Security (RLS) policies in your Supabase dashboard.");
            console.error("Update returned 0 rows. RLS is likely blocking the UPDATE action.");
            return;
        }

        alert('Record updated successfully!');
        setPatient(p => p ? { ...p, ...updates } : null);
        setEditing(false);
    };

    // 5. Delete record
    const handleDelete = async (): Promise<void> => {
        if (!confirm('Permanently delete this patient record? This cannot be undone.')) return;

        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', patientId);

        if (error) {
            alert('Error deleting record: ' + error.message);
            return;
        }

        alert('Record deleted.');
        window.location.href = 'templates.html';
    };

    // Helper for category display
    const displayCategory = (p: Patient) => {
        if (p.category === 'Other/s') return `Others (${p.categoryOthers || 'Unspecified'})`;
        return p.category || 'N/A';
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="form-container">
            <div className="button-group" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => window.location.href = 'templates.html'}>← Back</button>
                <button id="editBtn" onClick={toggleEdit}>
                    {editing ? 'Cancel Editing' : 'Edit Record'}
                </button>
                {!editing && (
                    <button
                        id="deleteBtn"
                        style={{ backgroundColor: '#e53e3e', color: 'white' }}
                        onClick={handleDelete}
                        disabled={!!error}
                    >
                        Delete Record
                    </button>
                )}
            </div>

            {/* Error state */}
            {error && (
                <>
                    <h2 id="fullNameTitle">Error</h2>
                    <p style={{ color: '#e53e3e', fontWeight: 600 }}>{error}</p>
                </>
            )}

            {/* Read-only view */}
            {patient && !editing && !showConsentForm && (
                <>
                    <h2 id="fullNameTitle">{patient.firstName} {patient.lastName}</h2>
                    <hr />
                    <div id="fullDetails">
                        <div className="profile-section">
                            <h3>Personal Information</h3>
                            <p><strong>Full Name:</strong> {patient.firstName} {patient.middleName || ''} {patient.lastName}</p>
                            <p><strong>Age:</strong> {patient.age ?? 'N/A'}</p>
                            <p><strong>Sex:</strong> {patient.sex || 'N/A'}</p>
                            <p><strong>Birthday:</strong> {patient.birthday || 'N/A'}</p>
                            <p><strong>Birthplace:</strong> {patient.birthPlace || 'N/A'}</p>
                            <p><strong>Blood Type:</strong> {patient.bloodType || 'N/A'}</p>
                            <p><strong>Nationality:</strong> {patient.nationality || 'N/A'}</p>
                            <p><strong>Religion:</strong> {patient.religion || 'N/A'}</p>
                            <p><strong>Address:</strong> {patient.address || 'N/A'}</p>
                            <p><strong>Contact Number:</strong> {patient.contactNumber || 'N/A'}</p>
                            <p><strong>Education:</strong> {patient.educationalAttain || 'N/A'}</p>
                            <p><strong>Employment Status:</strong> {patient.employmentStatus || 'N/A'}</p>
                            
                            <hr />
                            <h3>PhilHealth & Categorization</h3>
                            <p><strong>PhilHealth No:</strong> {patient.philhealthNo || 'N/A'}</p>
                            <p><strong>Status:</strong> {patient.philhealthStatus || 'N/A'}</p>
                            <p><strong>Category:</strong> {displayCategory(patient)}</p>

                            <hr />
                            <h3>Emergency Contact</h3>
                            <p><strong>Relative Name:</strong> {patient.relativeName || 'N/A'}</p>
                            <p><strong>Relationship:</strong> {patient.relativeRelation || 'N/A'}</p>
                            <p><strong>Relative Address:</strong> {patient.relativeAddress || 'N/A'}</p>
                        </div>
                    </div>
                    
                    {/* NEW: Button to open the consent form */}
                    <div style={{ marginTop: '20px' }}>
                        <button 
                            onClick={() => setShowConsentForm(true)} 
                            style={{ backgroundColor: '#2b6cb0', color: 'white', width: '100%', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}
                        >
                            Proceed to Patient Consent →
                        </button>
                    </div>
                </>
            )}

            {/* NEW: Render the Consent Form when the button is clicked */}
            {patient && !editing && showConsentForm && (
                <div>
                    <button 
                        onClick={() => setShowConsentForm(false)} 
                        style={{ marginBottom: '15px', backgroundColor: '#718096', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        ← Back to Details
                    </button>
                    <PatientConsent 
                        patientId={patient.id} 
                        patientName={`${patient.firstName} ${patient.lastName}`}
                        onConsentSaved={() => {
                            setShowConsentForm(false);
                            // Refresh patient data to reflect new consent status if needed
                            loadPatient(); 
                        }}
                    />
                </div>
            )}

            {/* Edit form */}
            {patient && editing && (
                <form id="editForm" onSubmit={handleEditSubmit}>
                    <h3>Edit Patient Information</h3>

                    <div className="input-group">
                        <label>First Name</label>
                        <input type="text" id="firstName" value={editForm.firstName} onChange={handleEditChange} required />
                    </div>

                    <div className="input-group">
                        <label>Middle Name</label>
                        <input type="text" id="middleName" value={editForm.middleName} onChange={handleEditChange} />
                    </div>

                    <div className="input-group">
                        <label>Last Name</label>
                        <input type="text" id="lastName" value={editForm.lastName} onChange={handleEditChange} required />
                    </div>

                    <div className="input-group">
                        <label>Age</label>
                        <input type="number" id="age" value={editForm.age} onChange={handleEditChange} required />
                    </div>

                    <div className="input-group">
                        <label>Address</label>
                        <input type="text" id="address" value={editForm.address} onChange={handleEditChange} required />
                    </div>

                    <div className="input-group">
                        <label>Contact Number</label>
                        <input type="tel" id="contactNumber" value={editForm.contactNumber} onChange={handleEditChange} placeholder="09XX-XXX-XXXX" />
                    </div>

                    <div className="input-group">
                        <label>Nationality</label>
                        <input type="text" id="nationality" value={editForm.nationality} onChange={handleEditChange} placeholder="e.g. Filipino" />
                    </div>

                    <div className="input-group">
                        <label>Sex</label>
                        <div className="radio-group">
                            <input type="radio" name="sex" value="Male" id="male" checked={editForm.sex === 'Male'} onChange={handleRadioChange} required /> Male
                            <input type="radio" name="sex" value="Female" id="female" checked={editForm.sex === 'Female'} onChange={handleRadioChange} required /> Female
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Blood Type</label>
                        <select id="bloodType" value={editForm.bloodType} onChange={handleEditChange}>
                            {BLOOD_TYPES.map(bt => (
                                <option key={bt} value={bt}>{bt}</option>
                            ))}
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Religion</label>
                        <input type="text" id="religion" value={editForm.religion} onChange={handleEditChange} placeholder="Religion" />
                    </div>

                    <div className="input-group">
                        <label>Birthday</label>
                        <input type="date" id="birthday" value={editForm.birthday} onChange={handleEditChange} />
                    </div>

                    <div className="input-group">
                        <label>Birth Place</label>
                        <input type="text" id="birthPlace" value={editForm.birthPlace} onChange={handleEditChange} placeholder="Birth Place" />
                    </div>

                    <div className="input-group">
                        <label>Educational Attainment</label>
                        <select id="educationalAttain" value={editForm.educationalAttain} onChange={handleEditChange} required>
                            <option value="" disabled>Select Educational Attainment</option>
                            {EDUCATION_LEVELS.map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Employment Status</label>
                        <select id="employmentStatus" value={editForm.employmentStatus} onChange={handleEditChange} required>
                            <option value="" disabled>Select Employment Status</option>
                            {EMPLOYMENT_STATUSES.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    <hr />
                    <h4>PhilHealth & Categorization</h4>

                    <div className="input-group">
                        <label>PhilHealth No.</label>
                        <input type="text" id="philhealthNo" value={editForm.philhealthNo} onChange={handleEditChange} placeholder="PHILHEALTH NO." />
                    </div>

                    <div className="input-group">
                        <label>PhilHealth Status</label>
                        <div className="radio-group">
                            <input type="radio" name="philhealthStatus" value="MEMBER" checked={editForm.philhealthStatus === 'MEMBER'} onChange={handleRadioChange} /> MEMBER
                            <input type="radio" name="philhealthStatus" value="DEPENDENT" checked={editForm.philhealthStatus === 'DEPENDENT'} onChange={handleRadioChange} /> DEPENDENT
                            <input type="radio" name="philhealthStatus" value="NONE" checked={editForm.philhealthStatus === 'NONE'} onChange={handleRadioChange} /> NONE
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Category</label>
                        <div className="radio-group" style={{ flexWrap: 'wrap' }}>
                            <input type="radio" name="category" value="4Ps" checked={editForm.category === '4Ps'} onChange={handleRadioChange} /> 4Ps
                            <input type="radio" name="category" value="Other/s" checked={editForm.category === 'Other/s'} onChange={handleRadioChange} /> Other/s
                            
                            {editForm.category === 'Other/s' && (
                                <input 
                                    type="text" 
                                    id="categoryOthers" 
                                    value={editForm.categoryOthers} 
                                    onChange={handleEditChange} 
                                    placeholder="Please specify" 
                                    style={{ marginLeft: '10px', padding: '8px', flex: '1' }} 
                                    required 
                                />
                            )}
                        </div>
                    </div>

                    <hr />
                    <h4>Emergency Contact Information</h4>

                    <div className="input-group">
                        <label>Relative's Name</label>
                        <input type="text" id="relativeName" value={editForm.relativeName} onChange={handleEditChange} placeholder="Relative's Name" />
                    </div>

                    <div className="input-group">
                        <label>Relative Relationship</label>
                        <input type="text" id="relativeRelation" value={editForm.relativeRelation} onChange={handleEditChange} placeholder="Relative Relationship" />
                    </div>

                    <div className="input-group">
                        <label>Relative Address</label>
                        <input type="text" id="relativeAddress" value={editForm.relativeAddress} onChange={handleEditChange} placeholder="Relative Address" />
                    </div>

                    <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn-save" style={{ backgroundColor: '#38a169', color: 'white' }}>Save Changes</button>
                        <button type="button" className="btn-cancel" onClick={toggleEdit}>Cancel</button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ─── Mount ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Details />
    </React.StrictMode>
);