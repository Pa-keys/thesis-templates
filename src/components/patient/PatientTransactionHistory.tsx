import type { PatientHistoryWarning, PatientTransaction } from '../../features/patients/history';
import { EmptyState } from '../shared/EmptyState';
import { LoadingState } from '../shared/LoadingState';
import { StatusBadge } from '../shared/StatusBadge';

interface PatientTransactionHistoryProps {
    transactions: PatientTransaction[];
    isLoading: boolean;
    warnings?: PatientHistoryWarning[];
    error?: string | null;
    onRetry?: () => void;
}

const TYPE_LABEL: Record<PatientTransaction['type'], string> = {
    registration: 'Registration',
    consent: 'Consent',
    initial_consultation: 'Nurse',
    doctor_consultation: 'Doctor',
    lab_request: 'Lab Request',
    lab_result: 'Lab Result',
    prescription: 'Prescription',
    pharmacy: 'Pharmacy',
    vaccine: 'Vaccine',
    follow_up: 'Follow-up',
};

const TYPE_MARK: Record<PatientTransaction['type'], string> = {
    registration: 'REG',
    consent: 'CON',
    initial_consultation: 'NUR',
    doctor_consultation: 'DOC',
    lab_request: 'LAB',
    lab_result: 'RES',
    prescription: 'RX',
    pharmacy: 'PHR',
    vaccine: 'VAC',
    follow_up: 'FUP',
};

const TYPE_MARK_CLASS: Record<PatientTransaction['type'], string> = {
    registration: 'bg-blue-50 text-blue-700 ring-blue-200',
    consent: 'bg-amber-50 text-amber-800 ring-amber-200',
    initial_consultation: 'bg-cyan-50 text-cyan-800 ring-cyan-200',
    doctor_consultation: 'bg-blue-50 text-blue-700 ring-blue-200',
    lab_request: 'bg-violet-50 text-violet-800 ring-violet-200',
    lab_result: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    prescription: 'bg-rose-50 text-rose-800 ring-rose-200',
    pharmacy: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    vaccine: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
    follow_up: 'bg-purple-50 text-purple-800 ring-purple-200',
};

function formatDate(value?: string | null) {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CardHeader({ type, title, date, status, summary }: PatientTransaction) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-2 text-[0.65rem] font-black ring-1 ${TYPE_MARK_CLASS[type]}`}>
                        {TYPE_MARK[type]}
                    </span>
                    <StatusBadge tone={type === 'lab_result' || type === 'pharmacy' ? 'green' : type === 'vaccine' ? 'indigo' : 'blue'}>
                        {TYPE_LABEL[type]}
                    </StatusBadge>
                    {status && <span className="text-xs font-bold text-slate-600">{status}</span>}
                </div>
                <h4 className="mt-2 text-base font-extrabold text-slate-900">{title}</h4>
                {summary && <p className="mt-1 text-sm font-medium leading-snug text-slate-700">{summary}</p>}
            </div>
            <div className="whitespace-nowrap text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-right">{formatDate(date)}</div>
        </div>
    );
}

function ItemsGrid({ items }: { items: PatientTransaction['items'] }) {
    if (items.length === 0) return null;

    return (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map(group => (
                <div key={group.label} className={`rounded-lg border border-slate-200 bg-slate-50 p-3 ${!group.values.length ? 'hidden' : ''}`}>
                    <div className="mb-2 text-[0.68rem] font-black uppercase tracking-widest text-slate-600">{group.label}</div>
                    <ul className="space-y-1.5">
                        {group.values.map((value, index) => (
                            <li
                                key={`${group.label}-${index}`}
                                className="rounded-md border border-slate-100 bg-white px-3 py-2 text-sm font-medium leading-relaxed text-slate-800 shadow-sm"
                            >
                                {value}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

function RetryButton({ onRetry }: { onRetry?: () => void }) {
    if (!onRetry) return null;
    return (
        <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
            Retry
        </button>
    );
}

function HistoryWarning({ warnings, onRetry }: { warnings: PatientHistoryWarning[]; onRetry?: () => void }) {
    if (warnings.length === 0) return null;

    return (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="font-extrabold">Partial history loaded</div>
            <p className="mt-1 font-medium text-amber-900">
                Some medical record sections could not be loaded. Review the visible records with caution.
            </p>
            <ul className="mt-3 space-y-1">
                {warnings.map(warning => (
                    <li key={warning.label} className="font-semibold">
                        {warning.label}: <span className="font-medium">{warning.message}</span>
                    </li>
                ))}
            </ul>
            <RetryButton onRetry={onRetry} />
        </div>
    );
}

export function PatientTransactionHistory({ transactions, isLoading, warnings = [], error, onRetry }: PatientTransactionHistoryProps) {
    if (isLoading) return <LoadingState label="Loading complete transaction history..." />;

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
                <div className="font-extrabold">Patient history could not be loaded</div>
                <p className="mt-1 font-medium">{error}</p>
                <RetryButton onRetry={onRetry} />
            </div>
        );
    }

    if (transactions.length === 0) {
        if (warnings.length > 0) {
            return (
                <div>
                    <HistoryWarning warnings={warnings} onRetry={onRetry} />
                    <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700">
                        No history records can be shown until the failed sections are retried or checked.
                    </div>
                </div>
            );
        }

        return (
            <EmptyState
                title="No transactions found"
                description="Registration, consent, consultations, lab, pharmacy, vaccine, and follow-up records will appear here."
            />
        );
    }

    return (
        <div className="relative">
            <HistoryWarning warnings={warnings} onRetry={onRetry} />

            <div className="absolute bottom-3 left-[18px] top-3 hidden w-0.5 bg-slate-200 sm:block" />

            <div className="space-y-4">
                {transactions.map(transaction => (
                    <div key={transaction.id} className="relative flex gap-4">
                        <div className="hidden shrink-0 pt-4 sm:flex">
                            <div className={`h-2.5 w-2.5 rounded-full shadow-sm ring-2 ring-white ${
                                transaction.type === 'lab_result' || transaction.type === 'pharmacy'
                                    ? 'bg-green-500'
                                    : transaction.type === 'vaccine'
                                        ? 'bg-indigo-500'
                                        : transaction.type === 'registration'
                                            ? 'bg-blue-500'
                                            : transaction.type === 'consent'
                                                ? 'bg-amber-500'
                                                : transaction.type === 'follow_up'
                                                    ? 'bg-purple-500'
                                                    : 'bg-slate-400'
                            }`} />
                        </div>

                        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
                            <CardHeader {...transaction} />
                            <ItemsGrid items={transaction.items} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
