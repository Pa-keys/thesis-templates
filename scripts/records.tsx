import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../shared/supabase';

const MALVAR_BARANGAYS = [
    'Bagong Pook, Malvar, Batangas',
    'Bilucao, Malvar, Batangas',
    'Bulihan, Malvar, Batangas',
    'Luta del Norte, Malvar, Batangas',
    'Luta del Sur, Malvar, Batangas',
    'Poblacion, Malvar, Batangas',
    'San Andres, Malvar, Batangas',
    'San Fernando, Malvar, Batangas',
    'San Gregorio, Malvar, Batangas',
    'San Isidro, Malvar, Batangas',
    'San Juan, Malvar, Batangas',
    'San Pedro I, Malvar, Batangas',
    'San Pedro II, Malvar, Batangas',
    'San Pioquinto, Malvar, Batangas',
    'Santiago, Malvar, Batangas',
] as const;

const OUTSIDE_MALVAR = '__outside__';

interface Patient {
    id: string;
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    age: number | null;
    sex: string;
    bloodType: string;
    address?: string;
    contactNumber?: string;
    birthday?: string;
    civilStatus?: string;
    nationality?: string;
    religion?: string;
    educationalAttain?: string;
    employmentStatus?: string;
    philhealthNo?: string;
    philhealthStatus?: string;
    category?: string;
    categoryOthers?: string;
    relativeName?: string;
    relativeRelation?: string;
    relativeAddress?: string;
}

// ─── Accepts optional onPatientClick — if provided, opens modal; otherwise navigates ───
export function RecordsComponent({ onPatientClick }: { onPatientClick?: (patient: Patient) => void } = {}) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [allPatients, setAllPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [selectedBarangay, setSelectedBarangay] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const fetchPatients = useCallback(async () => {
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

        setAllPatients(data as Patient[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    useEffect(() => {
        const lower = search.toLowerCase();
        const filtered = allPatients.filter(p => {
            const nameMatch = `${p.firstName} ${p.middleName} ${p.lastName}`
                .toLowerCase().includes(lower);
            const barangayMatch =
                selectedBarangay === ''
                    ? true
                    : selectedBarangay === OUTSIDE_MALVAR
                        ? !MALVAR_BARANGAYS.some(b => p.address?.toLowerCase().includes(b.toLowerCase()))
                        : p.address?.toLowerCase().includes(selectedBarangay.toLowerCase());
            return nameMatch && barangayMatch;
        });
        setPatients(filtered);
    }, [search, selectedBarangay, allPatients]);

    const handleRowClick = (p: Patient) => {
        if (onPatientClick) {
            onPatientClick(p);
        } else {
            window.location.href = `/pages/details.html?id=${p.id}`;
        }
    };

    return (
        <div className="w-full">
            <div className="page-container w-full max-w-7xl mx-auto">
                <div className="list-card bg-white rounded-2xl border border-slate-100 shadow-sm p-6">

                    <div className="list-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="list-header-title text-xl font-bold text-slate-800">Patient Records Database</div>
                        <span className="list-count bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold w-fit">
                            {patients.length} Records
                        </span>
                    </div>

                    <div className="search-wrap flex flex-col sm:flex-row gap-3 mb-6">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50 focus:bg-white transition-colors"
                            />
                        </div>

                        <div className="relative shrink-0 flex gap-2">
                            <div className="relative w-full sm:w-[240px]">
                                <select
                                    value={selectedBarangay}
                                    onChange={e => setSelectedBarangay(e.target.value)}
                                    className={`
                                        w-full h-full pl-4 pr-10 py-2.5
                                        border rounded-xl text-sm
                                        appearance-none cursor-pointer
                                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                        transition-colors
                                        ${selectedBarangay ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium' : 'border-slate-200 bg-white text-slate-700'}
                                    `}
                                >
                                    <option value="">All Barangays</option>
                                    {MALVAR_BARANGAYS.map(b => (
                                        <option key={b} value={b}>{b.split(',')[0]}</option>
                                    ))}
                                    <option value={OUTSIDE_MALVAR}>Outside Malvar</option>
                                </select>
                                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {selectedBarangay && (
                                <button
                                    onClick={() => setSelectedBarangay('')}
                                    className="flex items-center justify-center px-4 py-2.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors whitespace-nowrap"
                                >
                                    ✕ Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {selectedBarangay && (
                        <div className="px-1 pb-4 text-xs text-slate-500">
                            Showing patients from{' '}
                            <span className="font-semibold text-blue-600">
                                {selectedBarangay === OUTSIDE_MALVAR ? 'Outside Malvar' : selectedBarangay.split(',')[0]}
                            </span>
                            {' '}· {patients.length} result{patients.length !== 1 ? 's' : ''}
                        </div>
                    )}

                    <div className="patient-list border-t border-slate-100 pt-4">
                        {loading ? (
                            <div className="empty-list text-center py-10 text-slate-400 flex flex-col items-center gap-3">
                                <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                </svg>
                                <span>Loading records...</span>
                            </div>
                        ) : patients.length === 0 ? (
                            <div className="empty-list text-center py-12 text-slate-500">
                                <div className="text-3xl mb-2">📭</div>
                                No patients found.
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {patients.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => handleRowClick(p)}
                                        className="patient-row flex items-center justify-between gap-4 p-4 hover:bg-slate-50 rounded-xl cursor-pointer border border-transparent hover:border-slate-200 transition-all group"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="patient-av w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                                                {(p.firstName?.[0] || '?').toUpperCase()}
                                            </div>
                                            <div className="patient-info flex-1 min-w-0">
                                                <div className="patient-name font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors truncate">
                                                    {p.lastName}, {p.firstName} {p.middleName || ''} {p.suffix || ''}
                                                </div>
                                                <div className="patient-meta text-xs text-slate-500 mt-1 flex flex-wrap gap-1">
                                                    {p.sex || '—'} &middot; {p.age ?? '—'} yrs &middot; {p.bloodType || '—'}
                                                    {p.address && (
                                                        <> &middot; <span className="text-slate-400 truncate max-w-[200px]">{p.address.split(',')[0]}</span></>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="patient-arrow text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all font-bold text-xl hidden sm:block">&rarr;</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}