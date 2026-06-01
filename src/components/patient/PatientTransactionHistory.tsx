import type { PatientTransaction } from '../../features/patients/history';
import { EmptyState } from '../shared/EmptyState';
import { LoadingState } from '../shared/LoadingState';
import { StatusBadge } from '../shared/StatusBadge';

interface PatientTransactionHistoryProps {
    transactions: PatientTransaction[];
    isLoading: boolean;
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

function formatDate(value?: string | null) {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PatientTransactionHistory({ transactions, isLoading }: PatientTransactionHistoryProps) {
    if (isLoading) return <LoadingState label="Loading complete transaction history..." />;

    if (transactions.length === 0) {
        return (
            <EmptyState
                title="No transactions found"
                description="Registration, consent, consultations, lab, pharmacy, vaccine, and follow-up records will appear here."
            />
        );
    }

    return (
        <div className="space-y-3">
            {transactions.map(transaction => (
                <div key={transaction.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge tone={transaction.type === 'lab_result' || transaction.type === 'pharmacy' ? 'green' : transaction.type === 'vaccine' ? 'indigo' : 'blue'}>
                                    {TYPE_LABEL[transaction.type]}
                                </StatusBadge>
                                {transaction.status && <span className="text-xs font-bold text-slate-500">{transaction.status}</span>}
                            </div>
                            <h4 className="mt-2 text-sm font-extrabold text-slate-900">{transaction.title}</h4>
                            {transaction.summary && <p className="mt-1 text-sm font-medium text-slate-600">{transaction.summary}</p>}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400 sm:text-right">{formatDate(transaction.date)}</div>
                    </div>

                    {transaction.items.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 gap-3">
                            {transaction.items.map(group => (
                                <div key={group.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                    <div className="text-[0.65rem] font-black uppercase tracking-widest text-slate-500">{group.label}</div>
                                    <ul className="mt-2 space-y-1">
                                        {group.values.map((value, index) => (
                                            <li key={`${group.label}-${index}`} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm">
                                                {value}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
