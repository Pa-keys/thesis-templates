import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient, Session } from '@supabase/supabase-js';
import { Sidebar } from './sidebar';
import { useNetworkSync, saveToIndexedDB, initIndexedDB } from '../shared/useNetworkSync';
import { OfflineBanner } from './OfflineBanner'; 

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

// ─── Role Label Helper ────────────────────────────────────────────────────────
function getRoleLabel(role: string): string {
    const map: Record<string, string> = {
        doctor:     'General Practitioner',
        nurse:      'Registered Nurse',
        BHW:        'Barangay Health Worker',
        midwives:   'Midwife',
        pharmacist: 'Pharmacist',
        labaratory: 'Medical Technologist',
        admin:      'Administrator',
    };
    return map[role] || role;
}

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
    const [userRole, setUserRole] = useState<string>('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('U');

    const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const { isOnline, isSyncing } = useNetworkSync();

    // ─── Auth & Profile ───────────────────────────────────────────────────────
    useEffect(() => {
        initIndexedDB('MediSensDB', 'offline_patients');

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) {
                window.location.href = '/pages/login.html';
                return;
            }

            setSession(session);

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                const name = profile.full_name || 'User';
                const role = profile.role || '';
                setUserName(name);
                setUserRole(role);
                const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                setUserInitials(initials);
            }
        });
    }, []);

    // ─── Fetch Patients ───────────────────────────────────────────────────────
    const fetchPatients = useCallback(async (filterText = '') => {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('lastName', { ascending: true });
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

    // ─── Save ─────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = { ...form, age: parseInt(form.age) };

        try {
            if (isOnline) {
                const { error } = await supabase.from('patients').insert([payload]);
                if (error) throw error;
                alert('Patient record saved to database!');
            } else {
                await saveToIndexedDB('MediSensDB', 'offline_patients', {
                    id: Date.now(),
                    type: 'patient_registration',
                    data: payload
                });
                alert('You are offline. Patient record saved locally and will sync when connection returns!');
            }
            setForm(EMPTY_FORM);
            fetchPatients();
        } catch (error: any) {
            console.error("Save Error:", error);
            alert('Error saving record: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Back Navigation based on role ───────────────────────────────────────
    const handleBackNavigation = () => {
        const dashboards: Record<string, string> = {
            doctor:     '/pages/doctor.html',
            nurse:      '/pages/nurse.html',
            BHW:        '/pages/bhw.html',
            midwives:   '/pages/midwife.html',
            pharmacist: '/pages/pharmacist.html',
            labaratory: '/pages/laboratory.html',
            admin:      '/pages/admin.html',
        };
        window.location.href = dashboards[userRole] || '/pages/login.html';
    };

    if (!session) return null;

    return (
        <div className="flex w-full min-h-screen bg-[#F8FAFC] text-slate-800 overflow-x-hidden">
            
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <Sidebar 
                activePage="new-record"
                doctorName={userName} 
                doctorInitials={userInitials}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            <div className="flex-1 flex flex-col min-h-screen w-full md:pl-[240px] print:pl-0">
                
                <header className="h-[64px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 print:hidden shadow-sm md:shadow-none">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)} 
                            className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="font-bold text-lg text-slate-800">Patient Registration</div>
                    </div>
                    
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors duration-300 ${
                            !isOnline 
                                ? 'bg-amber-50 border-amber-200' 
                                : isSyncing 
                                    ? 'bg-blue-50 border-blue-200' 
                                    : 'bg-green-50 border-green-200'
                        }`}>
                            <span className="relative flex h-2.5 w-2.5">
                                {isOnline && !isSyncing && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                )}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                    !isOnline ? 'bg-amber-500' : isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                                }`}></span>
                            </span>
                            <span className={`text-[0.65rem] font-extrabold uppercase tracking-widest ${
                                !isOnline ? 'text-amber-700' : isSyncing ? 'text-blue-700' : 'text-green-700'
                            }`}>
                                {!isOnline ? 'Offline Mode' : isSyncing ? 'Syncing...' : 'System Online'}
                            </span>
                        </div>

                        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                        {/* Dynamic User Info */}
                        <div className="text-right hidden sm:block ml-2">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{userName}</div>
                            <div className="text-[0.7rem] text-slate-500">{getRoleLabel(userRole)}</div>
                        </div>
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md cursor-pointer">
                            {userInitials}
                        </div>
                    </div>
                </header>

                <OfflineBanner isOnline={isOnline} />

                <main className="w-full flex-1 p-4 md:p-8 flex justify-center">
                    <div className="page" style={{ margin: 0 }}>
                        
                        <div className="page-header" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                            <div>
                                <h1 style={{ margin: 0 }}>Patient Intake &amp; Triage</h1>
                                <p style={{ margin: '4px 0 0 0' }}>Register a new patient into the system.</p>
                            </div>
                        </div>

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
                </main>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><Templates /></React.StrictMode>
);