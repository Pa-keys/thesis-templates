import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Patient {
    id: string; 
    firstName: string; middleName: string; lastName: string; suffix: string;
    age: number | null; sex: string; bloodType: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
function Records() {
    const [session, setSession] = useState<Session | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Auth guard
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                window.location.href = '/pages/login.html';
            } else {
                setSession(session);
            }
        });
    }, []);

    // Fetch patients
    const fetchPatients = useCallback(async (filterText = '') => {
        setLoading(true);
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('lastName', { ascending: true });
            
        if (error) { 
            console.error('Database Error:', error); 
            setLoading(false);
            return; 
        }

        const lower = filterText.toLowerCase();
        setPatients((data as Patient[]).filter(p =>
            `${p.firstName} ${p.middleName} ${p.lastName}`.toLowerCase().includes(lower)
        ));
        setLoading(false);
    }, []);

    useEffect(() => { 
        if (session) fetchPatients(); 
    }, [session, fetchPatients]);

    if (!session) return null;

    return (
        <div className="page-container">
            <div className="list-card">
                <div className="list-header">
                    <div className="list-header-title">Patient Records</div>
                    <span className="list-count" id="listCount">{patients.length}</span>
                </div>
                
                <div className="search-wrap">
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); fetchPatients(e.target.value); }}
                    />
                </div>
                
                <div className="patient-list">
                    {loading ? (
                        <div className="empty-list">Loading records...</div>
                    ) : patients.length === 0 ? (
                        <div className="empty-list">No patients found.</div>
                    ) : (
                        patients.map(p => (
                            <div key={p.id} className="patient-row" onClick={() => window.location.href = `/pages/details.html?id=${p.id}`}>
                                <div className="patient-av">{(p.firstName?.[0] || '?').toUpperCase()}</div>
                                <div className="patient-info">
                                    <div className="patient-name">{p.lastName}, {p.firstName} {p.middleName || ''} {p.suffix || ''}</div>
                                    <div className="patient-meta">{p.sex || '—'} &middot; {p.age ?? '—'} yrs &middot; {p.bloodType || '—'}</div>
                                </div>
                                <span className="patient-arrow">&rarr;</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><Records /></React.StrictMode>
);