import React, { useState } from 'react';

interface Props {
    patients: any[];
    records: any[];
    rhuPersonnel: string;
    isLoading?: boolean;
    onPatientClick?: (patient: any) => void;
    onNavigateToRecords?: () => void;
}

// ─── History Modal ────────────────────────────────────────────────────────────
function HistoryModal({ patient, logs, onClose }: { patient: any; logs: any[]; onClose: () => void; }) {
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 duration-300">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm uppercase shrink-0">
                            {patient.firstName?.[0] || ''}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-extrabold text-slate-800 capitalize truncate">{patient.firstName} {patient.lastName}</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{patient.sex || 'N/A'} • {patient.age || 'N/A'} YRS • {patient.address}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 font-bold transition-colors shrink-0">✕</button>
                </div>
                <div className="p-8 overflow-y-auto flex-1">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Clinical History (FHSIS Logs)</h3>
                    {logs.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="text-4xl mb-3 opacity-30">📋</div>
                            <p className="text-slate-500 font-medium">No previous records found for this patient.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:to-transparent">
                            {logs.map(log => (
                                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white text-xs shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                        {log.category === 'maternal' ? '🤰' : log.category === 'child' ? '👶' : '📋'}
                                    </div>
                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-slate-800 text-sm uppercase">{log.category.replace('_', ' ')}</span>
                                            <span className="text-[0.65rem] font-bold text-slate-400">{new Date(log.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-xs text-slate-600">
                                            {Object.entries(log.data_fields || {}).map(([key, value]) => (
                                                <div key={key} className="mt-1"><span className="font-semibold capitalize">{key.replace('_', ' ')}:</span> {String(value)}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const PatientRecords = ({ patients, records, isLoading, onPatientClick }: Props) => {
    const [searchQuery,    setSearchQuery]    = useState('');
    const [historyPatient, setHistoryPatient] = useState<any>(null);

    const filteredPatients = patients.filter(p => {
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
    });

    const patientLogs = historyPatient
        ? records.filter(r => r.patient_id === historyPatient.id)
        : [];

    return (
        <div className="w-full max-w-full px-2 sm:px-4 md:px-0 animate-in fade-in duration-500 relative">

            {historyPatient && (
                <HistoryModal
                    patient={historyPatient}
                    logs={patientLogs}
                    onClose={() => setHistoryPatient(null)}
                />
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
                <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Patient Directory</h2>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">All registered patients</p>
                    </div>
                    <div className="relative w-full md:max-w-sm">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                        <input
                            type="text"
                            placeholder="Search patient name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm shadow-sm"
                        />
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {isLoading ? (
                        <div className="py-20 text-center text-slate-400">
                            <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-3" />
                            <p className="font-bold uppercase tracking-widest text-[0.65rem]">Fetching Registry...</p>
                        </div>
                    ) : filteredPatients.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="text-4xl mb-3 opacity-40">📂</div>
                            <div className="font-bold text-slate-700 text-lg">No patients found</div>
                            <div className="text-sm text-slate-400 mt-1">Try adjusting your search query.</div>
                        </div>
                    ) : (
                        filteredPatients.map(patient => (
                            <div
                                key={patient.id}
                                className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50/30 transition-colors group"
                            >
                                {/* Clickable left side → details modal */}
                                <button
                                    onClick={() => onPatientClick?.(patient)}
                                    className="flex items-center gap-4 flex-1 min-w-0 text-left"
                                >
                                    <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm uppercase shrink-0 group-hover:bg-blue-200 transition-colors">
                                        {patient.firstName?.[0]}{patient.lastName?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-800 text-sm truncate capitalize">
                                            {patient.lastName}, {patient.firstName}
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                                            {patient.age ?? '—'} yrs • {patient.sex || 'N/A'}
                                        </div>
                                    </div>
                                </button>

                                {/* Right side */}
                                <div className="shrink-0 flex items-center gap-3">
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">
                                            {patient.created_at
                                                ? new Date(patient.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
                                                : '—'}
                                        </span>
                                        {/* ✅ Now reads pre-normalized consent_signed from useMidwifeData */}
                                        {patient.consent_signed ? (
                                            <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[0.6rem] font-extrabold px-2 py-0.5 rounded-md">✓ SIGNED</span>
                                        ) : (
                                            <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[0.6rem] font-extrabold px-2 py-0.5 rounded-md">⚠ PENDING</span>
                                        )}
                                    </div>

                                    {/* History button */}
                                    <button
                                        onClick={e => { e.stopPropagation(); setHistoryPatient(patient); }}
                                        className="text-slate-500 font-bold text-xs bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-600 hover:text-white transition-colors whitespace-nowrap"
                                        title="View FHSIS History"
                                    >
                                        📋 History
                                    </button>

                                    <div className="text-slate-300 group-hover:text-blue-400 transition-colors text-sm">›</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientRecords;