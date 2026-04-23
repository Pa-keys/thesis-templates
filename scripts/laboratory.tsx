import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { Sidebar } from './sidebar';

interface LabRequest {
    labrequest_id: number;
    consultation_id: number | null;
    patient_id: number | null;
    request_date: string | null;
    lab_no: string | null;
    chief_complaint: string | null;
    is_cbc: boolean;
    is_cbc_platelet: boolean;
    is_hgb_hct: boolean;
    is_xray: boolean;
    is_ultrasound: boolean;
    is_rbs: boolean;
    is_fbs: boolean;
    is_uric_acid: boolean;
    is_cholesterol: boolean;
    is_urinalysis: boolean;
    is_fecalysis: boolean;
    is_sputum: boolean;
    others: string | null;
    requested_by: string | null;
    status: string | null;
    patient_firstName?: string;
    patient_lastName?: string;
    patient_age?: number | null;
    patient_sex?: string;
}

interface PatientRow {
    id: number;
    firstName: string;
    lastName: string;
    age: number | null;
    sex: string;
}

function formatDateTimeLocal(value?: string | null) {
    const date = value ? new Date(value) : new Date();
    if (isNaN(date.getTime())) {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function LabRequestDetail({
    request,
    onClose,
    onStatusUpdate,
    currentUserName,
}: {
    request: LabRequest;
    onClose: () => void;
    onStatusUpdate: (id: number, status: string) => void;
    currentUserName: string;
}) {
    const [results, setResults] = useState('');
    const [datePerformed, setDatePerformed] = useState(formatDateTimeLocal());
    const [saving, setSaving] = useState(false);
    const [loadingLabResult, setLoadingLabResult] = useState(false);

    useEffect(() => {
        setResults('');
        setDatePerformed(formatDateTimeLocal());
        loadExistingLabResult();
    }, [request.labrequest_id]);

    const loadExistingLabResult = async () => {
        setLoadingLabResult(true);
        try {
            const { data, error } = await supabase
                .from('lab_result')
                .select('labresult_id, labrequest_id, patient_id, date_performed, findings, performed_by')
                .eq('labrequest_id', request.labrequest_id)
                .order('labresult_id', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setResults(data.findings ?? '');
                setDatePerformed(formatDateTimeLocal(data.date_performed));
            }
        } catch (err: any) {
            console.error('Failed to load lab result:', err.message);
        } finally {
            setLoadingLabResult(false);
        }
    };

    const patientName = request.patient_firstName
        ? `${request.patient_firstName} ${request.patient_lastName}`
        : '—';

    const formatDate = (str?: string | null) => {
        if (!str) return '—';
        const d = new Date(str);
        return isNaN(d.getTime())
            ? str
            : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const statusColor = (s: string | null) => {
        if (s === 'Completed') return 'bg-green-100 text-green-700 border-green-200';
        return 'bg-amber-100 text-amber-700 border-amber-200';
    };

    const tests: { label: string; value: boolean }[] = [
        { label: 'Complete Blood Count (CBC)', value: request.is_cbc },
        { label: 'CBC with Platelet Count', value: request.is_cbc_platelet },
        { label: 'Hemoglobin and Hematocrit', value: request.is_hgb_hct },
        { label: 'Chest X-Ray (PA View)', value: request.is_xray },
        { label: 'Ultrasound', value: request.is_ultrasound },
        { label: 'Urinalysis', value: request.is_urinalysis },
        { label: 'Fecalysis', value: request.is_fecalysis },
        { label: 'Sputum', value: request.is_sputum },
        { label: 'Random Blood Sugar (RBS)', value: request.is_rbs },
        { label: 'Fasting Blood Sugar (FBS)', value: request.is_fbs },
        { label: 'Uric Acid', value: request.is_uric_acid },
        { label: 'Cholesterol', value: request.is_cholesterol },
    ];
    const activeTests = tests.filter(t => t.value);

    const handleMarkCompleted = async () => {
        if (!results.trim()) {
            alert('Please enter lab results before marking as completed.');
            return;
        }
        if (!datePerformed) {
            alert('Please select the date performed.');
            return;
        }

        setSaving(true);
        try {
            const performedBy =
                currentUserName && currentUserName !== 'Loading...'
                    ? currentUserName
                    : 'Unknown User';

            const { data: existingLabResult, error: existingError } = await supabase
                .from('lab_result')
                .select('labresult_id')
                .eq('labrequest_id', request.labrequest_id)
                .order('labresult_id', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existingError) throw existingError;

            if (existingLabResult) {
                const { error: updateLabResultError } = await supabase
                    .from('lab_result')
                    .update({
                        findings: results,
                        performed_by: performedBy,
                        date_performed: datePerformed,
                        patient_id: request.patient_id,
                        consultation_id: request.consultation_id, // Added this linking field
                        status: 'Completed',
                    })
                    .eq('labresult_id', existingLabResult.labresult_id);

                if (updateLabResultError) throw updateLabResultError;
            } else {
                const { error: insertLabResultError } = await supabase
                    .from('lab_result')
                    .insert({
                        labrequest_id: request.labrequest_id,
                        patient_id: request.patient_id,
                        consultation_id: request.consultation_id, // Added this linking field
                        findings: results,
                        performed_by: performedBy,
                        date_performed: datePerformed,
                        status: 'Completed',
                    });

                if (insertLabResultError) throw insertLabResultError;
            }

            const { error: updateRequestError } = await supabase
                .from('lab_request')
                .update({ status: 'Completed' })
                .eq('labrequest_id', request.labrequest_id);

            if (updateRequestError) throw updateRequestError;

            onStatusUpdate(request.labrequest_id, 'Completed');
            alert('Lab results submitted successfully!');
        } catch (err: any) {
            alert('Failed to submit results: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                    <div>
                        <div className="font-bold text-slate-900 text-base">Lab Request #{request.labrequest_id}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{patientName} · {formatDate(request.request_date)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusColor(request.status)}`}>
                            {request.status || 'Pending'}
                        </span>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 font-bold text-lg transition-colors">✕</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow">
                            {request.patient_firstName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">{patientName}</div>
                            <div className="text-xs text-slate-500 mt-0.5 flex gap-3 flex-wrap">
                                {request.patient_age != null && <span>{request.patient_age} yrs old</span>}
                                {request.patient_sex && <span>{request.patient_sex}</span>}
                                {request.requested_by && <span>Req. by: <span className="font-semibold text-slate-700">{request.requested_by}</span></span>}
                            </div>
                        </div>
                    </div>

                    {request.chief_complaint && (
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Chief Complaint</div>
                            <div className="text-sm text-slate-700 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">{request.chief_complaint}</div>
                        </div>
                    )}

                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Requested Tests</div>
                        {activeTests.length === 0 && !request.others ? (
                            <p className="text-sm text-slate-400 italic">No tests specified.</p>
                        ) : (
                            <div className="space-y-2">
                                {(() => {
                                    const routine = activeTests.filter(t =>
                                        ['Complete Blood Count (CBC)', 'CBC with Platelet Count', 'Hemoglobin and Hematocrit', 'Chest X-Ray (PA View)', 'Ultrasound', 'Urinalysis', 'Fecalysis', 'Sputum'].includes(t.label)
                                    );
                                    const fasting = activeTests.filter(t =>
                                        ['Random Blood Sugar (RBS)', 'Fasting Blood Sugar (FBS)', 'Uric Acid', 'Cholesterol'].includes(t.label)
                                    );
                                    return (
                                        <>
                                            {routine.length > 0 && (
                                                <div className="bg-white border border-slate-200 rounded-xl p-4">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Routine Tests</div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {routine.map(t => (
                                                            <div key={t.label} className="flex items-center gap-2.5">
                                                                <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center shrink-0">
                                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                                <span className="text-sm text-slate-700">{t.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {fasting.length > 0 && (
                                                <div className="bg-white border border-slate-200 rounded-xl p-4">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fasting Tests <span className="font-normal normal-case">(8–10 hrs)</span></div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {fasting.map(t => (
                                                            <div key={t.label} className="flex items-center gap-2.5">
                                                                <div className="w-4 h-4 rounded bg-orange-500 flex items-center justify-center shrink-0">
                                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                                <span className="text-sm text-slate-700">{t.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {request.others && (
                                                <div className="bg-white border border-slate-200 rounded-xl p-4">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Others</div>
                                                    <div className="text-sm text-slate-700">{request.others}</div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Performed By</label>
                            <input
                                type="text"
                                value={currentUserName}
                                disabled
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date Performed</label>
                            <input
                                type="datetime-local"
                                value={datePerformed}
                                onChange={e => setDatePerformed(e.target.value)}
                                disabled={request.status === 'Completed'}
                                className="w-full bg-white border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                            Lab Results / Findings
                            {request.status === 'Completed' && <span className="ml-2 text-green-600 normal-case font-semibold">✓ Submitted</span>}
                            {loadingLabResult && <span className="ml-2 text-blue-600 normal-case font-semibold">Loading saved result...</span>}
                        </label>
                        <textarea
                            rows={6}
                            value={results}
                            onChange={e => setResults(e.target.value)}
                            disabled={request.status === 'Completed'}
                            className="w-full bg-white border border-slate-200 rounded-lg p-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm text-slate-800 resize-y disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                            placeholder="Enter lab results, findings, or notes here..."
                        />
                    </div>
                </div>

                {request.status !== 'Completed' && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
                        <button
                            onClick={handleMarkCompleted}
                            disabled={saving}
                            className="w-full font-semibold py-2.5 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 text-sm"
                        >
                            {saving ? 'Submitting...' : '✓ Submit Results'}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

const LaboratoryDashboard = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('?');

    const [requests, setRequests] = useState<LabRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed'>('All');
    const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);

    const navItems = [
        { id: 'lab', label: 'Dashboard', icon: '🧪' },
    ];

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const fetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                window.location.href = '/pages/login.html';
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', session.user.id)
                .single();

            const name = profile?.full_name || session.user.email || 'Lab User';
            setUserName(name);
            setUserInitials(
                name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            );

            await loadRequests(true);
        };

        fetchData();

        const channel = supabase
            .channel('lab-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lab_request' }, () => loadRequests(false))
            .subscribe();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            supabase.removeChannel(channel);
        };
    }, []);

    const loadRequests = async (showSpinner = false) => {
        if (showSpinner) setLoading(true);
        try {
            const { data: labData, error } = await supabase
                .from('lab_request')
                .select('*')
                .order('labrequest_id', { ascending: false });

            if (error) throw error;

            if (labData && labData.length > 0) {
                const patientIds = [...new Set(
                    labData.map((r: any) => r.patient_id).filter((id: any) => id !== null && id !== undefined)
                )];

                let patientMap: Record<number, PatientRow> = {};

                if (patientIds.length > 0) {
                    const { data: patientData, error: patientError } = await supabase
                        .from('patients')
                        .select('id, firstName, lastName, age, sex')
                        .in('id', patientIds);

                    if (patientError) console.error('Failed to fetch patients:', patientError.message);

                    (patientData || []).forEach((p: PatientRow) => {
                        patientMap[p.id] = p;
                    });
                }

                const labrequestIds = labData.map((r: any) => r.labrequest_id);
                const { data: labResultData } = await supabase
                    .from('lab_result')
                    .select('labrequest_id, status')
                    .in('labrequest_id', labrequestIds);

                const completedSet = new Set<number>(
                    (labResultData || [])
                        .filter((lr: any) => lr.status === 'Completed')
                        .map((lr: any) => lr.labrequest_id)
                );

                const enriched: LabRequest[] = labData.map((r: any) => {
                    const p = r.patient_id != null ? patientMap[r.patient_id] : null;

                    const resolvedStatus = completedSet.has(r.labrequest_id)
                        ? 'Completed'
                        : (r.status ?? null);

                    return {
                        ...r,
                        status: resolvedStatus,
                        patient_firstName: p?.firstName ?? undefined,
                        patient_lastName: p?.lastName ?? undefined,
                        patient_age: p?.age ?? null,
                        patient_sex: p?.sex ?? undefined,
                    };
                });

                setRequests(enriched);
            } else {
                setRequests([]);
            }
        } catch (err: any) {
            console.error('Failed to load lab requests:', err.message);
            alert('Error loading lab requests: ' + err.message);
        } finally {
            if (showSpinner) setLoading(false);
        }
    };

    const handleStatusUpdate = (id: number, status: string) => {
        setRequests(prev => prev.map(r =>
            r.labrequest_id === id ? { ...r, status } : r
        ));
        if (selectedRequest?.labrequest_id === id) {
            setSelectedRequest(prev => prev ? { ...prev, status } : prev);
        }
    };

    const formatDate = (str?: string | null) => {
        if (!str) return '—';
        const d = new Date(str);
        return isNaN(d.getTime())
            ? str
            : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const statusBadge = (s: string | null) => {
        if (s === 'Completed') return 'bg-green-100 text-green-700';
        return 'bg-amber-100 text-amber-700';
    };

    const countTests = (r: LabRequest) =>
        [r.is_cbc, r.is_cbc_platelet, r.is_hgb_hct, r.is_xray, r.is_ultrasound, r.is_urinalysis, r.is_fecalysis, r.is_sputum, r.is_rbs, r.is_fbs, r.is_uric_acid, r.is_cholesterol]
            .filter(Boolean).length + (r.others ? 1 : 0);

    const filtered = requests.filter(r => {
        const name = `${r.patient_firstName ?? ''} ${r.patient_lastName ?? ''}`.toLowerCase();
        const matchSearch =
            name.includes(searchQuery.toLowerCase()) ||
            (r.lab_no ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.chief_complaint ?? '').toLowerCase().includes(searchQuery.toLowerCase());
        const effectiveStatus = r.status || 'Pending';
        const matchStatus = statusFilter === 'All' || effectiveStatus === statusFilter;
        return matchSearch && matchStatus;
    });

    const stats = {
        total: requests.length,
        pending: requests.filter(r => !r.status || r.status === 'Pending').length,
        completed: requests.filter(r => r.status === 'Completed').length,
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden w-full">
            <Sidebar
                activePage="lab"
                userName={userName}
                userInitials={userInitials}
                userRole="Laboratory"
                navItems={navItems}
                onNavigate={(id) => {
                    if (id === 'dashboard') window.location.href = '/pages/laboratory.html';
                }}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-[240px] w-full">
                <header className="h-[60px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 p-2 -ml-2 rounded-lg hover:bg-slate-50">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="font-bold text-lg text-slate-800">Laboratory Dashboard</div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 border rounded-full ${isOnline ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                            {isOnline
                                ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                : <span className="w-2 h-2 rounded-full bg-amber-500" />}
                            <span className={`text-[0.7rem] font-extrabold uppercase tracking-wider ${isOnline ? 'text-green-700' : 'text-amber-700'}`}>
                                {isOnline ? 'System Online' : 'System Offline'}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{userName}</div>
                            <div className="text-[0.7rem] text-slate-500 font-medium">Laboratory Staff</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                            {userInitials}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-x-hidden overflow-y-auto w-full bg-[#F8FAFC]">
                    <div className="p-4 md:p-6 lg:p-8 mx-auto w-full max-w-7xl">
                        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-extrabold text-slate-800">Lab Requests 🧪</h1>
                                <p className="text-sm text-slate-500 mt-1">Process and submit results. Updates automatically.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {[
                                { label: 'Total Requests', value: stats.total, icon: '📋', color: 'bg-blue-50 text-blue-600' },
                                { label: 'Pending', value: stats.pending, icon: '⏳', color: 'bg-amber-50 text-amber-600' },
                                { label: 'Completed', value: stats.completed, icon: '✅', color: 'bg-green-50 text-green-600' },
                            ].map(stat => (
                                <div key={stat.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center text-xl shrink-0`}>
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-500">{stat.label}</div>
                                        <div className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
                            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">All Lab Requests</h2>
                                    <p className="text-xs text-slate-500">Click a row to view details and submit results</p>
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                    {(['All', 'Pending',  'Completed'] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setStatusFilter(s)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="relative max-w-md">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                                    <input
                                        type="text"
                                        placeholder="Search by patient name, lab no, complaint..."
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Patient</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Tests</th>
                                            <th className="px-6 py-4">Chief Complaint</th>
                                            <th className="px-6 py-4">Requested By</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                        </svg>
                                                        <span className="text-sm text-slate-400">Loading requests...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="text-3xl">📭</span>
                                                        <span className="text-sm text-slate-400">No lab requests found.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map(r => {
                                                const name = r.patient_firstName
                                                    ? `${r.patient_firstName} ${r.patient_lastName}`
                                                    : `Patient #${r.patient_id ?? '—'}`;
                                                const testCount = countTests(r);
                                                return (
                                                    <tr
                                                        key={r.labrequest_id}
                                                        onClick={() => setSelectedRequest(r)}
                                                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                                    >
                                                        <td className="px-6 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                                                    {r.patient_firstName?.[0]?.toUpperCase() ?? '?'}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-slate-800">{name}</div>
                                                                    {r.patient_sex && (
                                                                        <div className="text-xs text-slate-400">
                                                                            {r.patient_sex}{r.patient_age != null ? ` · ${r.patient_age} y/o` : ''}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 text-slate-600">{formatDate(r.request_date)}</td>
                                                        <td className="px-6 py-3">
                                                            <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-full">
                                                                {testCount} test{testCount !== 1 ? 's' : ''}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-slate-600 max-w-[180px] truncate">{r.chief_complaint || '—'}</td>
                                                        <td className="px-6 py-3 text-slate-600">{r.requested_by || '—'}</td>
                                                        <td className="px-6 py-3">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(r.status)}`}>
                                                                {r.status || 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-center">
                                                            <span className="text-blue-600 font-bold group-hover:translate-x-1 inline-block transition-transform">→</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {selectedRequest && (
                <LabRequestDetail
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onStatusUpdate={handleStatusUpdate}
                    currentUserName={userName}
                />
            )}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<LaboratoryDashboard />);
}