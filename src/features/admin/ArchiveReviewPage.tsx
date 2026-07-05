import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useToast } from '../../components/feedback/Toast';
import { Icon } from '../../components/shared/Icon';
import { LoadingState } from '../../components/shared/LoadingState';
import { healthcareErrorMessage, logError } from '../../lib/utils/errors';
import { safeTrim } from '../../lib/utils/strings';
import { logAuditEvent } from '../audit/services';

type ArchiveFilter = 'candidates' | 'active' | 'archived' | 'protected';
type ArchiveAction = 'archive' | 'restore';

interface ArchivePatient {
    id: number;
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
    age: number | null;
    sex: string | null;
    address: string | null;
    contactNumber: number | null;
    created_at: string | null;
    archive_status: 'active' | 'archived';
    archived_at: string | null;
    archived_by: string | null;
    archive_reason: string | null;
    archive_reviewed_at: string | null;
    archive_reviewed_by: string | null;
    archive_protected: boolean;
    archive_protection_reason: string | null;
    last_activity_at: string | null;
}

const ARCHIVE_PATIENT_COLUMNS = 'id, firstName, middleName, lastName, age, sex, address, contactNumber, created_at, archive_status, archived_at, archived_by, archive_reason, archive_reviewed_at, archive_reviewed_by, archive_protected, archive_protection_reason, last_activity_at';
const ACTIVE_PATIENT_COLUMNS = 'id, firstName, middleName, lastName, suffix, age, sex, bloodType, address, contactNumber, birthday, civilStatus, nationality, religion, educationalAttain, employmentStatus, philhealthNo, philhealthStatus, category, categoryOthers, relativeName, relativeRelation, relativeAddress, created_at, archive_status, archive_protected';
const ARCHIVE_REVIEW_LIMIT = 200;

function formatDate(value?: string | null) {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function patientName(patient: ArchivePatient) {
    return safeTrim(`${patient.lastName || ''}, ${patient.firstName || ''} ${patient.middleName || ''}`) || `Patient #${patient.id}`;
}

function archiveCutoffIso() {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 5);
    return cutoff.toISOString();
}

function ArchiveStatusBadge({ patient }: { patient: ArchivePatient }) {
    if (patient.archive_protected) return <span className="clinical-status-badge">Protected</span>;
    if (patient.archive_status === 'archived') return <span className="clinical-status-badge">Archived</span>;
    return <span className="clinical-status-badge success">Active</span>;
}

