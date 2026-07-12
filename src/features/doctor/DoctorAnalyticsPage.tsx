import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton, SkeletonKpiGrid } from '../../components/ui/Skeleton';
import { Icon } from '../../components/shared/Icon';
import { healthcareErrorMessage, logError } from '../../lib/utils/errors';
import { fetchDoctorAnalytics } from './doctorAnalyticsService';
import type { AnalyticsBucket, AnalyticsPeriod, AnalyticsRow, DoctorAnalyticsData } from './doctorAnalyticsService';

type PresetKey = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

const PRESETS: Array<{ key: PresetKey; label: string; bucket: AnalyticsBucket }> = [
    { key: 'today', label: 'Today', bucket: 'day' },
    { key: 'week', label: 'This Week', bucket: 'day' },
    { key: 'month', label: 'This Month', bucket: 'day' },
    { key: 'quarter', label: 'This Quarter', bucket: 'week' },
    { key: 'year', label: 'This Year', bucket: 'month' },
];

function isoDate(date: Date): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function buildPeriod(from: Date, toExclusive: Date, bucket: AnalyticsBucket): AnalyticsPeriod {
    return { from: isoDate(from), toExclusive: isoDate(toExclusive), bucket };
}

function getPresetPeriod(preset: PresetKey, now = new Date()): AnalyticsPeriod {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from = today;
    let toExclusive = addDays(today, 1);
    let bucket: AnalyticsBucket = 'day';

    if (preset === 'week') {
        const day = today.getDay();
        const offset = day === 0 ? 6 : day - 1;
        from = addDays(today, -offset);
        toExclusive = addDays(from, 7);
    } else if (preset === 'month') {
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        toExclusive = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    } else if (preset === 'quarter') {
        const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
        from = new Date(today.getFullYear(), quarterMonth, 1);
        toExclusive = new Date(today.getFullYear(), quarterMonth + 3, 1);
        bucket = 'week';
    } else if (preset === 'year') {
        from = new Date(today.getFullYear(), 0, 1);
        toExclusive = new Date(today.getFullYear() + 1, 0, 1);
        bucket = 'month';
    }

    return buildPeriod(from, toExclusive, bucket);
}

function parseLocalDate(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
    return parsed;
}

function getCustomPeriod(fromValue: string, toValue: string): AnalyticsPeriod | null {
    const from = parseLocalDate(fromValue);
    const toInclusive = parseLocalDate(toValue);
    if (!from || !toInclusive) return null;
    const toExclusive = addDays(toInclusive, 1);
    const days = Math.round((toExclusive.getTime() - from.getTime()) / 86400000);
    if (days <= 0 || days > 366) return null;
    const bucket: AnalyticsBucket = days > 120 ? 'month' : days > 31 ? 'week' : 'day';
    return buildPeriod(from, toExclusive, bucket);
}

function sumCurrent(rows: AnalyticsRow[], predicate?: (row: AnalyticsRow) => boolean): number {
    return rows.reduce((sum, row) => {
        if (predicate && !predicate(row)) return sum;
        return sum + (row.current_count ?? 0);
    }, 0);
}

