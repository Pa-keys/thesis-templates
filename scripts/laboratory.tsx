import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';

function LaboratoryPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('L');
    const [loading, setLoading] = useState(true);

    // 1. Initialize Auth & Profile
    useEffect(() => {
        requireRole('laboratory').then(profile => {
            setUserName(profile.fullName);
            const initials = profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
            setUserInitials(initials);
            fetchLabRequests();
        }).catch(err => {
            console.error("Auth Error:", err);
            // If the role is wrong, send them back to login instead of stuck in a loop
            window.location.href = "/pages/login.html";
        });

        // 2. Real-time Listener (Update UI instantly when Doctor sends a request)
        const channel = supabase.channel('lab_orders')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'lab_request' }, 
                () => fetchLabRequests()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // 3. Fetch Pending Requests
    const fetchLabRequests = async () => {
        const { data, error } = await supabase
            .from('lab_request')
            .select(`
                *,
                patients (full_name, age, gender)
            `)
            .eq('status', 'pending')
            .order('request_date', { ascending: false });

        if (error) console.error("Error fetching lab orders:", error);
        if (data) setRequests(data);
        setLoading(false);
    };

    // Helper to render requested tests as badges
    const getTestBadges = (req: any) => {
        const tests = [];
        if (req.is_cbc) tests.push("CBC");
        if (req.is_urinalysis) tests.push("Urinalysis");
        if (req.is_fecalysis) tests.push("Fecalysis");
        if (req.is_fbs) tests.push("FBS");
        if (req.is_uric_acid) tests.push("Uric Acid");
        if (req.is_cholesterol) tests.push("Cholesterol");
        if (req.is_xray) tests.push("Chest X-Ray");
        if (req.is_sputum) tests.push("Sputum");
        return tests;
    };

    return (
        <div className="flex w-full min-h-screen bg-[#F8FAFC] font-sans text-slate-800">
            {/* SIDEBAR */}
            <aside className="w-[240px] bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-50">
                <div className="flex items-center gap-3 p-5 border-b border-slate-200">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-white font-black text-xl">M</span>
                    </div>
                    <div>
                        <div className="text-base font-extrabold text-slate-900 leading-tight">MediSens</div>
                        <div className="text-[0.65rem] font-bold text-slate-400 uppercase">Laboratory Dept</div>
                    </div>
                </div>
                <nav className="flex-1 flex flex-col gap-1 px-3 mt-4">
                    <div className="px-3 py-2 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">Services</div>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold bg-[#EBF3FF] text-blue-600 rounded-lg relative">
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-md"></div>
                        <span>🧪</span> Lab Requests
                    </a>
                </nav>
                <div className="p-4 border-t border-slate-200 mt-auto">
                    <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        Sign Out ⇥
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="ml-[240px] flex-1 flex flex-col min-h-screen">
                <header className="h-[64px] bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div className="font-bold text-lg text-slate-800">Incoming Lab Requests</div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{userName}</div>
                            <div className="text-[0.7rem] text-slate-500">Medical Technologist</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">{userInitials}</div>
                    </div>
                </header>

                <main className="p-8 max-w-[1000px] mx-auto w-full">
                    <div className="mb-8">
                        <h1 className="text-2xl font-extrabold text-slate-900">Worklist</h1>
                        <p className="text-slate-500 text-sm">Process laboratory orders from RHU physicians.</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
                    ) : requests.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
                            <div className="text-4xl mb-4">📭</div>
                            <h3 className="text-lg font-bold text-slate-400">No pending lab requests</h3>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {requests.map((req) => (
                                <div key={req.labrequest_id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all flex justify-between items-center group">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-lg font-black text-slate-900">{req.patients?.full_name}</h2>
                                            <span className="text-[0.65rem] bg-orange-100 text-orange-600 font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Pending</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wide">
                                            {req.patients?.age}Y • {req.patients?.gender} • Requested: {new Date(req.request_date).toLocaleDateString()}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-2">
                                            {getTestBadges(req).map(test => (
                                                <span key={test} className="bg-slate-50 border border-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold">
                                                    {test}
                                                </span>
                                            ))}
                                            {req.chief_complaint && (
                                                <div className="w-full mt-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs italic text-blue-700">
                                                    <strong>Chief Complaint:</strong> {req.chief_complaint}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="ml-6 shrink-0">
                                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm py-3 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-all group-hover:-translate-y-0.5">
                                            Encode Results
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<LaboratoryPage />);
}