export function ArchiveReviewPage({ isOnline, readOnly = false }: { isOnline: boolean; readOnly?: boolean }) {
    const { showToast, ToastComponent } = useToast();
    const [patients, setPatients] = useState<ArchivePatient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [filter, setFilter] = useState<ArchiveFilter>('candidates');
    const [search, setSearch] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<ArchivePatient | null>(null);
    const [action, setAction] = useState<ArchiveAction | null>(null);
    const [reason, setReason] = useState('');

    const loadArchivePatients = async () => {
        setIsLoading(true);
        try {
            const selectColumns = filter === 'active' ? ACTIVE_PATIENT_COLUMNS : ARCHIVE_PATIENT_COLUMNS;
            // @ts-ignore
            let query: any = supabase
                .from('patients')
                .select(selectColumns);

            if (filter === 'active') {
                query = query
                    .or('archive_status.eq.active,archive_status.is.null')
                    .order('lastName', { ascending: true });
            } else if (filter === 'candidates') {
                query = query
                    .or('archive_status.eq.active,archive_status.is.null')
                    .or('archive_protected.eq.false,archive_protected.is.null')
                    .lte('last_activity_at', archiveCutoffIso())
                    .order('last_activity_at', { ascending: true, nullsFirst: true });
            } else if (filter === 'protected') {
                query = query
                    .eq('archive_protected', true)
                    .or('archive_status.eq.active,archive_status.is.null')
                    .order('lastName', { ascending: true });
            } else if (filter === 'archived') {
                query = query
                    .eq('archive_status', 'archived')
                    .order('lastName', { ascending: true });
            }

            const finalQuery = query.limit(ARCHIVE_REVIEW_LIMIT);
            const { data, error } = await finalQuery;

            if (error) throw error;

            let nextPatients = ((data || []) as ArchivePatient[]);

            if (filter === 'candidates' && nextPatients.length > 0) {
                const ids = nextPatients.map(patient => patient.id);
                const [{ data: pendingFollowUps, error: followUpError }, { data: pendingLabRequests, error: labError }] = await Promise.all([
                    supabase.from('follow_up').select('patient_id').in('patient_id', ids).or('follow_up_status.is.null,follow_up_status.neq.done'),
                    supabase.from('lab_request').select('patient_id').in('patient_id', ids).or('status.is.null,status.neq.Completed'),
                ]);
                if (followUpError) throw followUpError;
                if (labError) throw labError;

                const blockedIds = new Set<number>([
                    ...((pendingFollowUps || []).map(row => Number(row.patient_id)).filter(Boolean)),
                    ...((pendingLabRequests || []).map(row => Number(row.patient_id)).filter(Boolean)),
                ]);
                nextPatients = nextPatients.filter(patient => !blockedIds.has(patient.id));
            }

            setPatients(nextPatients);
        } catch (error) {
            logError('Failed to load archive review patients', error);
            showToast(healthcareErrorMessage('load archive review records'), true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        console.log('[DEBUG Admin Archive] useEffect triggered, filter:', filter);
        void loadArchivePatients();
    }, [filter]);

    const visiblePatients = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return patients;
        return patients.filter(patient => `${patient.firstName || ''} ${patient.middleName || ''} ${patient.lastName || ''} ${patient.address || ''} ${patient.id}`.toLowerCase().includes(query));
    }, [patients, search]);

    const openAction = (patient: ArchivePatient, nextAction: ArchiveAction) => {
        setSelectedPatient(patient);
        setAction(nextAction);
        setReason('');
    };

    const closeAction = () => {
        setSelectedPatient(null);
        setAction(null);
        setReason('');
    };

    const submitArchiveAction = async () => {
        if (!selectedPatient || !action) return;
        const cleanReason = safeTrim(reason);
        if (!cleanReason) {
            showToast(action === 'archive' ? 'Please enter an archive reason.' : 'Please enter a restore reason.', true);
            return;
        }
        if (!isOnline) {
            showToast('You are offline. Archive changes cannot be saved until the connection is restored.', true);
            return;
        }

        setIsSaving(true);
        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            const accessToken = sessionData.session?.access_token;
            if (!accessToken) throw new Error('No active session for archive request.');

            const { data, error } = await supabase.functions.invoke('archive-patient-record', {
                body: {
                    patient_id: selectedPatient.id,
                    action,
                    reason: cleanReason,
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (error || !data?.ok) {
                throw error || new Error('Archive request was not confirmed.');
            }

            const eventType = data.event_type === 'restored' ? 'restored' : 'archived';

            void logAuditEvent({
                action: eventType,
                module: 'Patient Archive',
                recordId: selectedPatient.id,
                recordType: 'patient',
                description: action === 'archive' ? 'Archived inactive patient record.' : 'Restored archived patient record.',
                metadata: { patient_id: selectedPatient.id, action_scope: 'patient_archive', status: eventType },
            });

            showToast(action === 'archive' ? 'Patient record archived.' : 'Patient record restored.');
            closeAction();
            await loadArchivePatients();
        } catch (error) {
            logError(`Failed to ${action} patient record`, error);
            showToast(healthcareErrorMessage(action === 'archive' ? 'archive the patient record' : 'restore the patient record'), true);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="pwa-page-pad flex flex-col pwa-panel-gap">
            <ToastComponent />
            <div className="ops-summary-grid">
                {[
                    ['Visible Records', visiblePatients.length, 'Current filter result'],
                    ['Review Policy', '5 years', 'No automatic archiving'],
                    ['Archive Mode', filter === 'candidates' ? 'Candidates' : filter[0].toUpperCase() + filter.slice(1), 'Soft archive only'],
                ].map(([label, value, note]) => (
                    <div key={label} className="ops-summary-card">
                        <div className="ops-summary-label">{label}</div>
                        <div className="ops-summary-value tabular-nums">{value}</div>
                        <div className="ops-summary-note">{note}</div>
                    </div>
                ))}
            </div>

            <section className="clinical-table-panel">
                <div className="clinical-table-titlebar">
                    <div>
                        <h2 className="clinical-table-title">Patient Archive Review</h2>
                        <p className="clinical-table-subtitle">
                            {readOnly
                                ? 'Read-only view. Archive and restore actions are restricted to the Administrator role.'
                                : 'Soft archive only. Patient records and relationships remain in place.'}
                        </p>
                    </div>
                    <span className="clinical-count-badge">{visiblePatients.length} result{visiblePatients.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="clinical-toolbar">
                    <div className="clinical-search">
                        <Icon name="search" className="h-4 w-4 text-[#5F82A3]" />
                        <input
                            type="text"
                            aria-label="Search archive review patients"
                            placeholder="Search by patient name, address, or record number..."
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                        />
                    </div>
                    <div className="clinical-filter-group">
                        {([
                            ['candidates', 'Candidates'],
                            ['active', 'Active'],
                            ['archived', 'Archived'],
                            ['protected', 'Protected'],
                        ] as Array<[ArchiveFilter, string]>).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setFilter(value)}
                                className={`clinical-filter-button ${filter === value ? 'is-active' : ''}`}
                                aria-pressed={filter === value}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="clinical-table-scroll">
                    <table className="clinical-table min-w-[920px]">
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Age / Sex</th>
                                <th>Last Activity</th>
                                <th>Status</th>
                                <th>Archive Notes</th>
                                <th className="text-right">{readOnly ? 'Status' : 'Action'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6}><LoadingState label="Loading archive review records..." /></td></tr>
                            ) : visiblePatients.length === 0 ? (
                                <tr><td colSpan={6}><div className="clinical-table-state">No patient records match this archive filter.</div></td></tr>
                            ) : visiblePatients.map(patient => (
                                <tr key={patient.id}>
                                    <td>
                                        <div className="clinical-primary">{patientName(patient)}</div>
                                        <div className="clinical-secondary">Patient record no. {patient.id} | {patient.address || 'No address recorded'}</div>
                                    </td>
                                    <td>{patient.age ?? '-'} / {patient.sex || '-'}</td>
                                    <td>{formatDate(patient.last_activity_at || patient.created_at)}</td>
                                    <td><ArchiveStatusBadge patient={patient} /></td>
                                    <td>
                                        <div className="max-w-[260px] text-sm text-slate-600">
                                            {patient.archive_protected
                                                ? patient.archive_protection_reason || 'Protected from archive review.'
                                                : patient.archive_reason || 'No archive note recorded.'}
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        {readOnly ? (
                                            <span className="clinical-secondary">
                                                {patient.archive_status === 'archived' ? 'Archived' : patient.archive_protected ? 'Protected' : 'Active'}
                                            </span>
                                        ) : patient.archive_status === 'archived' ? (
                                            <button type="button" className="clinical-row-action" onClick={() => openAction(patient, 'restore')}>Restore</button>
                                        ) : patient.archive_protected ? (
                                            <span className="clinical-secondary">Protected</span>
                                        ) : (
                                            <button type="button" className="clinical-row-action danger" onClick={() => openAction(patient, 'archive')}>Archive</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {!readOnly && selectedPatient && action && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget && !isSaving) closeAction(); }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="archive-action-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-5">
                            <h3 id="archive-action-title" className="text-lg font-semibold text-slate-900">{action === 'archive' ? 'Archive Patient Record' : 'Restore Patient Record'}</h3>
                            <p className="mt-1 text-sm text-slate-500">{patientName(selectedPatient)} | Patient record no. {selectedPatient.id}</p>
                        </div>
                        <div className="space-y-4 p-5">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                This is a soft archive action. Patient records, encounters, laboratory records, prescriptions, and FHSIS entries remain linked to this patient.
                            </div>
                            <label className="block">
                                <span className="clinical-field-label">{action === 'archive' ? 'Archive Reason' : 'Restore Reason'} *</span>
                                <textarea
                                    value={reason}
                                    onChange={event => setReason(event.target.value)}
                                    className="mt-1 min-h-[110px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                                    placeholder={action === 'archive' ? 'Explain why this inactive patient record should be archived.' : 'Explain why this patient record should be restored to active records.'}
                                />
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
                            <button type="button" onClick={closeAction} disabled={isSaving} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                            <button type="button" onClick={submitArchiveAction} disabled={isSaving} className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${action === 'archive' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-800'}`}>
                                {isSaving ? 'Saving...' : action === 'archive' ? 'Archive Record' : 'Restore Record'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