function titleCase(value: string | null): string {
    if (!value) return 'Unspecified';
    return value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function reliabilityTone(value: string | null): 'green' | 'amber' | 'slate' {
    if (value === 'Reliable') return 'green';
    if (value === 'Partially Reliable') return 'amber';
    return 'slate';
}

function MetricCard({ label, value, note }: { label: string; value: number; note: string }) {
    return (
        <div className="ops-summary-card">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="ops-summary-label">{label}</div>
                    <div className="ops-summary-value tabular-nums">{value.toLocaleString()}</div>
                    <div className="ops-summary-note">{note}</div>
                </div>
            </div>
        </div>
    );
}

function SectionPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <section className="ops-panel min-w-0">
            <div className="ops-panel-header">
                <div className="min-w-0">
                    <h2 className="ops-panel-title">{title}</h2>
                    <p className="ops-panel-subtitle">{subtitle}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="doctor-analytics-content-shell" aria-live="polite" aria-busy="true">
            <section aria-label="Loading analytics overview" className="doctor-analytics-section">
                <SkeletonKpiGrid count={4} />
            </section>

            <div className="ops-grid">
                <div className="col-span-12 lg:col-span-8">
                    <SectionPanel title="Service Trend" subtitle="Preparing consultation trend.">
                        <div className="doctor-analytics-chart-skeleton" aria-hidden="true">
                            <Skeleton className="h-full w-full" />
                        </div>
                    </SectionPanel>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <SectionPanel title="Pending Work" subtitle="Preparing workload summary.">
                        <div className="doctor-pending-list">
                            {[0, 1, 2].map(item => (
                                <div className="doctor-analytics-summary-row" key={item} aria-hidden="true">
                                    <div className="min-w-0 flex-1">
                                        <Skeleton className="clinical-skeleton-line w-24" />
                                        <Skeleton className="clinical-skeleton-line mt-2 w-32" />
                                    </div>
                                    <Skeleton className="h-5 w-10" />
                                </div>
                            ))}
                        </div>
                    </SectionPanel>
                </div>

                <div className="col-span-12 md:col-span-6">
                    <SectionPanel title="Top Diagnoses" subtitle="Preparing diagnosis ranking.">
                        <div className="doctor-ranking-list">
                            {[0, 1, 2, 3, 4].map(item => <Skeleton className="my-3 h-5 w-full" key={item} />)}
                        </div>
                    </SectionPanel>
                </div>

                <div className="col-span-12 md:col-span-6">
                    <SectionPanel title="Top Complaints" subtitle="Preparing complaint ranking.">
                        <div className="doctor-ranking-list">
                            {[0, 1, 2, 3, 4].map(item => <Skeleton className="my-3 h-5 w-full" key={item} />)}
                        </div>
                    </SectionPanel>
                </div>
            </div>
        </div>
    );
}

function SummaryRow({ label, value, note }: { label: string; value: number; note: string }) {
    return (
        <div className="doctor-analytics-summary-row">
            <div className="min-w-0">
                <div className="doctor-analytics-row-label">{label}</div>
                <div className="doctor-analytics-row-note">{note}</div>
            </div>
            <strong className="doctor-analytics-row-value tabular-nums">{value.toLocaleString()}</strong>
        </div>
    );
}

function formatBucketDate(value: string | null, bucket: AnalyticsBucket): string {
    if (!value) return 'Total';
    const parsed = parseLocalDate(value);
    if (!parsed) return value;
    return parsed.toLocaleDateString('en-PH', bucket === 'month'
        ? { month: 'short', year: '2-digit' }
        : { month: 'short', day: 'numeric' });
}

function RankingList({ rows, emptyTitle }: { rows: AnalyticsRow[]; emptyTitle: string }) {
    const ranked = rows.slice(0, 5);
    if (ranked.length === 0) {
        return <EmptyState title={emptyTitle} description="No aggregate rows were returned for this period." className="m-4" />;
    }

    return (
        <ol className="doctor-ranking-list">
            {ranked.map((row, index) => (
                <li className="doctor-ranking-row" key={`${row.metric_key}-${row.dimension_key ?? 'all'}-${index}`}>
                    <span className="doctor-ranking-index tabular-nums">{index + 1}</span>
                    <span className="doctor-ranking-label">{titleCase(row.dimension_key)}</span>
                    <strong className="doctor-ranking-value tabular-nums">{(row.current_count ?? 0).toLocaleString()}</strong>
                </li>
            ))}
        </ol>
    );
}

