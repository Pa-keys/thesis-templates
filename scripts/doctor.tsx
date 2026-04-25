import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import Chart from 'chart.js/auto';
import { supabase } from '../shared/supabase';
import { Sidebar } from './sidebar';

import ConsultationPage from './consultation';
import { RecordsComponent } from './records';
import { TemplatesComponent } from './templates';

type FilterPeriod = 'today' | 'week' | 'month' | 'year';

const FILTER_OPTIONS: { label: string; value: FilterPeriod }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
];

const getDateRange = (period: FilterPeriod): { from: string; to: string } => {
    const now = new Date();
    const toDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    if (period === 'today') return { from: toDate, to: toDate };
    if (period === 'week') {
        const from = new Date(now); from.setDate(from.getDate() - 6);
        return { from: from.toLocaleDateString('en-CA'), to: toDate };
    }
    if (period === 'month') {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: from.toLocaleDateString('en-CA'), to: toDate };
    }
    if (period === 'year') {
        const from = new Date(now.getFullYear(), 0, 1);
        return { from: from.toLocaleDateString('en-CA'), to: toDate };
    }
    return { from: toDate, to: toDate };
};

const FilterTabs = ({ value, onChange }: { value: FilterPeriod; onChange: (v: FilterPeriod) => void }) => (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        {FILTER_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onChange(opt.value)}
                className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-md transition-all ${value === opt.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {opt.label}
            </button>
        ))}
    </div>
);

// ── Small pulsing "LIVE" badge ─────────────────────────────────────────────
const LiveBadge = ({ status }: { status: 'connecting' | 'live' | 'error' }) => (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full
        ${status === 'live' ? 'bg-green-100 text-green-700'
            : status === 'error' ? 'bg-red-100 text-red-500'
                : 'bg-slate-100 text-slate-400'}`}>
        <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0
            ${status === 'live' ? 'bg-green-500 animate-pulse'
                : status === 'error' ? 'bg-red-400'
                    : 'bg-slate-300 animate-pulse'}`} />
        {status === 'live' ? 'Live' : status === 'error' ? 'Off' : '…'}
    </span>
);

