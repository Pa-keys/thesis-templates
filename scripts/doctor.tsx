import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import Chart from 'chart.js/auto';
import { supabase } from '../shared/supabase';
import { Sidebar } from './sidebar';

// ─── Imported Pure Components ────────────────────────────────────────────────
import ConsultationPage from './consultation';
import { RecordsComponent } from './records';
import { TemplatesComponent } from './templates';

const DoctorDashboard = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('D');

    // SPA Navigation States
    const [activePage, setActivePage] = useState('dashboard');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedIcid, setSelectedIcid] = useState<string | null>(null);

    // Dashboard Data States
    const [totalPatients, setTotalPatients] = useState(0);
    const [visitsToday, setVisitsToday] = useState(0);
    const [queue, setQueue] = useState<any[]>([]);
    const [followUps, setFollowUps] = useState<any[]>([]);
    const [morbidityData, setMorbidityData] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);

    const trendChartRef = useRef<HTMLCanvasElement>(null);
    const morbChartRef = useRef<HTMLCanvasElement>(null);
    const trendChartInstance = useRef<Chart | null>(null);
    const morbChartInstance = useRef<Chart | null>(null);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
        { id: 'records', label: 'All Patient Records', icon: '📁' },
        { id: 'new-record', label: 'New Record', icon: '➕' },
        { id: 'consultation', label: 'Consultation Room', icon: '📝' }
    ];

    // Formatter for time (e.g. 12:31 PM)
    const formatTime = (timeString: string | null) => {
        if (!timeString) return '';
        const [hourString, minute] = timeString.split(':');
        let hour = parseInt(hourString, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${minute} ${ampm}`;
    };

useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const loadDashboardData = async () => {
            try {
                const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

                // 1. Stat: Total Patients
                const { count: pCount } = await supabase.from('patients').select('*', { count: 'exact', head: true });
                setTotalPatients(pCount || 0);

                // 2. Stat: Visits Today
                const { count: vToday } = await supabase.from('initial_consultation').select('*', { count: 'exact', head: true }).eq('consultation_date', today);
                setVisitsToday(vToday || 0);

                // 3. Patient Queue
                const { data: completedConsults } = await supabase.from('consultation').select('initial_consultation_id').not('initial_consultation_id', 'is', null);
                const completedIds = completedConsults?.map(c => c.initial_consultation_id).filter(Boolean) || [];

                let queueQuery = supabase
                    .from('initial_consultation')
                    .select(`
                        initialconsultation_id, 
                        patient_id, 
                        consultation_time, 
                        patients!inner(firstName, lastName, sex, bloodType)
                    `)
                    .eq('consultation_date', today)
                    .order('consultation_time', { ascending: true });

                // Safely filter out completed IDs
                if (completedIds.length > 0) {
                    queueQuery = queueQuery.not('initialconsultation_id', 'in', `(${completedIds.join(',')})`);
                }

                const { data: qData, error: qError } = await queueQuery;
                if (qError) console.error("Queue Fetch Error:", qError);
                
                console.log("Queue re-fetched successfully. Queue length:", qData?.length);
                setQueue(qData || []); 

                // 4. Upcoming Follow-ups
                const { data: fData } = await supabase.from('follow_up').select(`followup_id, patient_id, visit_date, patients!inner(firstName, lastName, sex)`).neq('follow_up_status', 'done').gte('visit_date', today).order('visit_date', { ascending: true }).limit(5);
                setFollowUps(fData || []);

                // 5. Visit Trends
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
                const { data: tData } = await supabase.from('initial_consultation').select('consultation_date').gte('consultation_date', sevenDaysAgo.toISOString().split('T')[0]);
                const dayMap: Record<string, number> = {};
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(); d.setDate(d.getDate() - i);
                    dayMap[d.toLocaleDateString('en-CA')] = 0;
                }
                tData?.forEach(v => { if (dayMap[v.consultation_date] !== undefined) dayMap[v.consultation_date]++; });
                setTrendData(Object.keys(dayMap).map(k => ({ date: k, count: dayMap[k] })));

                // 6. Morbidity Analytics
                const targets = ['Common Cold', 'Pneumonia', 'Acid Reflux', 'Asthma', 'High Cholesterol', 'Stroke', 'Arthritis'];
                const { data: mData } = await supabase.from('initial_consultation').select('diagnosis').in('diagnosis', targets);
                setMorbidityData(targets.map(t => ({ label: t, count: mData?.filter(d => d.diagnosis === t).length || 0 })));
                
            } catch (err) {
                console.error("Dashboard Load Error:", err);
            }
        };

        const fetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                window.location.href = '/pages/login.html';
                return;
            }

            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
            if (profile) {
                const name = profile.full_name || 'Dr. User';
                setUserName(name);
                setUserInitials(name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2));
            }

            await loadDashboardData();
        };

        fetchData();

        // ─── ROBUST REALTIME SUBSCRIPTION ───
        console.log("Initializing Supabase Realtime...");
        const queueSubscription = supabase
            .channel('doctor-dashboard-queue')
            .on(
                'postgres_changes',
                // Using '*' instead of 'INSERT' catches ALL updates, inserts, and deletes
                { event: '*', schema: 'public', table: 'initial_consultation' },
                (payload) => {
                    console.log('REALTIME EVENT FIRED! Nurse updated triage:', payload);
                    loadDashboardData(); 
                }
            )
            .subscribe((status) => {
                console.log("Realtime Subscription Status:", status);
            });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            supabase.removeChannel(queueSubscription);
        };
    }, []);

    // Chart Rendering
    useEffect(() => {
        if (activePage !== 'dashboard') return;

        // Visit Trends Chart (Line with fill)
        if (trendChartRef.current && trendData.length > 0) {
            if (trendChartInstance.current) {
                trendChartInstance.current.destroy();
            }

            trendChartInstance.current = new Chart(trendChartRef.current, {
                type: 'line',
                data: {
                    labels: trendData.map(d => d.date),
                    datasets: [{
                        label: 'Visits',
                        data: trendData.map(d => d.count),
                        borderColor: '#3b82f6', // blue-500
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4, // Smooth curve
                        pointBackgroundColor: '#3b82f6',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { 
                            grid: { display: false },
                            ticks: { color: '#94a3b8', font: { size: 10 } }
                        },
                        y: { 
                            grid: { color: '#f1f5f9' },
                            ticks: { stepSize: 1, precision: 0, color: '#94a3b8', font: { size: 10 } },
                            beginAtZero: true 
                        }
                    }
                }
            });
        }

        // Morbidity Chart (Horizontal Bar)
        if (morbChartRef.current && morbidityData.length > 0) {
            if (morbChartInstance.current) {
                morbChartInstance.current.destroy();
            }

            morbChartInstance.current = new Chart(morbChartRef.current, {
                type: 'bar',
                data: {
                    labels: morbidityData.map(m => m.label),
                    datasets: [{
                        label: 'Cases',
                        data: morbidityData.map(m => m.count),
                        backgroundColor: '#93c5fd', // blue-300
                        borderRadius: 2,
                        barThickness: 16,
                    }]
                },
                options: {
                    indexAxis: 'y', // Makes it horizontal
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { 
                            grid: { color: '#f1f5f9' },
                            ticks: { stepSize: 1, precision: 0, color: '#94a3b8', font: { size: 10 } },
                            beginAtZero: true 
                        },
                        y: { 
                            grid: { display: false },
                            ticks: { color: '#64748b', font: { size: 11 } }
                        }
                    }
                }
            });
        }
    }, [trendData, morbidityData, activePage]);

    const handleConsultNavigate = (patientId: string, icid?: string) => {
        setSelectedPatientId(patientId);
        setSelectedIcid(icid || null);
        setActivePage('consultation');
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden w-full">
            <Sidebar
                activePage={activePage}
                userName={userName}
                userInitials={userInitials}
                userRole="General Practitioner"
                navItems={navItems}
                onNavigate={(id) => {
                    if (id !== 'consultation') {
                        setSelectedPatientId(null);
                        setSelectedIcid(null);
                    }
                    setActivePage(id);
                }}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            <main className="flex-1 overflow-auto md:ml-[240px]">
                {/* Topbar Header */}
                <header className="h-[64px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm md:shadow-none">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors duration-300 ${!isOnline ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                            <span className="relative flex h-2.5 w-2.5">
                                {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${!isOnline ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                            </span>
                            <span className={`text-[0.65rem] font-extrabold uppercase tracking-widest ${!isOnline ? 'text-amber-700' : 'text-green-700'}`}>
                                {!isOnline ? 'Offline Mode' : 'System Online'}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{userName}</div>
                            <div className="text-[0.7rem] text-slate-500">General Practitioner</div>
                        </div>
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md cursor-pointer">{userInitials}</div>
                    </div>
                </header>

                <div className="p-6 md:p-8 max-w-[1400px] mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
                    
                    {activePage === 'dashboard' && (
                        <>
                            {/* Dashboard Welcome Header */}
                            <div className="mb-2">
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Good day, {userName.split(' ')[0]}</h1>
                            </div>

                            {/* Row 1: Stat Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                    <p className="text-sm font-semibold text-slate-500 mb-2">Total Patients</p>
                                    <h2 className="text-3xl font-black text-slate-800 leading-none">{totalPatients}</h2>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                    <p className="text-sm font-semibold text-slate-500 mb-2">Visits Today</p>
                                    <h2 className="text-3xl font-black text-slate-800 leading-none">{visitsToday}</h2>
                                </div>
                            </div>

                            {/* Row 2: Queue & Trends */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                
                                {/* Patient Queue (Left) */}
                                <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[380px] overflow-hidden">
                                    <div className="p-5 border-b border-slate-100 shrink-0">
                                        <h3 className="font-bold text-slate-800 text-[0.95rem]">Patient Queue</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        {queue.length === 0 ? (
                                            <p className="text-center text-slate-400 py-16 text-sm">No patients in queue</p>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {queue.map(q => (
                                                    <div key={q.initialconsultation_id} 
                                                        onClick={() => handleConsultNavigate(q.patient_id, q.initialconsultation_id.toString())}
                                                        className="cursor-pointer px-5 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="font-bold text-slate-800 text-[0.9rem] group-hover:text-blue-600 transition-colors">{q.patients?.lastName}, {q.patients?.firstName}</p>
                                                            <p className="text-xs text-slate-500 font-medium">{q.patients?.sex} • {q.patients?.bloodType || '—'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-bold text-blue-600">{formatTime(q.consultation_time)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {queue.length > 0 && (
                                        <button onClick={() => setActivePage('records')} className="p-4 text-xs font-bold text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors text-center shrink-0">
                                            View all patients →
                                        </button>
                                    )}
                                </div>

                                {/* Visit Trends (Right) */}
                                <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
                                    <div className="flex justify-between items-center mb-4 shrink-0">
                                        <h3 className="font-bold text-slate-800 text-[0.95rem]">Visit Trends</h3>
                                        <span className="text-xs text-slate-400">Last 7 days</span>
                                    </div>
                                    <div className="flex-1 relative w-full h-full">
                                        <canvas ref={trendChartRef}></canvas>
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Morbidity Analytics & Upcoming Follow-ups */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                
                                {/* Morbidity Analytics */}
                                <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
                                    <div className="flex justify-between items-center mb-2 shrink-0">
                                        <h3 className="font-bold text-slate-800 text-[0.95rem]">Morbidity Analytics</h3>
                                        <span className="text-xs text-slate-400">Top conditions this week</span>
                                    </div>
                                    <div className="flex-1 relative w-full h-full">
                                        <canvas ref={morbChartRef}></canvas>
                                    </div>
                                </div>

                                {/* Upcoming Follow-ups */}
                                <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[380px] overflow-hidden">
                                    <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                                        <h3 className="font-bold text-slate-800 text-[0.95rem]">Upcoming Follow-ups</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        {followUps.length === 0 ? (
                                            <p className="text-center text-slate-400 py-16 text-sm">No follow-ups scheduled</p>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {followUps.map(f => (
                                                    <div key={f.followup_id} 
                                                        onClick={() => handleConsultNavigate(f.patient_id)}
                                                        className="cursor-pointer px-5 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="font-bold text-slate-800 text-[0.9rem] truncate group-hover:text-blue-600 transition-colors">{f.patients?.lastName}, {f.patients?.firstName}</p>
                                                            <p className="text-[11px] text-slate-500 font-medium">Return Visit</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md whitespace-nowrap">
                                                                {new Date(f.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {followUps.length > 0 && (
                                        <button onClick={() => setActivePage('records')} className="p-4 text-xs font-bold text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors text-center shrink-0">
                                            View all follow-ups →
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {activePage === 'records' && <RecordsComponent />}
                    {activePage === 'new-record' && <TemplatesComponent />}

                    {activePage === 'consultation' && (
                        <ConsultationPage
                            doctorName={userName}
                            doctorInitials={userInitials}
                            patientIdProp={selectedPatientId}
                            icidProp={selectedIcid}
                            onBack={() => setActivePage('dashboard')}
                        />
                    )}

                </div>
            </main>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<DoctorDashboard />);
}