function StatusSummaryList({ rows, emptyTitle }: { rows: AnalyticsRow[]; emptyTitle: string }) {
    const grouped = rows.reduce<Record<string, number>>((acc, row) => {
        if (!row.dimension_key) return acc;
        acc[row.dimension_key] = (acc[row.dimension_key] ?? 0) + (row.current_count ?? 0);
        return acc;
    }, {});
    const visibleRows = Object.entries(grouped)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
    const total = visibleRows.reduce((sum, row) => sum + row.count, 0);

    if (visibleRows.length === 0) {
        return <EmptyState title={emptyTitle} description="No status aggregates were returned for this period." className="m-4" />;
    }

    return (
        <div className="doctor-status-list">
            {visibleRows.map((row, index) => {
                const count = row.count;
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                    <div className="doctor-status-row" key={`${row.label}-${index}`}>
                        <div className="min-w-0">
                            <div className="doctor-status-label">{titleCase(row.label)}</div>
                            <div className="doctor-status-track" aria-hidden="true">
                                <span style={{ width: `${percent}%` }} />
                            </div>
                        </div>
                        <div className="doctor-status-value">
                            <strong className="tabular-nums">{count.toLocaleString()}</strong>
                            <span className="tabular-nums">{percent}%</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function AnalyticsNoteCard() {
    return (
        <section className="doctor-analytics-note">
            <Icon name="alert-triangle" className="h-4 w-4" />
            <div>
                <strong>Aggregate clinical records</strong>
                <p>Analytics are generated from aggregate clinical records. Free-text diagnoses and complaints may include spelling or wording variations.</p>
            </div>
        </section>
    );
}

function AggregateTable({ rows, emptyTitle }: { rows: AnalyticsRow[]; emptyTitle: string }) {
    if (rows.length === 0) {
        return <EmptyState title={emptyTitle} description="No aggregate rows were returned for the selected period." className="m-4" />;
    }

    return (
        <div className="clinical-table-scroll">
            <table className="clinical-table doctor-analytics-detail-table min-w-[860px]">
                <colgroup>
                    <col className="doctor-table-col-metric" />
                    <col className="doctor-table-col-group" />
                    <col className="doctor-table-col-number" />
                    <col className="doctor-table-col-number" />
                    <col className="doctor-table-col-state" />
                </colgroup>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Group</th>
                        <th className="doctor-table-number">Current</th>
                        <th className="doctor-table-number">Previous</th>
                        <th className="doctor-table-state">Reliability</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={`${row.metric_key}-${row.dimension_key ?? 'all'}-${row.bucket_start ?? 'none'}-${index}`}>
                            <td>
                                <div className="clinical-primary">{titleCase(row.metric_key)}</div>
                                {row.bucket_start && <div className="clinical-secondary">{row.bucket_start}</div>}
                            </td>
                            <td>{titleCase(row.dimension_key)}</td>
                            <td className="doctor-table-number tabular-nums">{(row.current_count ?? 0).toLocaleString()}</td>
                            <td className="doctor-table-number tabular-nums">{row.previous_count === null ? 'n/a' : (row.previous_count ?? 0).toLocaleString()}</td>
                            <td className="doctor-table-state"><span className={`doctor-reliability-text is-${reliabilityTone(row.reliability)}`}>{row.reliability ?? 'Informational'}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function FrequencyTable({ rows, emptyTitle }: { rows: AnalyticsRow[]; emptyTitle: string }) {
    if (rows.length === 0) {
        return <EmptyState title={emptyTitle} description="No free-text aggregate rows were returned for this period." className="m-4" />;
    }

    return (
        <div className="clinical-table-scroll">
            <table className="clinical-table doctor-analytics-detail-table min-w-[860px]">
                <colgroup>
                    <col className="doctor-table-col-metric" />
                    <col className="doctor-table-col-group" />
                    <col className="doctor-table-col-number" />
                    <col className="doctor-table-col-number" />
                    <col className="doctor-table-col-state" />
                </colgroup>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Group</th>
                        <th className="doctor-table-number">Current</th>
                        <th className="doctor-table-number">Previous</th>
                        <th className="doctor-table-state">Reliability</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={`${row.metric_key}-${row.dimension_key ?? 'all'}-${index}`}>
                            <td>
                                <div className="clinical-primary">{titleCase(row.metric_key)}</div>
                            </td>
                            <td>{titleCase(row.dimension_key)}</td>
                            <td className="doctor-table-number tabular-nums">{(row.current_count ?? 0).toLocaleString()}</td>
                            <td className="doctor-table-number tabular-nums">{row.previous_count === null ? 'n/a' : (row.previous_count ?? 0).toLocaleString()}</td>
                            <td className="doctor-table-state"><span className={`doctor-reliability-text is-${reliabilityTone(row.reliability)}`}>{row.reliability ?? 'Informational'}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function DoctorAnalyticsPage({ isOnline }: { isOnline: boolean }) {
    const [detailTab, setDetailTab] = useState<'clinical' | 'laboratory' | 'prescriptions'>('clinical');
    const [preset, setPreset] = useState<PresetKey>('month');
    const defaultCustomPeriod = useMemo(() => getPresetPeriod('month'), []);
    const [customFrom, setCustomFrom] = useState(defaultCustomPeriod.from);
    const [customTo, setCustomTo] = useState(isoDate(addDays(parseLocalDate(defaultCustomPeriod.toExclusive) ?? new Date(), -1)));
    const [data, setData] = useState<DoctorAnalyticsData | null>(null);
    const [activePeriod, setActivePeriod] = useState<AnalyticsPeriod>(defaultCustomPeriod);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const customPeriod = useMemo(() => getCustomPeriod(customFrom, customTo), [customFrom, customTo]);
    const period = useMemo(() => preset === 'custom' ? customPeriod : getPresetPeriod(preset), [customPeriod, preset]);
    const displayPeriod = period ?? activePeriod;
    const isInitialLoading = isLoading && !data;
    const isRefreshing = isLoading && Boolean(data);

    useEffect(() => {
        let isCurrent = true;

        async function loadAnalytics() {
            if (!period) {
                setError('Choose a valid custom range from 1 to 366 days.');
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const result = await fetchDoctorAnalytics(period);
                if (isCurrent) {
                    setData(result);
                    setActivePeriod(period);
                }
            } catch (err) {
                logError('Failed to load doctor analytics', err);
                if (isCurrent) {
                    setError(err instanceof Error && err.message === 'permission_denied'
                        ? 'Analytics access is limited to authorized Doctor accounts.'
                        : healthcareErrorMessage('load analytics'));
                }
            } finally {
                if (isCurrent) setIsLoading(false);
            }
        }

        void loadAnalytics();

        return () => {
            isCurrent = false;
        };
    }, [period]);

    const overview = useMemo(() => {
        if (!data) return null;
        return {
            consultations: sumCurrent(data.consultationVolume),
            followUpsPending: sumCurrent(data.followUpCurrentWorkload, row => row.dimension_key === 'pending'),
            labPending: sumCurrent(data.labCurrentWorkload, row => row.dimension_key === 'pending'),
            prescriptionsPending: sumCurrent(data.prescriptionCurrentWorkload, row => row.dimension_key === 'pending'),
        };
    }, [data]);

    return (
        <div className="pwa-page-pad flex flex-col pwa-panel-gap">
            {!isOnline && (
                <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    Analytics may be out of date while the workstation is offline.
                </div>
            )}

            <header className="doctor-analytics-period">
                <div className="min-w-0 flex-1">
                    <h1 className="doctor-analytics-page-title">Analytics Overview</h1>
                    <p className="doctor-analytics-period-label">{displayPeriod.from} to {displayPeriod.toExclusive}</p>
                </div>
                <div className="clinical-filter-group" aria-label="Doctor analytics date presets">
                    {PRESETS.map(item => (
                        <button
                            key={item.key}
                            type="button"
                            className={`clinical-filter-button ${preset === item.key ? 'is-active' : ''}`}
                            aria-pressed={preset === item.key}
                            disabled={isRefreshing && preset === item.key}
                            onClick={() => setPreset(item.key)}
                        >
                            {item.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        className={`clinical-filter-button ${preset === 'custom' ? 'is-active' : ''}`}
                        aria-pressed={preset === 'custom'}
                        disabled={isRefreshing && preset === 'custom'}
                        onClick={() => setPreset('custom')}
                    >
                        Custom
                    </button>
                </div>
                <div className={`doctor-analytics-updating ${isRefreshing ? 'is-visible' : ''}`} role="status" aria-live="polite">
                    <span className="doctor-analytics-spinner" aria-hidden="true" />
                    <span>Updating</span>
                </div>
                {preset === 'custom' && (
                    <div className="flex w-full flex-wrap items-end gap-2 border-t border-slate-200 pt-3">
                        <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-semibold text-slate-600">
                            From
                            <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="clinical-input min-h-9" disabled={isRefreshing && preset === 'custom'} />
                        </label>
                        <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-semibold text-slate-600">
                            To
                            <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="clinical-input min-h-9" disabled={isRefreshing && preset === 'custom'} />
                        </label>
                        <span className="pb-2 text-xs font-medium text-slate-500">Maximum 366 days. End date is included.</span>
                    </div>
                )}
            </header>

            {error && (
                <div className="doctor-analytics-inline-alert" role="alert">
                    <Icon name="alert-triangle" className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}

            {!data || !overview ? (
                isInitialLoading ? (
                    <AnalyticsSkeleton />
                ) : (
                    <EmptyState title="No analytics available" description="No aggregate analytics rows were returned." />
                )
            ) : (
            <div className="doctor-analytics-content-shell">
                <section aria-label="Analytics overview" className="doctor-analytics-section">
                    <div className="doctor-kpi-grid">
                        <MetricCard label="Consultations" value={overview.consultations} note="Selected period" />
                        <MetricCard label="Pending Follow-ups" value={overview.followUpsPending} note="Active-patient workload" />
                        <MetricCard label="Pending Labs" value={overview.labPending} note="Active-patient workload" />
                        <MetricCard label="Pending Prescriptions" value={overview.prescriptionsPending} note="Active-patient workload" />
                    </div>
                </section>

                <div className="ops-grid">
                <div className="col-span-12 lg:col-span-8">
                    <SectionPanel title="Service Trend" subtitle="Consultations by period, compared with the previous equal period.">
                        {data.consultationVolume.length === 0 ? <EmptyState title="No consultation trend" description="No consultation aggregates were returned for this period." className="m-4" /> : (
                            <div className="doctor-trend-figure" role="img" aria-label="Consultations for the current and previous equal periods">
                                {(() => {
                                    const maxValue = Math.max(...data.consultationVolume.flatMap(row => [row.current_count ?? 0, row.previous_count ?? 0]), 1);
                                    const axisMax = Math.max(4, Math.ceil(maxValue / 4) * 4);
                                    const ticks = [axisMax, Math.round(axisMax * 0.75), Math.round(axisMax * 0.5), Math.round(axisMax * 0.25), 0];
                                    return <div className="doctor-trend-layout">
                                        <div className="doctor-trend-y-axis" aria-hidden="true">
                                            {ticks.map((tick, index) => <span key={`${tick}-${index}`} className="tabular-nums">{tick}</span>)}
                                        </div>
                                        <div className="doctor-trend-plot">
                                            <div className="doctor-trend-grid" aria-hidden="true">{ticks.map((_, index) => <i key={index} />)}</div>
                                            <div className="doctor-trend-chart">
                                    {data.consultationVolume.map((row, index) => {
                                        const current = row.current_count ?? 0;
                                        const previous = row.previous_count ?? 0;
                                        return (
                                            <div className="doctor-trend-column" key={`${row.bucket_start ?? 'period'}-${index}`}>
                                                <div className="doctor-trend-bars">
                                                    <div className="doctor-trend-bar is-current" title={`Current: ${current}`} style={{ height: `${Math.max((current / axisMax) * 100, current ? 3 : 0)}%` }} />
                                                    <div className="doctor-trend-bar is-previous" title={`Previous: ${previous}`} style={{ height: `${Math.max((previous / axisMax) * 100, previous ? 3 : 0)}%` }} />
                                                </div>
                                                <div className="doctor-trend-label">{formatBucketDate(row.bucket_start, displayPeriod.bucket)}</div>
                                            </div>
                                        );
                                    })}
                                            </div>
                                        </div>
                                    </div>;
                                })()}
                                <div className="doctor-trend-legend"><span><i className="is-current" />Current</span><span><i className="is-previous" />Previous</span></div>
                            </div>
                        )}
                    </SectionPanel>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <SectionPanel title="Pending Work" subtitle="Active-patient items awaiting action.">
                        <div className="doctor-pending-list">
                            <SummaryRow label="Follow-ups" value={overview.followUpsPending} note="Scheduled care" />
                            <SummaryRow label="Laboratory" value={overview.labPending} note="Requests pending" />
                            <SummaryRow label="Prescriptions" value={overview.prescriptionsPending} note="Awaiting completion" />
                        </div>
                    </SectionPanel>
                </div>

                <div className="col-span-12 md:col-span-6">
                    <SectionPanel title="Top Diagnoses" subtitle="Most frequently recorded diagnosis text.">
                        <RankingList rows={data.diagnoses} emptyTitle="No diagnosis aggregates" />
                    </SectionPanel>
                </div>

                <div className="col-span-12 md:col-span-6">
                    <SectionPanel title="Top Complaints" subtitle="Most frequently recorded complaint text.">
                        <RankingList rows={data.complaints} emptyTitle="No complaint aggregates" />
                    </SectionPanel>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <SectionPanel title="Follow-up Completion" subtitle="Return-visit status for the selected period.">
                        <StatusSummaryList rows={data.followUpActivity} emptyTitle="No follow-up status" />
                    </SectionPanel>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <SectionPanel title="Lab Request Status" subtitle="Laboratory request status mix.">
                        <StatusSummaryList rows={[...data.labCurrentWorkload, ...data.labActivity]} emptyTitle="No lab status" />
                    </SectionPanel>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <SectionPanel title="Prescription Status" subtitle="Prescribing and dispensing status mix.">
                        <StatusSummaryList rows={[...data.prescriptionCurrentWorkload, ...data.prescriptionPrescribed, ...data.prescriptionDispensed]} emptyTitle="No prescription status" />
                    </SectionPanel>
                </div>

                <div className="col-span-12">
                    <AnalyticsNoteCard />
                </div>

                <div className="col-span-12">
                    <SectionPanel title="Details" subtitle="Supporting aggregate tables for closer review.">
                        <div className="doctor-analytics-tabs" role="tablist" aria-label="Doctor analytics detail">
                            {([
                                ['clinical', 'Diagnoses & Complaints'],
                                ['laboratory', 'Lab Trends'],
                                ['prescriptions', 'Prescription Trends'],
                            ] as const).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={detailTab === key}
                                    className={`clinical-filter-button ${detailTab === key ? 'is-active' : ''}`}
                                    onClick={() => setDetailTab(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div role="tabpanel">
                            {detailTab === 'clinical' && <div className="ops-grid p-4"><div className="col-span-12 lg:col-span-6"><h3 className="mb-2 text-sm font-semibold text-slate-800">Recorded Diagnoses</h3><FrequencyTable rows={data.diagnoses} emptyTitle="No diagnosis aggregates" /></div><div className="col-span-12 lg:col-span-6"><h3 className="mb-2 text-sm font-semibold text-slate-800">Recorded Complaints</h3><FrequencyTable rows={data.complaints} emptyTitle="No complaint aggregates" /></div></div>}
                            {detailTab === 'laboratory' && <div className="p-4"><AggregateTable rows={[...data.labCurrentWorkload, ...data.labActivity]} emptyTitle="No lab activity" /></div>}
                            {detailTab === 'prescriptions' && <div className="p-4"><AggregateTable rows={[...data.prescriptionCurrentWorkload, ...data.prescriptionPrescribed, ...data.prescriptionDispensed]} emptyTitle="No prescription activity" /></div>}
                        </div>
                    </SectionPanel>
                </div>
                </div>
            </div>
            )}
        </div>
    );
}