const DoctorDashboard = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('D');

    const [activePage, setActivePage] = useState('dashboard');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedIcid, setSelectedIcid] = useState<string | null>(null);

    const [totalPatients, setTotalPatients] = useState(0);
    const [visitsToday, setVisitsToday] = useState(0);
    const [queue, setQueue] = useState<any[]>([]);
    const [followUps, setFollowUps] = useState<any[]>([]);
    const [morbidityData, setMorbidityData] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);

    const [trendFilter, setTrendFilter] = useState<FilterPeriod>('week');
    const [morbFilter, setMorbFilter] = useState<FilterPeriod>('week');

    // ── Refs so realtime callbacks always see the latest filter values ──────
    const trendFilterRef = useRef<FilterPeriod>('week');
    const morbFilterRef = useRef<FilterPeriod>('week');

    // ── Realtime status for the two panels ──────────────────────────────────
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'error'>('connecting');

    // ── Follow-ups modal ────────────────────────────────────────────────────
    const [showFollowUpsModal, setShowFollowUpsModal] = useState(false);
    const [allFollowUps, setAllFollowUps] = useState<any[]>([]);
    const showFollowUpsModalRef = useRef(false); // lets realtime refresh the open modal
    useEffect(() => { showFollowUpsModalRef.current = showFollowUpsModal; }, [showFollowUpsModal]);

    const trendChartRef = useRef<HTMLCanvasElement>(null);
    const morbChartRef = useRef<HTMLCanvasElement>(null);
    const trendChartInst = useRef<Chart | null>(null);
    const morbChartInst = useRef<Chart | null>(null);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
        { id: 'records', label: 'Patient Records', icon: '📁' },
        { id: 'consultation', label: 'Consultation Room', icon: '📝' },
    ];

    const formatTime = (t: string | null) => {
        if (!t) return '';
        const [h, m] = t.split(':');
        let hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${m} ${ampm}`;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // fetchAllFollowUps — used both by the "View all" button AND realtime
    // ─────────────────────────────────────────────────────────────────────────
    const fetchAllFollowUps = useCallback(async () => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        const { data } = await supabase
            .from('follow_up')
            .select(`followup_id, patient_id, visit_date, patients!inner(firstName, lastName, sex)`)
            .neq('follow_up_status', 'done')
            .gte('visit_date', today)
            .order('visit_date', { ascending: true });
        setAllFollowUps(data || []);
    }, []);

    const loadAllFollowUps = useCallback(async () => {
        await fetchAllFollowUps();
        setShowFollowUpsModal(true);
    }, [fetchAllFollowUps]);

    // ─────────────────────────────────────────────────────────────────────────
    // loadTrendData
    // ─────────────────────────────────────────────────────────────────────────
    const loadTrendData = useCallback(async (period: FilterPeriod) => {
        const { from, to } = getDateRange(period);
        const { data: tData } = await supabase
            .from('consultation')
            .select('initial_consultation!inner(consultation_date)')
            .gte('initial_consultation.consultation_date', from)
            .lte('initial_consultation.consultation_date', to);

        const dates = tData?.map((c: any) => c.initial_consultation?.consultation_date).filter(Boolean) || [];

        if (period === 'today') { setTrendData([{ date: to, count: dates.length }]); return; }

        if (period === 'week') {
            const dayMap: Record<string, number> = {};
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                dayMap[d.toLocaleDateString('en-CA')] = 0;
            }
            dates.forEach(date => { if (dayMap[date] !== undefined) dayMap[date]++; });
            setTrendData(Object.keys(dayMap).map(k => ({ date: k, count: dayMap[k] })));
            return;
        }

        if (period === 'month') {
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const dayMap: Record<string, number> = {};
            for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(now.getFullYear(), now.getMonth(), i);
                dayMap[d.toLocaleDateString('en-CA')] = 0;
            }
            dates.forEach(date => { if (dayMap[date] !== undefined) dayMap[date]++; });
            const weeks: { date: string; count: number }[] = [];
            const entries = Object.entries(dayMap);
            for (let i = 0; i < entries.length; i += 7) {
                const chunk = entries.slice(i, i + 7);
                weeks.push({ date: `Week ${Math.floor(i / 7) + 1}`, count: chunk.reduce((s, [, c]) => s + c, 0) });
            }
            setTrendData(weeks);
            return;
        }

        if (period === 'year') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mm: Record<string, number> = {};
            months.forEach(m => { mm[m] = 0; });
            dates.forEach(date => { const m = months[new Date(date).getMonth()]; if (m) mm[m]++; });
            setTrendData(months.map(m => ({ date: m, count: mm[m] })));
        }
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // loadMorbidityData
    // ─────────────────────────────────────────────────────────────────────────
    const loadMorbidityData = useCallback(async (period: FilterPeriod) => {
        const { from, to } = getDateRange(period);
        const { data } = await supabase
            .from('initial_consultation')
            .select('diagnosis')
            .not('diagnosis', 'is', null)
            .gte('consultation_date', from)
            .lte('consultation_date', to);

        const map: Record<string, number> = {};
        data?.forEach(({ diagnosis }) => { if (diagnosis) map[diagnosis] = (map[diagnosis] || 0) + 1; });
        const total = Object.values(map).reduce((s, n) => s + n, 0);
        setMorbidityData(
            Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 7)
                .map(([label, count]) => ({ label, count, percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0 }))
        );
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // loadQueueAndFollowUps — lightweight refresh of just the two live panels
    // Split from loadDashboardData so realtime can call only what changed.
    // ─────────────────────────────────────────────────────────────────────────
    const loadQueueAndFollowUps = useCallback(async () => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

        // Queue: initial_consultations today that don't yet have a linked consultation row
        const { data: completedConsults } = await supabase
            .from('consultation')
            .select('initialconsultation_id')
            .not('initialconsultation_id', 'is', null);
        const completedIds = completedConsults?.map((c: any) => c.initialconsultation_id).filter(Boolean) || [];

        let qQuery = supabase
            .from('initial_consultation')
            .select(`initialconsultation_id, patient_id, consultation_time, patients!inner(firstName, lastName, sex, bloodType)`)
            .eq('consultation_date', today)
            .order('initialconsultation_id', { ascending: true });
        if (completedIds.length > 0) {
            qQuery = qQuery.not('initialconsultation_id', 'in', `(${completedIds.join(',')})`);
        }
        const { data: qData } = await qQuery;
        setQueue(qData || []);

        // Follow-ups preview (5 rows)
        const { data: fData } = await supabase
            .from('follow_up')
            .select(`followup_id, patient_id, visit_date, patients!inner(firstName, lastName, sex)`)
            .neq('follow_up_status', 'done')
            .gte('visit_date', today)
            .order('visit_date', { ascending: true })
            .limit(5);
        setFollowUps(fData || []);

        // If the "all follow-ups" modal is open, refresh it too
        if (showFollowUpsModalRef.current) await fetchAllFollowUps();
    }, [fetchAllFollowUps]);

    // ─────────────────────────────────────────────────────────────────────────
    // loadDashboardData — full reload (stats + queue + follow-ups)
    // ─────────────────────────────────────────────────────────────────────────
    const loadDashboardData = useCallback(async () => {
        try {
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

            const { count: pCount } = await supabase
                .from('patients').select('*', { count: 'exact', head: true });
            setTotalPatients(pCount || 0);

            const { data: completedToday } = await supabase
                .from('consultation')
                .select('initial_consultation!inner(consultation_date)')
                .eq('initial_consultation.consultation_date', today);
            setVisitsToday(completedToday?.length || 0);

            await loadQueueAndFollowUps();
        } catch (err) {
            console.error('Dashboard Load Error:', err);
        }
    }, [loadQueueAndFollowUps]);

    // ─────────────────────────────────────────────────────────────────────────
    // Initial load + auth check
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { window.location.href = '/pages/login.html'; return; }

            const { data: profile } = await supabase
                .from('profiles').select('full_name').eq('id', session.user.id).single();
            if (profile) {
                const name = profile.full_name || 'Dr. User';
                setUserName(name);
                setUserInitials(name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2));
            }

            await loadDashboardData();
            await loadTrendData(trendFilterRef.current);
            await loadMorbidityData(morbFilterRef.current);
        };

        init();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []); // runs once on mount

    // ─────────────────────────────────────────────────────────────────────────
    // ★ REALTIME SUBSCRIPTIONS
    //   Separate from the auth/init effect so it can list stable callbacks
    //   as dependencies without re-subscribing on every state change.
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const channel = supabase
            .channel('doctor-dashboard-realtime')

            // ── initial_consultation: new patient checks in → refresh queue + charts
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'initial_consultation' },
                () => {
                    console.log('[RT] initial_consultation changed → refreshing queue + charts');
                    loadQueueAndFollowUps();
                    loadTrendData(trendFilterRef.current);
                    loadMorbidityData(morbFilterRef.current);
                    // bump visits today stat
                    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
                    supabase.from('consultation')
                        .select('initial_consultation!inner(consultation_date)')
                        .eq('initial_consultation.consultation_date', today)
                        .then(({ data }) => setVisitsToday(data?.length || 0));
                }
            )

            // ── consultation INSERT/UPDATE: patient was seen → remove from queue, bump visits
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'consultation' },
                () => {
                    console.log('[RT] consultation INSERT → refreshing queue + trend');
                    loadQueueAndFollowUps();
                    loadTrendData(trendFilterRef.current);
                    // bump visits today
                    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
                    supabase.from('consultation')
                        .select('initial_consultation!inner(consultation_date)')
                        .eq('initial_consultation.consultation_date', today)
                        .then(({ data }) => setVisitsToday(data?.length || 0));
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'consultation' },
                () => {
                    console.log('[RT] consultation UPDATE → refreshing trend');
                    loadTrendData(trendFilterRef.current);
                }
            )

            // ── patients INSERT: new patient registered → bump total count
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'patients' },
                () => {
                    console.log('[RT] patient added → bumping total count');
                    supabase.from('patients')
                        .select('*', { count: 'exact', head: true })
                        .then(({ count }) => setTotalPatients(count || 0));
                }
            )
            // ── patients UPDATE: name/info changed → refresh queue display names
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'patients' },
                () => {
                    console.log('[RT] patient updated → refreshing queue names');
                    loadQueueAndFollowUps();
                }
            )

            // ── follow_up: any change → refresh follow-ups list only (not charts)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'follow_up' },
                () => {
                    console.log('[RT] follow_up changed → refreshing follow-ups');
                    loadQueueAndFollowUps();
                }
            )

            .subscribe((status) => {
                console.log('[RT] dashboard channel:', status);
                if (status === 'SUBSCRIBED') setRealtimeStatus('live');
                else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('error');
                else setRealtimeStatus('connecting');
            });

        return () => { supabase.removeChannel(channel); };
    }, [loadQueueAndFollowUps, loadTrendData, loadMorbidityData]);
    // ^ stable useCallback refs — won't re-subscribe unless these actually change

    // ── Keep filter refs in sync + reload charts on filter change ───────────
    useEffect(() => {
        trendFilterRef.current = trendFilter;
        loadTrendData(trendFilter);
    }, [trendFilter, loadTrendData]);

    useEffect(() => {
        morbFilterRef.current = morbFilter;
        loadMorbidityData(morbFilter);
    }, [morbFilter, loadMorbidityData]);

    // ── Chart rendering ──────────────────────────────────────────────────────
    useEffect(() => {
        if (activePage !== 'dashboard') return;

        if (trendChartRef.current && trendData.length > 0) {
            if (trendChartInst.current) trendChartInst.current.destroy();
            trendChartInst.current = new Chart(trendChartRef.current, {
                type: 'line',
                data: {
                    labels: trendData.map(d => d.date),
                    datasets: [{
                        label: 'Visits', data: trendData.map(d => d.count),
                        borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)',
                        borderWidth: 2, fill: true, tension: 0.4,
                        pointBackgroundColor: '#3b82f6', pointRadius: 4, pointHoverRadius: 6,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                        y: { grid: { color: '#f1f5f9' }, ticks: { stepSize: 1, precision: 0, color: '#94a3b8', font: { size: 10 } }, beginAtZero: true }
                    }
                }
            });
        }

        if (morbChartRef.current && morbidityData.length > 0) {
            if (morbChartInst.current) morbChartInst.current.destroy();
            morbChartInst.current = new Chart(morbChartRef.current, {
                type: 'bar',
                data: {
                    labels: morbidityData.map(m => m.label),
                    datasets: [{ label: 'Cases', data: morbidityData.map(m => m.percentage), backgroundColor: '#93c5fd', borderRadius: 2, barThickness: 16 }]
                },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (ctx) => { const item = morbidityData[ctx.dataIndex]; return ` ${item.percentage}%  (${item.count} cases)`; } } }
                    },
                    scales: {
                        x: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v) => `${v}%` }, beginAtZero: true, max: 100 },
                        y: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } }
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
                    if (id !== 'consultation') { setSelectedPatientId(null); setSelectedIcid(null); }
                    setActivePage(id);
                }}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            <main className="flex-1 overflow-auto md:ml-[240px]">
                {/* Topbar */}
                <header className="h-[64px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm md:shadow-none">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors duration-300 ${!isOnline ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                            <span className="relative flex h-2.5 w-2.5">
                                {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${!isOnline ? 'bg-amber-500' : 'bg-green-500'}`} />
                            </span>
                            <span className={`text-[0.65rem] font-extrabold uppercase tracking-widest ${!isOnline ? 'text-amber-700' : 'text-green-700'}`}>
                                {!isOnline ? 'Offline Mode' : 'System Online'}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-slate-200 hidden sm:block" />
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
                            <div className="mb-2">
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Good day, {userName.split(' ')[0]}</h1>
                            </div>

                            {/* Stat Cards */}
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

                            {/* Queue + Trends */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                {/* ── Patient Queue ── */}
                                <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[380px] overflow-hidden">
                                    <div className="p-5 border-b border-slate-100 shrink-0 flex items-center justify-between">
                                        <h3 className="font-bold text-slate-800 text-[0.95rem]">Patient Queue</h3>
                                        <div className="flex items-center gap-2">
                                            {/* queue count badge */}
                                            {queue.length > 0 && (
                                                <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">{queue.length}</span>
                                            )}
                                            <LiveBadge status={realtimeStatus} />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        {queue.length === 0 ? (
                                            <p className="text-center text-slate-400 py-16 text-sm">No patients in queue</p>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {queue.map((q, index) => (
                                                    <div key={q.initialconsultation_id}
                                                        onClick={() => handleConsultNavigate(q.patient_id, q.initialconsultation_id.toString())}
                                                        className="cursor-pointer px-5 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-black text-slate-300 w-5 text-center">{index + 1}</span>
                                                            <div className="flex flex-col gap-0.5">
                                                                <p className="font-bold text-slate-800 text-[0.9rem] group-hover:text-blue-600 transition-colors">{q.patients?.lastName}, {q.patients?.firstName}</p>
                                                                <p className="text-xs text-slate-500 font-medium">{q.patients?.sex} • {q.patients?.bloodType || '—'}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs font-bold text-blue-600">{formatTime(q.consultation_time)}</p>
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

                                {/* Visit Trends */}
                                <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
                                    <div className="flex justify-between items-center mb-4 shrink-0">
                                        <h3 className="font-bold text-slate-800 text-[0.95rem]">Visit Trends</h3>
                                        <FilterTabs value={trendFilter} onChange={setTrendFilter} />
                                    </div>
                                    <div className="flex-1 relative w-full h-full">
                                        <canvas ref={trendChartRef} />
                                    </div>
                                </div>
                            </div>

                            {/* Morbidity + Follow-ups */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                {/* Morbidity */}
                                <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
                                    <div className="flex justify-between items-center mb-2 shrink-0">
                                        <h3 className="font-bold text-slate-800 text-[0.95rem]">Morbidity Analytics</h3>
                                        <FilterTabs value={morbFilter} onChange={setMorbFilter} />
                                    </div>
                                    <div className="flex-1 relative w-full h-full">
                                        <canvas ref={morbChartRef} />
                                    </div>
                                </div>

                                {/* ── Upcoming Follow-ups ── */}
                                <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[380px] overflow-hidden">
                                    <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                                        <h3 className="font-bold text-slate-800 text-[0.95rem]">Upcoming Follow-ups</h3>
                                        <LiveBadge status={realtimeStatus} />
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        {followUps.length === 0 ? (
                                            <p className="text-center text-slate-400 py-16 text-sm">No follow-ups scheduled</p>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {followUps.map(f => {
                                                    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
                                                    const isToday = f.visit_date === today;
                                                    return (
                                                        <div key={f.followup_id}
                                                            onClick={() => handleConsultNavigate(f.patient_id)}
                                                            className="cursor-pointer px-5 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                            <div className="flex flex-col gap-0.5">
                                                                <p className="font-bold text-slate-800 text-[0.9rem] truncate group-hover:text-blue-600 transition-colors">{f.patients?.lastName}, {f.patients?.firstName}</p>
                                                                <p className="text-[11px] text-slate-500 font-medium">Return Visit</p>
                                                            </div>
                                                            <p className={`text-[10px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap ml-2 shrink-0 ${isToday ? 'text-blue-600 bg-blue-50' : 'text-amber-600 bg-amber-50'}`}>
                                                                {isToday ? 'Today' : new Date(f.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {followUps.length > 0 && (
                                        <button onClick={loadAllFollowUps} className="p-4 text-xs font-bold text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors text-center shrink-0">
                                            View all follow-ups →
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {activePage === 'records' && (
                        <RecordsComponent onPatientClick={(p) => handleConsultNavigate(p.id)} />
                    )}
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

            {/* ─── All Follow-ups Modal ─── */}
            {showFollowUpsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowFollowUpsModal(false); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black text-slate-800">All Upcoming Follow-ups</h2>
                                    <LiveBadge status={realtimeStatus} />
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">{allFollowUps.length} pending • sorted by date</p>
                            </div>
                            <button onClick={() => setShowFollowUpsModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors font-bold text-base">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {allFollowUps.length === 0 ? (
                                <p className="text-center text-slate-400 py-16 text-sm">No upcoming follow-ups</p>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {allFollowUps.map((f, idx) => {
                                        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
                                        const isToday = f.visit_date === today;
                                        return (
                                            <div key={f.followup_id}
                                                onClick={() => { setShowFollowUpsModal(false); handleConsultNavigate(f.patient_id); }}
                                                className="cursor-pointer px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-slate-300 w-5 text-center">{idx + 1}</span>
                                                    <div className="flex flex-col gap-0.5">
                                                        <p className="font-bold text-slate-800 text-[0.9rem] group-hover:text-blue-600 transition-colors">{f.patients?.lastName}, {f.patients?.firstName}</p>
                                                        <p className="text-[11px] text-slate-400 font-medium">{f.patients?.sex} • Return Visit</p>
                                                    </div>
                                                </div>
                                                <p className={`text-[10px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 ml-3 ${isToday ? 'text-blue-600 bg-blue-50' : 'text-amber-600 bg-amber-50'}`}>
                                                    {isToday ? 'Today' : new Date(f.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 shrink-0">
                            <button onClick={() => setShowFollowUpsModal(false)}
                                className="w-full py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<DoctorDashboard />);