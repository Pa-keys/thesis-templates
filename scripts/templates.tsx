import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ────────────────────────────────────────────────────────────────────
interface PatientForm {
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
    relativeName: string;
    relativeRelation: string;
    relativeAddress: string;
}

interface Patient extends Omit<PatientForm, 'age'> {
    id: string;
    age: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_FORM: PatientForm = {
    firstName: '', middleName: '', lastName: '',
    age: '', sex: '',
    nationality: '', bloodType: '', religion: '',
    birthday: '', birthPlace: '', address: '',
    contactNumber: '', educationalAttain: '', employmentStatus: '',
    relativeName: '', relativeRelation: '', relativeAddress: '',
};

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

const searchInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    border: '1px solid #ccc',
    borderRadius: '4px',
};

// ─── Component ────────────────────────────────────────────────────────────────
function Templates() {
    const [session, setSession] = useState<Session | null>(null);
    const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState<string>('');

    // 1. Auth Guard
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) window.location.href = 'login.html';
            else setSession(session);
        });
    }, []);

    // 2. Logout
    const handleLogout = async (): Promise<void> => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    };

    // 3. Fetch patients
    const fetchAndDisplayRecords = useCallback(async (filterText: string = ''): Promise<void> => {
        const { data: records, error } = await supabase
            .from('patients')
            .select('*')
            .order('lastName', { ascending: true });

        if (error) { console.error('Error fetching:', error.message); return; }

        const searchLower = filterText.toLowerCase();
        const filtered = (records as Patient[]).filter(({ firstName = '', middleName = '', lastName = '' }) =>
            `${firstName} ${middleName} ${lastName}`.toLowerCase().includes(searchLower)
        );
        setPatients(filtered);
    }, []);

    useEffect(() => {
        if (session) fetchAndDisplayRecords();
    }, [session, fetchAndDisplayRecords]);

    // 4. Handle form input
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const { id, value } = e.target;
        setForm(f => ({ ...f, [id]: value }));
    };

    const handleSex = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setForm(f => ({ ...f, sex: e.target.value }));
    };

    // 5. Save new record
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        const newPatient = { ...form, age: parseInt(form.age) };

        const { error } = await supabase.from('patients').insert([newPatient]);

        if (error) {
            alert('Error saving record: ' + error.message);
        } else {
            alert('Record saved to database!');
            setForm(EMPTY_FORM);
            fetchAndDisplayRecords();
        }
    };

    if (!session) return null;

    return (
        <>
            {/* Topbar */}
            <div className="topbar">
                <span id="userEmail">Logged in as: {session.user.email}</span>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>

            {/* Registration Form */}
            <div className="form-container">
                <h2>Patient Registration</h2>
                <form id="patientForm" onSubmit={handleSubmit}>
                    <input type="text" id="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} required />
                    <input type="text" id="middleName" placeholder="Middle Name" value={form.middleName} onChange={handleChange} required />
                    <input type="text" id="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} required />
                    <input type="number" id="age" placeholder="Age" value={form.age} onChange={handleChange} required />

                    <div className="radio-section">
                        <label>Sex:</label>
                        <input type="radio" name="sex" value="Male" checked={form.sex === 'Male'} onChange={handleSex} required /> Male
                        <input type="radio" name="sex" value="Female" checked={form.sex === 'Female'} onChange={handleSex} required /> Female
                    </div>

                    <input type="text" id="nationality" placeholder="Nationality" value={form.nationality} onChange={handleChange} required />

                    <select id="bloodType" value={form.bloodType} onChange={handleChange} required>
                        <option value="" disabled>Select Blood Type</option>
                        {BLOOD_TYPES.map(bt => (
                            <option key={bt} value={bt}>{bt}</option>
                        ))}
                    </select>

                    <input type="text" id="religion" placeholder="Religion" value={form.religion} onChange={handleChange} required />
                    <input type="date" id="birthday" value={form.birthday} onChange={handleChange} required />
                    <input type="text" id="birthPlace" placeholder="Birth Place" value={form.birthPlace} onChange={handleChange} required />
                    <input type="text" id="address" placeholder="Address" value={form.address} onChange={handleChange} required />
                    <input type="tel" id="contactNumber" placeholder="09XXXXXXXXX" value={form.contactNumber} onChange={handleChange} pattern="[0-9]*" />
                    <input type="text" id="educationalAttain" placeholder="Educational Attainment" value={form.educationalAttain} onChange={handleChange} required />
                    <input type="text" id="employmentStatus" placeholder="Employment Status" value={form.employmentStatus} onChange={handleChange} required />

                    <input type="text" id="relativeName" placeholder="Relative's Name" value={form.relativeName} onChange={handleChange} />
                    <input type="text" id="relativeRelation" placeholder="Relative Relationship" value={form.relativeRelation} onChange={handleChange} />
                    <input type="text" id="relativeAddress" placeholder="Relative Address" value={form.relativeAddress} onChange={handleChange} />

                    <button type="submit" id="saveBtn">Save Record</button>
                </form>
            </div>

            {/* Patient Table */}
            <div className="table-container">
                <h3>Current Patient List</h3>
                <input
                    type="text"
                    id="searchInput"
                    placeholder="Search by name..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); fetchAndDisplayRecords(e.target.value); }}
                    style={searchInputStyle}
                />
                <table>
                    <thead>
                        <tr>
                            <th>Last Name</th>
                            <th>First Name</th>
                            <th>Age</th>
                            <th>Sex</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        {patients.map(record => (
                            <tr
                                key={record.id}
                                style={{ cursor: 'pointer' }}
                                className="clickable-row"
                                onClick={() => window.location.href = `details.html?id=${record.id}`}
                            >
                                <td>{record.lastName}</td>
                                <td>{record.firstName}</td>
                                <td>{record.age ?? 'N/A'}</td>
                                <td>{record.sex || 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

// ─── Mount ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Templates />
    </React.StrictMode>
);