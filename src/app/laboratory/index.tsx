import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../../lib/supabase/client';
import { Sidebar } from '../../components/layout/Sidebar';
import { useToast } from '../../components/feedback/Toast';
import { requireRole } from '../../lib/auth/roles';
import { getInitials } from '../../lib/utils/names';
import { getErrorMessage } from '../../lib/utils/errors';
import { upsertCompletedLabResult } from '../../features/laboratory/services';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { NetworkBadge } from '../../components/shared/NetworkBadge';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';


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
    isOnline,
}: {
    request: LabRequest;
    onClose: () => void;
    onStatusUpdate: (id: number, status: string) => void;
    currentUserName: string;
    isOnline: boolean;
}) {
    const [results, setResults] = useState('');
    const [datePerformed, setDatePerformed] = useState(formatDateTimeLocal());
    const [saving, setSaving] = useState(false);
    const [loadingLabResult, setLoadingLabResult] = useState(false);
    const { showToast, ToastComponent } = useToast();

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
        } catch (err) {
            console.error('Failed to load lab result:', getErrorMessage(err));
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
        if (!isOnline) {
            showToast('You are offline. Lab results cannot be submitted until the connection is restored.', true);
            return;
        }

        if (!results.trim()) {
            showToast('Please enter lab results before marking as completed.', true);
            return;
        }
        if (!datePerformed) {
            showToast('Please select the date performed.', true);
            return;
        }

        setSaving(true);
        try {
            const performedBy =
                currentUserName && currentUserName !== 'Loading...'
                    ? currentUserName
                    : 'Unknown User';

            await upsertCompletedLabResult({
                labrequest_id: request.labrequest_id,
                patient_id: request.patient_id,
                consultation_id: request.consultation_id,
                findings: results,
                performed_by: performedBy,
                date_performed: datePerformed,
                status: 'Completed',
            });

            onStatusUpdate(request.labrequest_id, 'Completed');
            showToast('Lab results submitted successfully!', false);
        } catch (err) {
            showToast('Failed to submit results: ' + getErrorMessage(err), true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <ToastComponent />
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
    const isOnline = useOnlineStatus();
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('?');

    const [requests, setRequests] = useState<LabRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed'>('All');
    const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
    const { showToast, ToastComponent } = useToast();

    const navItems = [
        { id: 'lab', label: 'Dashboard', icon: '🧪' },
    ];

    useEffect(() => {
        const fetchData = async () => {
            const profile = await requireRole('labaratory');
            const name = profile.fullName || 'Lab User';
            setUserName(name);
            setUserInitials(getInitials(name));

            await loadRequests(true);
        };

        fetchData();

        const channel = supabase
            .channel('lab-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lab_request' }, () => loadRequests(false))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lab_request' }, () => loadRequests(false))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_result' }, () => loadRequests(false))
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Background Refresh Interval (1.5s)
    useEffect(() => {
        const interval = setInterval(() => {
            if (isOnline) {
                loadRequests(false);
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [isOnline]);

    const loadRequests = async (showSpinner = false) => {
        if (showSpinner) setLoading(true);
        try {
            const { data: labData, error } = await supabase
                .from('lab_request')
                .select('*')
                .order('labrequest_id', { ascending: false });

            if (error) throw error;

            if (labData && labData.length > 0) {
                const typedLabData = labData as LabRequest[];
                const patientIds = [...new Set(
                    typedLabData.map(r => r.patient_id).filter((id): id is number => id !== null && id !== undefined)
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

                const labrequestIds = typedLabData.map(r => r.labrequest_id);
                const { data: labResultData } = await supabase
                    .from('lab_result')
                    .select('labrequest_id, status')
                    .in('labrequest_id', labrequestIds);

                const completedSet = new Set<number>(
                    ((labResultData || []) as { labrequest_id: number; status: string | null }[])
                        .filter(lr => lr.status === 'Completed')
                        .map(lr => lr.labrequest_id)
                );

                const enriched: LabRequest[] = typedLabData.map(r => {
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
        } catch (err) {
            console.error('Failed to load lab requests:', getErrorMessage(err));
            showToast('Error loading lab requests: ' + getErrorMessage(err), true);
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
            <ToastComponent />
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
                        <NetworkBadge isOnline={isOnline} />
                        
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
                                                    <LoadingState label="Loading requests..." />
                                                </td>
                                            </tr>
                                        ) : filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center">
                                                    <EmptyState title="No lab requests found" description="New lab requests from doctors will appear here." />
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
                    isOnline={isOnline}
                />
            )}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<LaboratoryDashboard />);
}
