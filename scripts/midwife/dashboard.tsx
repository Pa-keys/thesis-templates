import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../../shared/supabase';

interface Props {
    patients: any[];
    censusRecords: any[];
}

const Dashboard = ({ patients, censusRecords }: Props) => {
    const [recentPatients, setRecentPatients] = useState<any[]>([]);

    // Fetch ALL patients ordered by newest first, joining with patient_consent
    useEffect(() => {
        const fetchRecentPatients = async () => {
            const { data, error } = await supabase
                .from('patients')
                .select(`
                    id, 
                    firstName, 
                    lastName, 
                    sex, 
                    age, 
                    created_at,
                    patient_consent ( consent_id )
                `)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error("Error fetching patients:", error);
                return;
            }

            if (data) {
                // Process the data to map the joined table into a simple boolean
                const processedData = data.map((p: any) => ({
                    ...p,
                    // If patient_consent has records, consent is signed
                    consent_signed: Array.isArray(p.patient_consent) 
                        ? p.patient_consent.length > 0 
                        : p.patient_consent !== null
                }));
                setRecentPatients(processedData);
            }
        };
        fetchRecentPatients();
    }, []);

    // Dynamically calculate metrics based on live FHSIS database
    const maternalCount = censusRecords.filter(r => r.category === 'maternal').length;
    const childCount = censusRecords.filter(r => r.category === 'child').length;
    const fpCount = censusRecords.filter(r => r.category === 'family_planning').length;
    const totalPatients = patients.length;

    // Get today's entries
    const todayCount = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return censusRecords.filter(r => r.created_at?.startsWith(today)).length;
    }, [censusRecords]);

    return (
        <div className="w-full max-w-full px-2 sm:px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Section */}
            <div className="welcome-row mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">FHSIS Overview</h1>
                    <p className="text-sm text-slate-500 mt-1">Live metrics for the current reporting month.</p>
                </div>
            </div>

            {/* TOP METRICS: Auto-scaling grid for max width */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-10 w-full">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow w-full">
                    <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-inner shrink-0">👥</div>
                    <div className="min-w-0">
                        <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest truncate">Master Registry</div>
                        <div className="text-3xl font-extrabold text-slate-800 leading-none mt-1">{totalPatients}</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow w-full">
                    <div className="w-14 h-14 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center text-2xl shadow-inner shrink-0">🤰</div>
                    <div className="min-w-0">
                        <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest truncate">Maternal Care</div>
                        <div className="text-3xl font-extrabold text-slate-800 leading-none mt-1">{maternalCount}</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow w-full">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner shrink-0">👶</div>
                    <div className="min-w-0">
                        <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest truncate">Child Care (Immu)</div>
                        <div className="text-3xl font-extrabold text-slate-800 leading-none mt-1">{childCount}</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow w-full">
                    <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shadow-inner shrink-0">💊</div>
                    <div className="min-w-0">
                        <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest truncate">Family Planning</div>
                        <div className="text-3xl font-extrabold text-slate-800 leading-none mt-1">{fpCount}</div>
                    </div>
                </div>
            </div>

            {/* LOWER CONTENT: Responsive Split (1/3 and 2/3 ratio on large screens) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-3 gap-6 sm:gap-8 w-full">
                
                {/* COLUMN 1 & 2: Recent Reports Encodes */}
                <div className="card shadow-sm border border-slate-200 lg:col-span-2 2xl:col-span-2 flex flex-col bg-white rounded-2xl w-full overflow-hidden">
                    <div className="card-hd border-b border-slate-100 p-6 sm:p-8 bg-slate-50/50 flex justify-between items-start w-full">
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

                {/* COLUMN 3: Newly Registered Patients */}
                <div className="card shadow-sm border border-slate-200 lg:col-span-1 2xl:col-span-1 flex flex-col bg-white rounded-2xl w-full overflow-hidden max-h-[600px]">
                    <div className="card-hd border-b border-slate-100 p-6 sm:p-8 bg-slate-50/50 flex justify-between items-start w-full">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Patient Directory</h3>
                            <p className="text-sm text-slate-500 mt-1">All registered patients</p>
                        </div>
                    </div>
                    
                    {/* Added overflow-y-auto here to allow scrolling through all patients */}
                    <div className="p-5 sm:p-6 flex-1 w-full bg-white overflow-y-auto scrollbar-thin">
                        <div className="space-y-4 w-full">
                            {recentPatients.length > 0 ? recentPatients.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => window.location.href = `/pages/details.html?id=${p.id}`}
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
                                            <span className="text-[0.6rem] font-extrabold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded shadow-sm tracking-wider uppercase">
                                                ⚠️ Pending
                                            </span>
                                        ) : (
                                            <span className="text-[0.6rem] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded shadow-sm tracking-wider uppercase">
                                                ✓ Signed
                                            </span>
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