import React, { useState } from 'react';

interface Props {
    patients: any[];
    records: any[]; // Required for history modal
    isLoading?: boolean;
}

const PatientRecords = ({ patients, records, isLoading }: Props) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [historyPatient, setHistoryPatient] = useState<any>(null); // State for modal

    const filteredPatients = patients.filter(p => {
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
    });

    // Get specific logs for the selected patient
    const patientLogs = historyPatient 
        ? records.filter(r => r.patient_id === historyPatient.id) 
        : [];

    return (
        <div className="w-full max-w-full px-2 sm:px-4 md:px-0 animate-in fade-in duration-500 relative">
            
            {/* HISTORY MODAL */}
            {historyPatient && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm uppercase shrink-0">
                                    {historyPatient.firstName?.[0] || ''}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl font-extrabold text-slate-800 capitalize truncate">{historyPatient.firstName} {historyPatient.lastName}</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{historyPatient.sex || 'N/A'} • {historyPatient.age || 'N/A'} YRS • Brgy. {historyPatient.address}</p>
                                </div>
                            </div>
                            <button onClick={() => setHistoryPatient(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 font-bold transition-colors shrink-0">✕</button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto flex-1">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Clinical History (FHSIS Logs)</h3>
                            
                            {patientLogs.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="text-4xl mb-3 opacity-30">📋</div>
                                    <p className="text-slate-500 font-medium">No previous records found for this patient.</p>
                                </div>
                            ) : (
                                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:to-transparent">
                                    {patientLogs.map(log => (
                                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white text-xs shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                {log.category === 'maternal' ? '🤰' : log.category === 'child' ? '👶' : '📋'}
                                            </div>
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-slate-800 text-sm uppercase">{log.category.replace('_', ' ')}</span>
                                                    <span className="text-[0.65rem] font-bold text-slate-400">{new Date(log.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="text-xs text-slate-600">
                                                    {Object.entries(log.data_fields).map(([key, value]) => (
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
            )}

            {/* MASTER REGISTRY TABLE */}
            <div className="card shadow-sm border border-slate-200 w-full bg-white rounded-2xl overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight shrink-0">Master Patient Registry</h2>
                    
                    <div className="relative w-full md:max-w-md shrink-0">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></span>
                        <input 
                            type="text" 
                            placeholder="Search patient name..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 sm:p-5 pl-6 sm:pl-8 font-bold text-xs text-slate-500 uppercase tracking-widest w-[40%]">Patient Name</th>
                                <th className="p-4 sm:p-5 font-bold text-xs text-slate-500 uppercase tracking-widest w-[20%]">Demographics</th>
                                <th className="p-4 sm:p-5 font-bold text-xs text-slate-500 uppercase tracking-widest w-[25%]">Address</th>
                                <th className="p-4 sm:p-5 pr-6 sm:pr-8 font-bold text-xs text-slate-500 uppercase tracking-widest text-right w-[15%]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="p-20 text-center text-slate-400">
                                        <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                                        <p className="font-bold uppercase tracking-widest text-[0.6rem]">Fetching Registry...</p>
                                    </td>
                                </tr>
                            ) : filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-4 sm:p-5 pl-6 sm:pl-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200 uppercase shrink-0 group-hover:border-blue-300 group-hover:bg-white transition-colors">
                                                    {patient.firstName?.[0] || ''}{patient.lastName?.[0] || ''}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-800 capitalize truncate text-base">{patient.firstName} {patient.lastName}</div>
                                                    <div className="text-xs text-slate-500 font-medium truncate mt-0.5">ID: {patient.id?.toString().substring(0, 8)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 sm:p-5 text-slate-600">
                                            <div className="flex flex-wrap gap-2">
                                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-bold text-[0.7rem] uppercase border border-blue-100">{patient.sex || 'N/A'}</span>
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md font-bold text-[0.7rem] uppercase border border-slate-200">{patient.age || 'N/A'} YRS</span>
                                            </div>
                                        </td>
                                        <td className="p-4 sm:p-5 text-slate-600 font-medium capitalize truncate max-w-[200px] xl:max-w-none">
                                            {patient.address || 'No address on file'}
                                        </td>
                                        <td className="p-4 sm:p-5 pr-6 sm:pr-8 text-right">
                                            <button 
                                                onClick={() => setHistoryPatient(patient)} 
                                                className="text-blue-600 font-bold text-xs hover:underline bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
                                            >
                                                View History →
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-20 text-center">
                                        <div className="text-4xl mb-4 opacity-50">📂</div>
                                        <div className="font-bold text-slate-800 text-lg">No patients found</div>
                                        <div className="text-sm text-slate-500 mt-1">Try adjusting your search query.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PatientRecords;