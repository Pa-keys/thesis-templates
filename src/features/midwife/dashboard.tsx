import React, { useMemo } from 'react';

interface Props {
    patients: any[];
    rhuPersonnel: string;
    censusRecords: any[];
    onNavigateToRecords: () => void;
    onPatientClick?: (patient: any) => void; // ← NEW
}

const Dashboard = ({ patients, censusRecords, onNavigateToRecords, onPatientClick }: Props) => {

    const recentPatients = useMemo(() => {
        return [...patients]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((p: any) => ({
                ...p,
                consent_signed: Array.isArray(p.patient_consent)
                    ? p.patient_consent.length > 0
                    : p.patient_consent !== null
            }));
    }, [patients]);

    const maternalCount = censusRecords.filter(r => r.category === 'maternal').length;
    const childCount    = censusRecords.filter(r => r.category === 'child').length;
    const fpCount       = censusRecords.filter(r => r.category === 'family_planning').length;
    const totalPatients = patients.length;

    const todayCount = useMemo(() => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        return censusRecords.filter(r => {
            if (!r.created_at) return false;
            const recordDate = new Date(r.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
            return recordDate === today;
        }).length;
    }, [censusRecords]);

    return (
        <div className="w-full max-w-full px-2 sm:px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">FHSIS Overview</h1>
                    <p className="text-sm text-slate-500 mt-1">Live metrics for the current reporting month.</p>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-10 w-full">
                {[
                    { icon: '👥', label: 'Master Registry',      value: totalPatients, bg: 'bg-blue-50',    text: 'text-blue-600'   },
                    { icon: '🤰', label: 'Maternal Care',        value: maternalCount, bg: 'bg-pink-50',    text: 'text-pink-600'   },
                    { icon: '👶', label: 'Child Care (Immu)',    value: childCount,    bg: 'bg-emerald-50', text: 'text-emerald-600'},
                    { icon: '💊', label: 'Family Planning',      value: fpCount,       bg: 'bg-purple-50',  text: 'text-purple-600' },
                ].map(({ icon, label, value, bg, text }) => (
                    <div key={label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow w-full">
                        <div className={`w-14 h-14 rounded-full ${bg} ${text} flex items-center justify-center text-2xl shadow-inner shrink-0`}>{icon}</div>
                        <div className="min-w-0">
                            <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest truncate">{label}</div>
                            <div className="text-3xl font-extrabold text-slate-800 leading-none mt-1">{value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lower Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 w-full">

                {/* Recent Reports */}
                <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm w-full overflow-hidden">
                    <div className="border-b border-slate-100 p-6 sm:p-8 bg-slate-50/50 flex justify-between items-start w-full">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Recent Reports Encodes</h3>
                            <p className="text-sm text-slate-500 mt-1">Latest entries synchronized with the database.</p>
                        </div>
                        <span className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold shrink-0 shadow-sm">
                            {todayCount} Today
                        </span>
                    </div>
                    <div className="flex-1 w-full">
                        {censusRecords.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 font-medium">No entries for this month yet.</div>
                        ) : (
                            <div className="divide-y divide-slate-100 w-full">
                                {censusRecords.slice(0, 6).map((record, i) => (
                                    <div key={i} className="flex items-center gap-4 sm:gap-6 p-5 sm:p-6 hover:bg-slate-50 transition-colors w-full">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-base border border-slate-200 uppercase shrink-0">
                                            {record.patientName?.charAt(0) || 'P'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 text-base capitalize truncate">{record.patientName || 'Unknown'}</div>
                                            <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wide mt-1 truncate">
                                                {record.category} • Brgy. {record.address || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="text-sm text-slate-500 font-semibold shrink-0">
                                            {new Date(record.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Patient Directory — clicks now open modal instead of redirecting */}
                <div className="lg:col-span-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm w-full overflow-hidden max-h-[600px]">
                    <div className="border-b border-slate-100 p-6 sm:p-8 bg-slate-50/50 flex justify-between items-start w-full">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Patient Directory</h3>
                            <p className="text-sm text-slate-500 mt-1">All registered patients</p>
                        </div>
                        <button
                            onClick={onNavigateToRecords}
                            className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                        >
                            View All →
                        </button>
                    </div>

                    <div className="p-5 sm:p-6 flex-1 w-full bg-white overflow-y-auto scrollbar-thin">
                        <div className="space-y-4 w-full">
                            {recentPatients.length > 0 ? recentPatients.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => onPatientClick?.(p)}   // ← opens modal, no redirect
                                    className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-all hover:border-blue-200 hover:shadow-sm group w-full"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            {p.firstName?.[0]}{p.lastName?.[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight truncate">
                                                {p.lastName}, {p.firstName}
                                            </div>
                                            <div className="text-[0.7rem] text-slate-500 font-medium mt-1 truncate">
                                                {p.age ?? '--'} yrs • {p.sex || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0 pl-2">
                                        <div className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-wider">
                                            {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </div>
                                        {!p.consent_signed ? (
                                            <span className="text-[0.6rem] font-extrabold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded shadow-sm tracking-wider uppercase">⚠️ Pending</span>
                                        ) : (
                                            <span className="text-[0.6rem] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded shadow-sm tracking-wider uppercase">✓ Signed</span>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-sm text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-xl w-full">
                                    No patients found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;