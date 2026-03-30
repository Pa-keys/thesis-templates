import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

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
    relativeName: string;
    relativeRelation: string;
    relativeAddress: string;
}

interface EditForm {
    firstName: string;
    middleName: string;
    lastName: string;
    age: string;
    address: string;
    contactNumber: string;
    bloodType: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;
const patientId = new URLSearchParams(window.location.search).get('id');

// ─── Component ────────────────────────────────────────────────────────────────
function Details() {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [editing, setEditing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({
        firstName: '', middleName: '', lastName: '',
        age: '', address: '', contactNumber: '', bloodType: 'O+',
    });

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
            firstName:     patient.firstName     || '',
            middleName:    patient.middleName     || '',
            lastName:      patient.lastName       || '',
            age:           patient.age?.toString() ?? '',
            address:       patient.address        || '',
            contactNumber: patient.contactNumber  || '',
            bloodType:     patient.bloodType      || 'O+',
        });
    }

    // 2. Toggle edit mode
    const toggleEdit = (): void => setEditing(v => !v);

    // 3. Handle edit form input
    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const { id, value } = e.target;
        setEditForm(f => ({ ...f, [id]: value }));
    };

    // 4. Save updated record
    const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        const updates = { ...editForm, age: parseInt(editForm.age) };

        const { error } = await supabase
            .from('patients')
            .update(updates)
            .eq('id', patientId);

        if (error) {
            alert('Error updating record: ' + error.message);
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
            {patient && !editing && (
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
                            <h3>Emergency Contact</h3>
                            <p><strong>Relative Name:</strong> {patient.relativeName || 'N/A'}</p>
                            <p><strong>Relationship:</strong> {patient.relativeRelation || 'N/A'}</p>
                            <p><strong>Relative Address:</strong> {patient.relativeAddress || 'N/A'}</p>
                        </div>
                    </div>
                </>
            )}

            {/* Edit form */}
            {patient && editing && (
                <form id="editForm" onSubmit={handleEditSubmit}>
                    <h3>Edit Patient Information</h3>

                    <label>First Name</label>
                    <input type="text" id="firstName" value={editForm.firstName} onChange={handleEditChange} required />

                    <label>Middle Name</label>
                    <input type="text" id="middleName" value={editForm.middleName} onChange={handleEditChange} />

                    <label>Last Name</label>
                    <input type="text" id="lastName" value={editForm.lastName} onChange={handleEditChange} required />

                    <label>Age</label>
                    <input type="number" id="age" value={editForm.age} onChange={handleEditChange} required />

                    <label>Address</label>
                    <input type="text" id="address" value={editForm.address} onChange={handleEditChange} required />

                    <label>Contact Number</label>
                    <input type="tel" id="contactNumber" value={editForm.contactNumber} onChange={handleEditChange} placeholder="09XX-XXX-XXXX" />

                    <label>Blood Type</label>
                    <select id="bloodType" value={editForm.bloodType} onChange={handleEditChange}>
                        {BLOOD_TYPES.map(bt => (
                            <option key={bt} value={bt}>{bt}</option>
                        ))}
                    </select>

                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                        <button type="submit" style={{ backgroundColor: '#38a169', color: 'white' }}>Save Changes</button>
                        <button type="button" onClick={toggleEdit}>Cancel</button>
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