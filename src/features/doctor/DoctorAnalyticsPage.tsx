import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Icon } from '../../components/shared/Icon';
import { healthcareErrorMessage, logError } from '../../lib/utils/errors';
import malvarBarangaysGeoJsonRaw from '../../assets/geo/malvar-barangays.geojson?raw';
import { fetchBarangayDrilldown, fetchDoctorAnalytics } from './doctorAnalyticsService';
import type { AnalyticsBucket, AnalyticsPeriod, AnalyticsRow, BarangayHeatmapRow, DoctorAnalyticsData } from './doctorAnalyticsService';

type PresetKey = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
type WorkloadChartVariant = 'followup' | 'lab' | 'prescription';
type BarangayHeatmapMetric = 'registered' | 'consultations' | 'pendingFollowUps' | 'vaccinations';
type GeoPosition = [number, number];
type GeoRing = GeoPosition[];
type GeoPolygon = GeoRing[];
type GeoMultiPolygon = GeoPolygon[];
type BarangayGeometry = { type: 'Polygon'; coordinates: GeoPolygon } | { type: 'MultiPolygon'; coordinates: GeoMultiPolygon };
type BarangayBoundaryFeature = {
    type: 'Feature';
    geometry: BarangayGeometry;
    properties: { adm4_en: string };
    id?: string | number;
};
type ProjectedPath = BarangayBoundaryFeature & { path: string };

const PRESETS: Array<{ key: PresetKey; label: string; bucket: AnalyticsBucket }> = [
    { key: 'today', label: 'Today', bucket: 'day' },
    { key: 'week', label: 'This Week', bucket: 'day' },
    { key: 'month', label: 'This Month', bucket: 'day' },
    { key: 'quarter', label: 'This Quarter', bucket: 'week' },
    { key: 'year', label: 'This Year', bucket: 'month' },
];

const BARANGAY_HEATMAP_METRICS: Array<{ key: BarangayHeatmapMetric; label: string; field: keyof Pick<BarangayHeatmapRow, 'registered_patients' | 'consultations' | 'pending_follow_ups' | 'vaccinations'>; valueLabel: string }> = [
    { key: 'registered', label: 'Registered Patients', field: 'registered_patients', valueLabel: 'registered patients' },
    { key: 'consultations', label: 'Consultations', field: 'consultations', valueLabel: 'consultations' },
    { key: 'pendingFollowUps', label: 'Pending Follow-ups', field: 'pending_follow_ups', valueLabel: 'pending follow-ups' },
    { key: 'vaccinations', label: 'Vaccinations', field: 'vaccinations', valueLabel: 'vaccinations' },
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

function normalizeBarangayKey(value: string | null | undefined): string {
    return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function statusMatches(value: string, patterns: string[]): boolean {
    return patterns.some(pattern => value.includes(pattern));
}

function reliabilityTone(value: string | null): 'green' | 'amber' | 'slate' {
    if (value === 'Reliable') return 'green';
    if (value === 'Partially Reliable') return 'amber';
    return 'slate';
}

function sumPrevious(rows: AnalyticsRow[], predicate?: (row: AnalyticsRow) => boolean): number {
    return rows.reduce((sum, row) => {
        if (predicate && !predicate(row)) return sum;
        return sum + (row.previous_count ?? 0);
    }, 0);
}

function formatDelta(current: number, previous: number): string {
    if (previous === 0) return current === 0 ? 'No change' : 'New activity';
    const percent = Math.round(((current - previous) / previous) * 100);
    if (percent === 0) return 'No change';
    return `${percent > 0 ? '+' : ''}${percent}% vs previous`;
}

function deltaTone(current: number, previous: number): 'up' | 'down' | 'flat' {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'flat';
}

function MetricCard({ label, value, note, comparison, tone = 'flat' }: { label: string; value: number; note: string; comparison?: string; tone?: 'up' | 'down' | 'flat' }) {
    return (
        <div className="doctor-insight-card">
            <div className="doctor-insight-topline">
                <div className="doctor-insight-label">{label}</div>
                {comparison && <span className={`doctor-comparison-badge is-${tone}`}>{comparison}</span>}
            </div>
            <div className="doctor-insight-value tabular-nums">{value.toLocaleString()}</div>
            <div className="doctor-insight-note">{note}</div>
        </div>
    );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="doctor-analytics-section-heading">
            <h2>{title}</h2>
            <p>{subtitle}</p>
        </div>
    );
}

function SectionPanel({ title, subtitle, children, className = '' }: { title: string; subtitle: string; children: React.ReactNode; className?: string }) {
    return (
        <section className={`ops-panel doctor-dashboard-card min-w-0 ${className}`}>
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
            <section aria-label="Loading analytics summary" className="doctor-kpi-strip">
                {[0, 1, 2, 3].map(item => (
                    <div className="doctor-insight-card" key={item} aria-hidden="true">
                        <Skeleton className="clinical-skeleton-line w-28" />
                        <Skeleton className="mt-4 h-9 w-16" />
                        <Skeleton className="clinical-skeleton-line mt-4 w-32" />
                    </div>
                ))}
            </section>

            <section aria-label="Loading primary analytics insights" className="doctor-analytics-section">
                <SectionHeading title="Primary Insight" subtitle="Preparing service activity and current workload." />
                <div className="doctor-primary-grid">
                <div className="doctor-primary-chart">
                    <SectionPanel title="Consultation Activity" subtitle="Preparing consultation trend.">
                        <div className="doctor-analytics-chart-skeleton" aria-hidden="true">
                            <Skeleton className="h-full w-full" />
                        </div>
                    </SectionPanel>
                </div>
                <div className="doctor-primary-side">
                    <SectionPanel title="Pending Work" subtitle="Preparing pending work.">
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
                    <SectionPanel title="Current Signals" subtitle="Preparing signals.">
                        <div className="doctor-signal-stack">
                            {[0, 1].map(item => <Skeleton className="h-16 w-full" key={item} />)}
                        </div>
                    </SectionPanel>
                </div>
                </div>
            </section>

            <div className="doctor-operational-grid">
                <SectionPanel title="Service Workload Distribution" subtitle="Preparing workload distribution.">
                    <div className="doctor-chart-skeleton is-radar">
                        <Skeleton className="doctor-skeleton-radar" />
                        <div className="doctor-skeleton-lines">
                            <Skeleton className="clinical-skeleton-line w-full" />
                            <Skeleton className="clinical-skeleton-line w-10/12" />
                        </div>
                    </div>
                </SectionPanel>
                <SectionPanel title="Follow-up Completion" subtitle="Preparing follow-up status.">
                    <div className="doctor-chart-skeleton is-radial">
                        <Skeleton className="doctor-skeleton-semi" />
                        <div className="doctor-skeleton-lines">
                            <Skeleton className="clinical-skeleton-line w-full" />
                            <Skeleton className="clinical-skeleton-line w-10/12" />
                        </div>
                    </div>
                </SectionPanel>
                <SectionPanel title="Lab Request Status" subtitle="Preparing lab status.">
                    <div className="doctor-chart-skeleton is-stacked">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="clinical-skeleton-line w-10/12" />
                    </div>
                </SectionPanel>
                <SectionPanel title="Prescription Status" subtitle="Preparing prescription status.">
                    <div className="doctor-chart-skeleton is-donut">
                        <Skeleton className="doctor-skeleton-donut" />
                        <div className="doctor-skeleton-lines">
                            <Skeleton className="clinical-skeleton-line w-full" />
                            <Skeleton className="clinical-skeleton-line w-10/12" />
                        </div>
                    </div>
                </SectionPanel>
            </div>

            <section aria-label="Loading geographic insights" className="doctor-analytics-section">
                <SectionHeading title="Geographic Insights" subtitle="All registered active patient reach by stored barangay." />
                <div className="doctor-geographic-command">
                    <div className="doctor-geographic-panel doctor-geographic-ranking-panel">
                        <Skeleton className="clinical-skeleton-line w-32" />
                        <div className="doctor-geographic-skeleton">
                            {[0, 1, 2, 3, 4].map(item => (
                                <div className="doctor-barangay-skeleton-row" key={item}>
                                    <Skeleton className="h-7 w-7 rounded-full" />
                                    <div className="min-w-0 flex-1">
                                        <Skeleton className="clinical-skeleton-line w-32" />
                                        <Skeleton className="clinical-skeleton-line mt-2 w-full" />
                                    </div>
                                    <Skeleton className="clinical-skeleton-line w-10" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="doctor-geographic-panel doctor-geographic-map-panel">
                        <Skeleton className="clinical-skeleton-line w-40" />
                        <div className="doctor-chart-skeleton is-radar">
                            <Skeleton className="doctor-skeleton-radar" />
                            <div className="doctor-skeleton-lines">
                                <Skeleton className="clinical-skeleton-line w-full" />
                                <Skeleton className="clinical-skeleton-line w-10/12" />
                            </div>
                        </div>
                    </div>
                    <div className="doctor-geographic-panel doctor-geographic-summary-panel">
                        <Skeleton className="clinical-skeleton-line w-36" />
                        <div className="doctor-coverage-summary">
                            {[0, 1, 2, 3].map(item => <Skeleton className="h-16 w-full" key={item} />)}
                        </div>
                    </div>
                </div>
            </section>
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

function safePercent(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
}

function polarPoint(cx: number, cy: number, radius: number, index: number, total: number) {
    const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
    return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
    };
}

function chartPoint(index: number, value: number, count: number, axisMax: number) {
    const width = 100;
    const height = 100;
    const x = count <= 1 ? width / 2 : (index / (count - 1)) * width;
    const y = height - (value / axisMax) * height;
    return { x, y };
}

function svgPath(points: Array<{ x: number; y: number }>): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function ServiceTrendChart({ rows, bucket }: { rows: AnalyticsRow[]; bucket: AnalyticsBucket }) {
    if (rows.length === 0) {
        return <EmptyState title="No consultation trend" description="No consultation aggregates were returned for this period." className="m-4" />;
    }

    const maxValue = Math.max(...rows.flatMap(row => [row.current_count ?? 0, row.previous_count ?? 0]), 1);
    const axisMax = Math.max(4, Math.ceil(maxValue / 4) * 4);
    const ticks = [axisMax, Math.round(axisMax * 0.75), Math.round(axisMax * 0.5), Math.round(axisMax * 0.25), 0];
    const currentPoints = rows.map((row, index) => chartPoint(index, row.current_count ?? 0, rows.length, axisMax));
    const previousPoints = rows.map((row, index) => chartPoint(index, row.previous_count ?? 0, rows.length, axisMax));
    const labelStride = rows.length > 12 ? Math.ceil(rows.length / 6) : rows.length > 7 ? 2 : 1;

    return (
        <div className="doctor-line-chart" role="img" aria-label="Current and previous consultation trend">
            <div className="doctor-line-legend">
                <span><i className="is-current" />Current period</span>
                <span><i className="is-previous" />Previous equivalent</span>
            </div>
            <div className="doctor-line-frame">
                <div className="doctor-line-y-axis" aria-hidden="true">
                    {ticks.map((tick, index) => <span key={`${tick}-${index}`} className="tabular-nums">{tick}</span>)}
                </div>
                <div className="doctor-line-plot">
                    <div className="doctor-line-grid" aria-hidden="true">{ticks.map((_, index) => <i key={index} />)}</div>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="doctor-line-svg" aria-hidden="true">
                        <path className="doctor-line-area" d={`${svgPath(currentPoints)} L 100 100 L 0 100 Z`} />
                        <path className="doctor-line-path is-previous" d={svgPath(previousPoints)} />
                        <path className="doctor-line-path is-current" d={svgPath(currentPoints)} />
                    </svg>
                    <div className="doctor-line-hitpoints">
                        {rows.map((row, index) => {
                            const current = row.current_count ?? 0;
                            const previous = row.previous_count ?? 0;
                            const point = currentPoints[index];
                            return (
                                <span
                                    key={`${row.bucket_start ?? 'period'}-${index}`}
                                    className="doctor-line-point"
                                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                                    title={`${formatBucketDate(row.bucket_start, bucket)}: ${current.toLocaleString()} current, ${previous.toLocaleString()} previous`}
                                />
                            );
                        })}
                    </div>
                    <div className="doctor-line-x-axis">
                        {rows.map((row, index) => (
                            <span key={`${row.bucket_start ?? 'period'}-${index}`} className={index % labelStride === 0 || index === rows.length - 1 ? '' : 'is-hidden'}>
                                {formatBucketDate(row.bucket_start, bucket)}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function WorkloadRadarChart({ counts }: { counts: Array<{ label: string; value: number }> }) {
    const total = counts.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return <EmptyState title="No workload distribution" description="No current workload counts were returned for this period." className="m-4" />;
    }

    const maxValue = Math.max(...counts.map(item => item.value), 1);
    const cx = 80;
    const cy = 78;
    const radius = 52;
    const levels = [0.25, 0.5, 0.75, 1];
    const shapePoints = counts.map((item, index) => {
        const point = polarPoint(cx, cy, radius * (item.value / maxValue), index, counts.length);
        return `${point.x},${point.y}`;
    }).join(' ');

    return (
        <div className="doctor-radar-chart">
            <svg viewBox="0 0 160 150" className="doctor-radar-svg" role="img" aria-label="Current workload distribution">
                {levels.map(level => (
                    <polygon
                        key={level}
                        className="doctor-radar-ring"
                        points={counts.map((_, index) => {
                            const point = polarPoint(cx, cy, radius * level, index, counts.length);
                            return `${point.x},${point.y}`;
                        }).join(' ')}
                    />
                ))}
                {counts.map((item, index) => {
                    const outer = polarPoint(cx, cy, radius, index, counts.length);
                    const label = polarPoint(cx, cy, radius + 18, index, counts.length);
                    return (
                        <g key={item.label}>
                            <line className="doctor-radar-axis" x1={cx} y1={cy} x2={outer.x} y2={outer.y} />
                            <text className="doctor-radar-label" x={label.x} y={label.y} textAnchor={label.x < cx - 8 ? 'end' : label.x > cx + 8 ? 'start' : 'middle'}>
                                {item.label}
                            </text>
                        </g>
                    );
                })}
                <polygon className="doctor-radar-shape" points={shapePoints} />
                {counts.map((item, index) => {
                    const point = polarPoint(cx, cy, radius * (item.value / maxValue), index, counts.length);
                    return <circle key={item.label} className="doctor-radar-dot" cx={point.x} cy={point.y} r="3"><title>{`${item.label}: ${item.value.toLocaleString()}`}</title></circle>;
                })}
            </svg>
            <div className="doctor-radar-legend">
                {counts.map(item => (
                    <span key={item.label}>{item.label}<strong className="tabular-nums">{item.value.toLocaleString()}</strong></span>
                ))}
            </div>
        </div>
    );
}

function RankingList({ rows, emptyTitle }: { rows: AnalyticsRow[]; emptyTitle: string }) {
    const ranked = rows.slice(0, 5);
    const maxValue = Math.max(...ranked.map(row => row.current_count ?? 0), 1);
    if (ranked.length === 0) {
        return <EmptyState title={emptyTitle} description="No aggregate rows were returned for this period." className="m-4" />;
    }

    return (
        <ol className="doctor-ranking-list">
            {ranked.map((row, index) => {
                const value = row.current_count ?? 0;
                return (
                    <li className="doctor-ranking-row" key={`${row.metric_key}-${row.dimension_key ?? 'all'}-${index}`}>
                        <span className="doctor-ranking-index tabular-nums">{index + 1}</span>
                        <div className="doctor-ranking-main">
                            <div className="doctor-ranking-meta">
                                <span className="doctor-ranking-label" title={titleCase(row.dimension_key)}>{titleCase(row.dimension_key)}</span>
                                <strong className="doctor-ranking-value tabular-nums">{value.toLocaleString()}</strong>
                            </div>
                            <div className="doctor-ranking-track" aria-hidden="true">
                                <span style={{ width: `${value ? Math.min(88, Math.max((value / maxValue) * 82, 10)) : 0}%` }} />
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function isCoordinatePair(value: unknown): value is GeoPosition {
    return Array.isArray(value)
        && value.length >= 2
        && typeof value[0] === 'number'
        && typeof value[1] === 'number'
        && Number.isFinite(value[0])
        && Number.isFinite(value[1]);
}

function isClosedRing(ring: unknown): ring is GeoRing {
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isCoordinatePair)) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first[0] === last[0] && first[1] === last[1];
}

function isPolygonCoordinates(value: unknown): value is GeoPolygon {
    return Array.isArray(value) && value.length > 0 && value.every(isClosedRing);
}

function isMultiPolygonCoordinates(value: unknown): value is GeoMultiPolygon {
    return Array.isArray(value) && value.length > 0 && value.every(isPolygonCoordinates);
}

function validateMalvarBarangayBoundaries(value: unknown): BarangayBoundaryFeature[] {
    if (!value || typeof value !== 'object') return [];
    const collection = value as { type?: unknown; features?: unknown };
    if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) return [];

    const features: BarangayBoundaryFeature[] = [];
    for (const item of collection.features) {
        if (!item || typeof item !== 'object') return [];
        const feature = item as { type?: unknown; geometry?: unknown; properties?: unknown; id?: string | number };
        if (feature.type !== 'Feature' || !feature.geometry || typeof feature.geometry !== 'object') return [];

        const geometry = feature.geometry as { type?: unknown; coordinates?: unknown };
        const properties = feature.properties as { adm4_en?: unknown } | null;
        if (!properties || typeof properties.adm4_en !== 'string' || normalizeBarangayKey(properties.adm4_en) === '') return [];

        if (geometry.type === 'Polygon' && isPolygonCoordinates(geometry.coordinates)) {
            features.push({
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: geometry.coordinates },
                properties: { adm4_en: properties.adm4_en.trim().replace(/\s+/g, ' ') },
                id: feature.id,
            });
        } else if (geometry.type === 'MultiPolygon' && isMultiPolygonCoordinates(geometry.coordinates)) {
            features.push({
                type: 'Feature',
                geometry: { type: 'MultiPolygon', coordinates: geometry.coordinates },
                properties: { adm4_en: properties.adm4_en.trim().replace(/\s+/g, ' ') },
                id: feature.id,
            });
        } else {
            return [];
        }
    }

    return features;
}

function parseGeoJson(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

const MALVAR_BARANGAY_BOUNDARIES = validateMalvarBarangayBoundaries(parseGeoJson(malvarBarangaysGeoJsonRaw));
const MALVAR_MAP_VIEWBOX = { width: 1000, height: 680, padding: 24 };

function polygonList(geometry: BarangayGeometry): GeoPolygon[] {
    return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function getBoundaryBounds(features: BarangayBoundaryFeature[]) {
    let minLon = Number.POSITIVE_INFINITY;
    let maxLon = Number.NEGATIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;

    for (const feature of features) {
        for (const polygon of polygonList(feature.geometry)) {
            for (const ring of polygon) {
                for (const [lon, lat] of ring) {
                    minLon = Math.min(minLon, lon);
                    maxLon = Math.max(maxLon, lon);
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                }
            }
        }
    }

    return { minLon, maxLon, minLat, maxLat };
}

function buildProjectedPaths(features: BarangayBoundaryFeature[]): ProjectedPath[] {
    if (features.length === 0) return [];
    const { minLon, maxLon, minLat, maxLat } = getBoundaryBounds(features);
    const drawableWidth = MALVAR_MAP_VIEWBOX.width - MALVAR_MAP_VIEWBOX.padding * 2;
    const drawableHeight = MALVAR_MAP_VIEWBOX.height - MALVAR_MAP_VIEWBOX.padding * 2;
    const lonRange = Math.max(maxLon - minLon, 0.000001);
    const latRange = Math.max(maxLat - minLat, 0.000001);
    const scale = Math.min(drawableWidth / lonRange, drawableHeight / latRange);
    const offsetX = (MALVAR_MAP_VIEWBOX.width - lonRange * scale) / 2;
    const offsetY = (MALVAR_MAP_VIEWBOX.height - latRange * scale) / 2;

    return features.map(feature => {
        const path = polygonList(feature.geometry).map(polygon => (
            polygon.map(ring => ring.map(([lon, lat], index) => {
                const x = offsetX + (lon - minLon) * scale;
                const y = offsetY + (maxLat - lat) * scale;
                return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
            }).join(' ') + ' Z').join(' ')
        )).join(' ');
        return { ...feature, path };
    });
}

const PROJECTED_MALVAR_BARANGAYS = buildProjectedPaths(MALVAR_BARANGAY_BOUNDARIES);
const BARANGAY_MAP_PALETTE = [
    '#5A81FA',
    '#6F8DFA',
    '#8399F5',
    '#7380D6',
    '#4D59BE',
    '#2B318A',
    '#7A8EE4',
    '#9CA9F2',
    '#6372D2',
    '#4D67E6',
    '#869BFF',
    '#5660B8',
    '#7B82CC',
    '#A6B6FF',
    '#6678E8',
    '#3E459E',
];

function mapFillClass(count: number, maxCount: number): string {
    if (count <= 0 || maxCount <= 0) return 'is-empty';
    const ratio = count / maxCount;
    if (ratio >= 0.8) return 'is-highest';
    if (ratio >= 0.55) return 'is-high';
    if (ratio >= 0.3) return 'is-medium';
    return 'is-low';
}

function MalvarBarangayMap({
    boundaries,
    countsByKey,
    metricTotal,
    metricLabel,
    valueLabel,
    selectedBarangay,
    onSelectBarangay,
}: {
    boundaries: ProjectedPath[];
    countsByKey: Map<string, number>;
    metricTotal: number;
    metricLabel: string;
    valueLabel: string;
    selectedBarangay: string | null;
    onSelectBarangay: (barangay: string) => void;
}) {
    const [hoveredBarangay, setHoveredBarangay] = useState<string | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
    const maxCount = Math.max(...boundaries.map(feature => countsByKey.get(normalizeBarangayKey(feature.properties.adm4_en)) ?? 0), 0);
    const activeBarangay = hoveredBarangay ?? selectedBarangay ?? boundaries[0]?.properties.adm4_en ?? null;
    const activeCount = activeBarangay ? countsByKey.get(normalizeBarangayKey(activeBarangay)) ?? 0 : 0;
    const activePercent = safePercent(activeCount, metricTotal);
    const tooltipStyle = tooltipPosition
        ? {
            '--doctor-map-tooltip-x': `${tooltipPosition.x}px`,
            '--doctor-map-tooltip-y': `${tooltipPosition.y}px`,
        } as React.CSSProperties
        : undefined;

    function updateTooltipPosition(event: React.PointerEvent<SVGPathElement>) {
        const stage = event.currentTarget.closest('.doctor-map-stage');
        if (!(stage instanceof HTMLElement)) return;
        const rect = stage.getBoundingClientRect();
        const tooltipWidth = 188;
        const tooltipHeight = 92;
        const gutter = 12;
        const offset = 14;
        const x = Math.round(Math.min(Math.max(event.clientX - rect.left + offset, gutter), Math.max(gutter, rect.width - tooltipWidth - gutter)));
        const y = Math.round(Math.min(Math.max(event.clientY - rect.top + offset, gutter), Math.max(gutter, rect.height - tooltipHeight - gutter)));
        setTooltipPosition(previous => previous?.x === x && previous?.y === y ? previous : { x, y });
    }

    function clearTooltipIfLeavingBarangays(event: React.PointerEvent<SVGPathElement>) {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Element && nextTarget.closest('.doctor-map-barangay')) return;
        setHoveredBarangay(null);
        setTooltipPosition(null);
    }

    if (boundaries.length === 0) {
        return <MalvarMapPlaceholderContent />;
    }

    return (
        <div className="doctor-map-choropleth">
            <div className="doctor-map-stage">
                <svg
                    viewBox={`0 0 ${MALVAR_MAP_VIEWBOX.width} ${MALVAR_MAP_VIEWBOX.height}`}
                    className="doctor-malvar-map"
                    role="img"
                    aria-label={`Interactive Malvar barangay ${metricLabel.toLowerCase()} heatmap`}
                >
                    {boundaries.map((feature, index) => {
                        const barangay = feature.properties.adm4_en;
                        const key = normalizeBarangayKey(barangay);
                        const count = countsByKey.get(key) ?? 0;
                        const percent = safePercent(count, metricTotal);
                        const isSelected = normalizeBarangayKey(selectedBarangay) === key;
                        const mapStyle = {
                            '--doctor-map-base': BARANGAY_MAP_PALETTE[index % BARANGAY_MAP_PALETTE.length],
                        } as React.CSSProperties;
                        return (
                            <path
                                key={feature.id ?? barangay}
                                d={feature.path}
                                role="button"
                                tabIndex={0}
                                className={`doctor-map-barangay ${mapFillClass(count, maxCount)} ${isSelected ? 'is-selected' : ''}`}
                                style={mapStyle}
                                aria-label={`${barangay}: ${count.toLocaleString()} ${valueLabel}, ${percent}% of ${metricLabel.toLowerCase()}`}
                                onPointerEnter={(event) => {
                                    setHoveredBarangay(current => current === barangay ? current : barangay);
                                    updateTooltipPosition(event);
                                }}
                                onPointerMove={updateTooltipPosition}
                                onPointerLeave={clearTooltipIfLeavingBarangays}
                                onFocus={() => setHoveredBarangay(barangay)}
                                onBlur={() => {
                                    setHoveredBarangay(null);
                                    setTooltipPosition(null);
                                }}
                                onClick={() => onSelectBarangay(barangay)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onSelectBarangay(barangay);
                                    }
                                }}
                            />
                        );
                    })}
                </svg>
                {activeBarangay && (
                    <div className={`doctor-map-tooltip ${tooltipPosition ? 'is-floating' : ''}`} style={tooltipStyle} role="status" aria-live="polite">
                        <span>{activeBarangay}</span>
                        <strong className="tabular-nums">{activeCount.toLocaleString()}</strong>
                        <small className="tabular-nums">{activePercent}% of {metricLabel.toLowerCase()}</small>
                    </div>
                )}
                <div className="doctor-map-legend" aria-label="Map color legend">
                    <span>Low</span>
                    <i className="is-empty" />
                    <i className="is-low" />
                    <i className="is-medium" />
                    <i className="is-high" />
                    <i className="is-highest" />
                    <span>High</span>
                </div>
            </div>
        </div>
    );
}

function MalvarMapPlaceholderContent() {
    return (
        <div className="doctor-map-placeholder-body">
            <div className="doctor-map-frame" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
            </div>
            <div>
                <strong>Map boundary unavailable</strong>
                <p>A valid local Malvar barangay boundary file is required before the interactive map can be rendered.</p>
            </div>
        </div>
    );
}

function metricTotal(rows: AnalyticsRow[], metricKey: string, dimensionKey?: string): number {
    return rows.reduce((sum, row) => {
        if (row.metric_key !== metricKey) return sum;
        if (dimensionKey && normalizeBarangayKey(row.dimension_key) !== normalizeBarangayKey(dimensionKey)) return sum;
        return sum + (row.current_count ?? 0);
    }, 0);
}

function metricRows(rows: AnalyticsRow[], metricKey: string): AnalyticsRow[] {
    return rows.filter(row => row.metric_key === metricKey && (row.current_count ?? 0) > 0);
}

function DrilldownMetric({ label, value, note }: { label: string; value: number; note?: string }) {
    return (
        <div className="doctor-geo-detail-metric">
            <span>{label}</span>
            <strong className="tabular-nums">{value.toLocaleString()}</strong>
            {note && <small>{note}</small>}
        </div>
    );
}

function GeographicDrilldownPanel({
    barangay,
    rows,
    isLoading,
    error,
}: {
    barangay: string | null;
    rows: AnalyticsRow[];
    isLoading: boolean;
    error: string | null;
}) {
    if (!barangay) {
        return (
            <SectionPanel title="Barangay Aggregate Detail" subtitle="Select a barangay from the map or ranking list.">
                <EmptyState title="No barangay selected" description="Choose a barangay to review aggregate service activity." className="m-4" />
            </SectionPanel>
        );
    }

    if (isLoading && rows.length === 0) {
        return (
            <SectionPanel title="Barangay Aggregate Detail" subtitle={`Preparing aggregate metrics for ${barangay}.`}>
                <div className="doctor-geo-detail-skeleton" aria-hidden="true">
                    {[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-20 w-full" />)}
                    <Skeleton className="h-32 w-full" />
                </div>
            </SectionPanel>
        );
    }

    const registered = metricTotal(rows, 'barangay_registered_patients');
    const male = metricTotal(rows, 'barangay_sex_distribution', 'male');
    const female = metricTotal(rows, 'barangay_sex_distribution', 'female');
    const consultations = metricTotal(rows, 'barangay_consultations');
    const followUps = metricTotal(rows, 'barangay_follow_ups');
    const pendingFollowUps = metricTotal(rows, 'barangay_pending_follow_ups');
    const vaccinations = metricTotal(rows, 'barangay_vaccinations');
    const maternalCare = metricTotal(rows, 'barangay_maternal_care_records');
    const labRequests = metricTotal(rows, 'barangay_lab_requests');
    const prescriptions = metricTotal(rows, 'barangay_prescriptions');
    const ageRows = metricRows(rows, 'barangay_age_distribution');
    const topDiagnoses = metricRows(rows, 'barangay_top_diagnoses').slice(0, 5);
    const topComplaints = metricRows(rows, 'barangay_top_complaints').slice(0, 5);
    const suppressedDiagnoses = metricTotal(rows, 'barangay_suppressed_diagnoses');
    const suppressedComplaints = metricTotal(rows, 'barangay_suppressed_complaints');
    const maxAge = Math.max(...ageRows.map(row => row.current_count ?? 0), 1);
    const maxClinical = Math.max(...[...topDiagnoses, ...topComplaints].map(row => row.current_count ?? 0), 1);

    return (
        <SectionPanel title="Barangay Aggregate Detail" subtitle={`${barangay} aggregate-only drill-down for the selected period.`}>
            <div className="doctor-geo-detail-panel">
                {isLoading && <div className="doctor-geo-detail-updating" role="status">Updating</div>}
                {error && (
                    <div className="doctor-geo-detail-error" role="alert">
                        {error}
                    </div>
                )}
                <div className="doctor-geo-detail-metrics">
                    <DrilldownMetric label="Registered Patients" value={registered} note="active records" />
                    <DrilldownMetric label="Male" value={male} />
                    <DrilldownMetric label="Female" value={female} />
                    <DrilldownMetric label="Consultations" value={consultations} note="selected period" />
                    <DrilldownMetric label="Follow-ups" value={followUps} note={`${pendingFollowUps.toLocaleString()} pending`} />
                    <DrilldownMetric label="Vaccinations" value={vaccinations} note="records counted" />
                    <DrilldownMetric label="Maternal Care" value={maternalCare} note="records" />
                    <DrilldownMetric label="Lab Requests" value={labRequests} />
                    <DrilldownMetric label="Prescriptions" value={prescriptions} />
                </div>

                <div className="doctor-geo-detail-grid">
                    <div className="doctor-geo-detail-card">
                        <div className="doctor-geo-detail-card-title">Age-group Distribution</div>
                        {ageRows.length === 0 ? (
                            <p className="doctor-geo-detail-empty">No age-group aggregate data for this barangay.</p>
                        ) : (
                            <div className="doctor-geo-bars">
                                {ageRows.map(row => {
                                    const value = row.current_count ?? 0;
                                    return (
                                        <div className="doctor-geo-bar-row" key={row.dimension_key ?? 'unknown'}>
                                            <span>{titleCase(row.dimension_key)}</span>
                                            <i><b style={{ width: `${Math.max((value / maxAge) * 100, value ? 6 : 0)}%` }} /></i>
                                            <strong className="tabular-nums">{value.toLocaleString()}</strong>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="doctor-geo-detail-card">
                        <div className="doctor-geo-detail-card-title">Privacy-safe Clinical Signals</div>
                        <ClinicalSignalList title="Top Diagnoses" rows={topDiagnoses} maxValue={maxClinical} suppressedCount={suppressedDiagnoses} />
                        <ClinicalSignalList title="Top Complaints" rows={topComplaints} maxValue={maxClinical} suppressedCount={suppressedComplaints} />
                    </div>
                </div>
            </div>
        </SectionPanel>
    );
}

function ClinicalSignalList({ title, rows, maxValue, suppressedCount }: { title: string; rows: AnalyticsRow[]; maxValue: number; suppressedCount: number }) {
    return (
        <div className="doctor-geo-clinical-list">
            <div className="doctor-geo-clinical-heading">{title}</div>
            {rows.length === 0 ? (
                <p className="doctor-geo-detail-empty">No privacy-safe aggregate rows to show.</p>
            ) : (
                rows.map(row => {
                    const value = row.current_count ?? 0;
                    return (
                        <div className="doctor-geo-bar-row" key={`${row.metric_key}-${row.dimension_key}`}>
                            <span title={titleCase(row.dimension_key)}>{titleCase(row.dimension_key)}</span>
                            <i><b style={{ width: `${Math.max((value / maxValue) * 100, value ? 6 : 0)}%` }} /></i>
                            <strong className="tabular-nums">{value.toLocaleString()}</strong>
                        </div>
                    );
                })
            )}
            {suppressedCount > 0 && (
                <small className="doctor-geo-suppression-note">{suppressedCount.toLocaleString()} low-count categor{suppressedCount === 1 ? 'y' : 'ies'} suppressed.</small>
            )}
        </div>
    );
}

function GeographicInsightsSection({
    rows,
    heatmapRows,
    selectedHeatmapMetric,
    onSelectHeatmapMetric,
    drilldownRows,
    isDrilldownLoading,
    drilldownError,
    selectedBarangay,
    onSelectBarangay,
}: {
    rows: AnalyticsRow[];
    heatmapRows: BarangayHeatmapRow[];
    selectedHeatmapMetric: BarangayHeatmapMetric;
    onSelectHeatmapMetric: (metric: BarangayHeatmapMetric) => void;
    drilldownRows: AnalyticsRow[];
    isDrilldownLoading: boolean;
    drilldownError: string | null;
    selectedBarangay: string | null;
    onSelectBarangay: (barangay: string) => void;
}) {
    const selectedMetric = BARANGAY_HEATMAP_METRICS.find(metric => metric.key === selectedHeatmapMetric) ?? BARANGAY_HEATMAP_METRICS[0];
    const coverageDistribution = rows
        .filter(row => row.dimension_key && row.dimension_key !== 'Unspecified' && row.dimension_key !== 'Outside Malvar')
        .map(row => ({ label: titleCase(row.dimension_key), value: row.current_count ?? 0 }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
    const metricDistribution = heatmapRows
        .filter(row => row.barangay)
        .map(row => ({ label: titleCase(row.barangay), value: row[selectedMetric.field] ?? 0 }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
    const distribution = metricDistribution.length > 0 ? metricDistribution : coverageDistribution;
    const topRows = distribution.slice(0, 8);
    const metricTotal = distribution.reduce((sum, row) => sum + row.value, 0);
    const recognizedPatients = coverageDistribution.reduce((sum, row) => sum + row.value, 0);
    const unspecified = sumCurrent(rows, row => row.dimension_key === 'Unspecified');
    const outside = sumCurrent(rows, row => row.dimension_key === 'Outside Malvar');
    const totalActivePatients = recognizedPatients + unspecified + outside;
    const mappedCoverageRate = safePercent(recognizedPatients, totalActivePatients);
    const countsByBarangayKey = useMemo(() => {
        const counts = new Map<string, number>();
        for (const row of distribution) {
            const key = normalizeBarangayKey(row.label);
            if (!key) continue;
            counts.set(key, (counts.get(key) ?? 0) + row.value);
        }
        return counts;
    }, [distribution]);
    const maxValue = Math.max(...topRows.map(row => row.value), 1);
    const selected = selectedBarangay
        ? distribution.find(row => normalizeBarangayKey(row.label) === normalizeBarangayKey(selectedBarangay))
            ?? { label: selectedBarangay, value: countsByBarangayKey.get(normalizeBarangayKey(selectedBarangay)) ?? 0 }
        : topRows[0] ?? null;
    const coverageStyle = { '--doctor-coverage-rate': `${mappedCoverageRate}%` } as React.CSSProperties;

    return (
        <section aria-label="Geographic insights" className="doctor-analytics-section">
            <SectionHeading title="Geographic Insights" subtitle="All registered active patient reach by stored barangay." />
            <div className="doctor-geographic-command">
                <div className="doctor-geographic-panel doctor-geographic-ranking-panel">
                    <div className="doctor-geographic-panel-heading">
                        <div>
                            <h3>{selectedMetric.label} by Barangay</h3>
                            <p>Selected metric ranking</p>
                        </div>
                    </div>
                    {topRows.length === 0 ? (
                        <EmptyState title="No barangay heatmap data" description="No barangay metric rows were returned for this period." className="m-4" />
                    ) : (
                        <div className="doctor-barangay-chart">
                            <ol className="doctor-barangay-list">
                                {topRows.map((row, index) => {
                                    const percent = safePercent(row.value, metricTotal);
                                    const isSelected = selected?.label === row.label;
                                    return (
                                        <li key={row.label}>
                                            <button
                                                type="button"
                                                className={`doctor-barangay-row ${isSelected ? 'is-selected' : ''}`}
                                                onClick={() => onSelectBarangay(row.label)}
                                                aria-pressed={isSelected}
                                            >
                                                <span className="doctor-ranking-index tabular-nums">{index + 1}</span>
                                                <span className="doctor-barangay-main">
                                                    <span className="doctor-barangay-meta">
                                                        <span className="doctor-barangay-label" title={row.label}>{row.label}</span>
                                                        <strong className="tabular-nums">{row.value.toLocaleString()}</strong>
                                                    </span>
                                                    <span className="doctor-barangay-track" aria-hidden="true">
                                                        <span style={{ width: `${row.value ? Math.max((row.value / maxValue) * 100, 6) : 0}%` }} />
                                                    </span>
                                                </span>
                                                <span className="doctor-barangay-percent tabular-nums">{percent}%</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    )}
                </div>

                <div className="doctor-geographic-panel doctor-geographic-map-panel">
                    <div className="doctor-geographic-panel-heading">
                        <div>
                            <h3>Malvar Barangay Map</h3>
                            <p>Selected metric distribution across Malvar barangays</p>
                        </div>
                    </div>
                    <div className="doctor-map-placeholder">
                        <div className="doctor-map-metric-selector" role="group" aria-label="Barangay heatmap metric">
                            {BARANGAY_HEATMAP_METRICS.map(metric => (
                                <button
                                    key={metric.key}
                                    type="button"
                                    className={metric.key === selectedHeatmapMetric ? 'is-active' : ''}
                                    aria-pressed={metric.key === selectedHeatmapMetric}
                                    onClick={() => onSelectHeatmapMetric(metric.key)}
                                >
                                    {metric.label}
                                </button>
                            ))}
                        </div>
                        <MalvarBarangayMap
                            boundaries={PROJECTED_MALVAR_BARANGAYS}
                            countsByKey={countsByBarangayKey}
                            metricTotal={metricTotal}
                            metricLabel={selectedMetric.label}
                            valueLabel={selectedMetric.valueLabel}
                            selectedBarangay={selectedBarangay}
                            onSelectBarangay={onSelectBarangay}
                        />
                    </div>
                </div>

                <div className="doctor-geographic-panel doctor-geographic-summary-panel">
                    <div className="doctor-geographic-panel-heading">
                        <div>
                            <h3>Geographic Summary</h3>
                            <p>Coverage and selected barangay</p>
                        </div>
                    </div>
                    {selected && (
                        <div className="doctor-barangay-selection" aria-live="polite">
                            <span>Selected barangay</span>
                            <strong>{selected.label}</strong>
                            <div>
                                <span><b className="tabular-nums">{selected.value.toLocaleString()}</b> {selectedMetric.valueLabel}</span>
                                <span><b className="tabular-nums">{safePercent(selected.value, metricTotal)}%</b> of {selectedMetric.label.toLowerCase()}</span>
                            </div>
                        </div>
                    )}
                    <div className="doctor-coverage-summary">
                        <div className="doctor-coverage-rate-card">
                            <div className="doctor-coverage-ring" style={coverageStyle} role="img" aria-label={`${mappedCoverageRate}% mapped coverage rate`}>
                                <div>
                                    <strong className="tabular-nums">{mappedCoverageRate}%</strong>
                                    <span>Mapped</span>
                                </div>
                            </div>
                            <div className="doctor-coverage-rate-copy">
                                <span>Mapped Coverage Rate</span>
                                <strong className="tabular-nums">{recognizedPatients.toLocaleString()} / {totalActivePatients.toLocaleString()}</strong>
                                <small>recognized barangay patients of total active registered patients</small>
                            </div>
                        </div>
                        <div className="doctor-coverage-metric-grid">
                            <div className="doctor-coverage-metric">
                                <span>Barangays Represented</span>
                                <strong className="tabular-nums">{coverageDistribution.filter(row => row.value > 0).length.toLocaleString()}</strong>
                            </div>
                            <div className="doctor-coverage-metric">
                                <span>Recognized Barangay Data</span>
                                <strong className="tabular-nums">{recognizedPatients.toLocaleString()}</strong>
                            </div>
                            <div className="doctor-coverage-metric">
                                <span>Unspecified Locations</span>
                                <strong className="tabular-nums">{unspecified.toLocaleString()}</strong>
                            </div>
                            <div className="doctor-coverage-metric">
                                <span>Outside Malvar</span>
                                <strong className="tabular-nums">{outside.toLocaleString()}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="doctor-geographic-detail-wrap">
                <GeographicDrilldownPanel barangay={selected?.label ?? selectedBarangay} rows={drilldownRows} isLoading={isDrilldownLoading} error={drilldownError} />
            </div>
        </section>
    );
}

function buildStatusRows(rows: AnalyticsRow[]) {
    const grouped = rows.reduce<Record<string, number>>((acc, row) => {
        if (!row.dimension_key) return acc;
        acc[row.dimension_key] = (acc[row.dimension_key] ?? 0) + (row.current_count ?? 0);
        return acc;
    }, {});
    const visibleRows = Object.entries(grouped)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
    const total = visibleRows.reduce((sum, row) => sum + row.count, 0);

    return { visibleRows, total };
}

function summarizeWorkloadStatus(rows: AnalyticsRow[], variant: WorkloadChartVariant) {
    const { visibleRows, total } = buildStatusRows(rows);
    const completedPatterns = variant === 'prescription' ? ['dispensed', 'completed', 'complete'] : ['completed', 'complete', 'done'];
    const pendingPatterns = ['pending', 'open', 'scheduled', 'requested'];
    const completed = visibleRows.reduce((sum, row) => {
        const key = row.label.toLowerCase();
        return statusMatches(key, completedPatterns) ? sum + row.count : sum;
    }, 0);
    const pending = visibleRows.reduce((sum, row) => {
        const key = row.label.toLowerCase();
        return statusMatches(key, pendingPatterns) ? sum + row.count : sum;
    }, 0);
    const other = Math.max(total - completed - pending, 0);
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;

    return { visibleRows, total, completed, pending, other, completedPercent, pendingPercent };
}

function PrescriptionStatusChart({ pending, dispensed }: { pending: number; dispensed: number }) {
    const total = pending + dispensed;
    if (total === 0) {
        return <EmptyState title="No prescription status" description="No prescription status counts were returned for this period." className="m-4" />;
    }

    const dispensedPercent = safePercent(dispensed, total);
    const pendingPercent = safePercent(pending, total);
    const donutStyle = {
        '--doctor-donut-primary': `${dispensedPercent}%`,
        '--doctor-donut-secondary': `${dispensedPercent + pendingPercent}%`,
    } as React.CSSProperties;

    return (
        <div className="doctor-prescription-chart">
            <div className="doctor-donut-chart is-prescription" style={donutStyle} role="img" aria-label={`${total.toLocaleString()} prescriptions, ${dispensed.toLocaleString()} dispensed and ${pending.toLocaleString()} pending`}>
                <div>
                    <strong className="tabular-nums">{total.toLocaleString()}</strong>
                    <span>Total</span>
                </div>
            </div>
            <div className="doctor-chart-legend">
                <div className="doctor-status-chip-row is-completed">
                    <span>Dispensed</span>
                    <strong className="tabular-nums">{dispensed.toLocaleString()}</strong>
                    <small className="tabular-nums">{dispensedPercent}%</small>
                </div>
                <div className="doctor-status-chip-row is-pending">
                    <span>Pending</span>
                    <strong className="tabular-nums">{pending.toLocaleString()}</strong>
                    <small className="tabular-nums">{pendingPercent}%</small>
                </div>
            </div>
        </div>
    );
}

function FollowUpGauge({ rows }: { rows: AnalyticsRow[] }) {
    const { visibleRows, total, completed, pending } = summarizeWorkloadStatus(rows, 'followup');
    if (visibleRows.length === 0 || total === 0) {
        return <EmptyState title="No follow-ups yet" description="No follow-up activity was returned for this period." className="m-4" />;
    }

    const completedPercent = safePercent(completed, total);
    const gaugeStyle = { '--doctor-gauge-angle': `${completedPercent * 1.8}deg` } as React.CSSProperties;

    return (
        <div className="doctor-gauge-chart">
            <div className="doctor-gauge-arc" style={gaugeStyle} role="img" aria-label={`${completedPercent}% follow-up completion`}>
                <div>
                    <strong className="tabular-nums">{completedPercent}%</strong>
                    <span>Completed</span>
                </div>
            </div>
            <div className="doctor-gauge-counts">
                <span><strong className="tabular-nums">{completed.toLocaleString()}</strong> completed</span>
                <span><strong className="tabular-nums">{pending.toLocaleString()}</strong> pending</span>
            </div>
        </div>
    );
}

function LabStatusChart({ rows, emptyTitle }: { rows: AnalyticsRow[]; emptyTitle: string }) {
    const { visibleRows, total, completed, pending, completedPercent, pendingPercent } = summarizeWorkloadStatus(rows, 'lab');

    if (visibleRows.length === 0) {
        return <EmptyState title={emptyTitle} description="No status aggregates were returned for this period." className="m-4" />;
    }

    return (
        <div className="doctor-lab-status-chart">
            <div className="doctor-workload-summary doctor-lab-summary">
                <div className="doctor-lab-total">
                    <span>Total Requests</span>
                    <strong className="tabular-nums">{total.toLocaleString()}</strong>
                    <small>{pending.toLocaleString()} pending</small>
                </div>
                <div className="doctor-lab-key-metric">
                    <span>Completed</span>
                    <strong className="tabular-nums">{completedPercent}%</strong>
                </div>
            </div>
            <div className="doctor-lab-segmented-bar" aria-hidden="true">
                <span className="is-pending" style={{ width: `${Math.max(pendingPercent, pending ? 4 : 0)}%` }} />
                <span className="is-completed" style={{ width: `${Math.max(completedPercent, completed ? 4 : 0)}%` }} />
            </div>
            <div className="doctor-lab-status-list">
                {[
                    { label: 'Pending', count: pending, percent: pendingPercent },
                    { label: 'Completed', count: completed, percent: completedPercent },
                ].map(row => (
                    <div className="doctor-lab-status-row" key={row.label}>
                        <span>{row.label}</span>
                        <div>
                            <strong className="tabular-nums">{row.count.toLocaleString()}</strong>
                            <small className="tabular-nums">{row.percent}%</small>
                        </div>
                    </div>
                ))}
            </div>
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
            <table className="clinical-table doctor-analytics-detail-table min-w-[760px]">
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
            <table className="clinical-table doctor-analytics-detail-table min-w-[760px]">
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
    const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null);
    const [selectedHeatmapMetric, setSelectedHeatmapMetric] = useState<BarangayHeatmapMetric>('registered');
    const defaultCustomPeriod = useMemo(() => getPresetPeriod('month'), []);
    const [customFrom, setCustomFrom] = useState(defaultCustomPeriod.from);
    const [customTo, setCustomTo] = useState(isoDate(addDays(parseLocalDate(defaultCustomPeriod.toExclusive) ?? new Date(), -1)));
    const [data, setData] = useState<DoctorAnalyticsData | null>(null);
    const [barangayDrilldown, setBarangayDrilldown] = useState<AnalyticsRow[]>([]);
    const [isBarangayDrilldownLoading, setIsBarangayDrilldownLoading] = useState(false);
    const [drilldownError, setDrilldownError] = useState<string | null>(null);
    const lastDrilldownRequestKey = useRef<string | null>(null);
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

    useEffect(() => {
        if (!data || selectedBarangay) return;
        const firstBarangay = data.barangayDistribution
            .filter(row => row.dimension_key && row.dimension_key !== 'Unspecified' && row.dimension_key !== 'Outside Malvar' && (row.current_count ?? 0) > 0)
            .sort((a, b) => (b.current_count ?? 0) - (a.current_count ?? 0) || titleCase(a.dimension_key).localeCompare(titleCase(b.dimension_key)))[0];
        if (firstBarangay?.dimension_key) {
            setSelectedBarangay(titleCase(firstBarangay.dimension_key));
        }
    }, [data, selectedBarangay]);

    useEffect(() => {
        if (!selectedBarangay || !displayPeriod) return;
        let isCurrent = true;
        const requestKey = `${normalizeBarangayKey(selectedBarangay)}|${displayPeriod.from}|${displayPeriod.toExclusive}`;
        if (lastDrilldownRequestKey.current === requestKey) return;
        lastDrilldownRequestKey.current = requestKey;

        async function loadBarangayDrilldown() {
            setIsBarangayDrilldownLoading(true);
            setDrilldownError(null);
            try {
                const result = await fetchBarangayDrilldown(selectedBarangay, displayPeriod);
                if (isCurrent) setBarangayDrilldown(result);
            } catch (err) {
                logError('Failed to load barangay drill-down analytics', err);
                if (isCurrent) {
                    setDrilldownError(err instanceof Error && err.message === 'permission_denied'
                        ? 'Barangay drill-down is limited to authorized Doctor accounts.'
                        : 'Unable to load barangay drill-down. Please try again.');
                }
            } finally {
                if (isCurrent) setIsBarangayDrilldownLoading(false);
            }
        }

        void loadBarangayDrilldown();

        return () => {
            isCurrent = false;
        };
    }, [displayPeriod, selectedBarangay]);

    const overview = useMemo(() => {
        if (!data) return null;
        const pendingItems = [
            { label: 'Follow-ups', value: sumCurrent(data.followUpCurrentWorkload, row => row.dimension_key === 'pending'), note: 'Scheduled care' },
            { label: 'Laboratory', value: sumCurrent(data.labCurrentWorkload, row => row.dimension_key === 'pending'), note: 'Requests pending' },
            { label: 'Prescriptions', value: sumCurrent(data.prescriptionCurrentWorkload, row => row.dimension_key === 'pending'), note: 'Awaiting completion' },
        ];
        const consultationCurrent = sumCurrent(data.consultationVolume);
        const consultationPrevious = sumPrevious(data.consultationVolume);
        const topConcern = [...data.diagnoses, ...data.complaints]
            .sort((a, b) => (b.current_count ?? 0) - (a.current_count ?? 0))[0] ?? null;
        const attentionArea = pendingItems.reduce((current, item) => item.value > current.value ? item : current, pendingItems[0]);

        return {
            consultations: consultationCurrent,
            consultationPrevious,
            consultationDelta: formatDelta(consultationCurrent, consultationPrevious),
            consultationTone: deltaTone(consultationCurrent, consultationPrevious),
            pendingItems,
            totalPending: pendingItems.reduce((sum, item) => sum + item.value, 0),
            followUpsPending: pendingItems[0].value,
            labPending: pendingItems[1].value,
            prescriptionsPending: pendingItems[2].value,
            topConcernLabel: titleCase(topConcern?.dimension_key ?? null),
            topConcernCount: topConcern?.current_count ?? 0,
            attentionArea,
        };
    }, [data]);

    const workloadCounts = useMemo(() => {
        if (!data) return [];
        return [
            { label: 'Consultations', value: sumCurrent(data.consultationVolume) },
            { label: 'Follow-ups', value: sumCurrent(data.followUpActivity) },
            { label: 'Laboratory', value: sumCurrent(data.labCurrentWorkload) },
            { label: 'Prescriptions', value: sumCurrent(data.prescriptionCurrentWorkload) },
        ];
    }, [data]);

    const prescriptionStatus = useMemo(() => {
        if (!data) return { pending: 0, dispensed: 0 };
        return {
            pending: sumCurrent(data.prescriptionCurrentWorkload, row => row.dimension_key === 'pending'),
            dispensed: sumCurrent(data.prescriptionDispensed),
        };
    }, [data]);

    return (
        <div className="pwa-page-pad doctor-analytics-dashboard">
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
                <div className="doctor-analytics-controls">
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
                </div>
                {preset === 'custom' && (
                    <div className="doctor-custom-period">
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
                <section aria-label="Top analytics summary" className="doctor-kpi-strip">
                    <MetricCard
                        label="Consultations Completed"
                        value={overview.consultations}
                        note="Selected period"
                        comparison={overview.consultationDelta}
                        tone={overview.consultationTone}
                    />
                    <MetricCard label="Pending Follow-ups" value={overview.followUpsPending} note="Current active workload" />
                    <MetricCard label="Pending Labs" value={overview.labPending} note="Current active workload" />
                    <MetricCard label="Pending Prescriptions" value={overview.prescriptionsPending} note="Current active workload" />
                </section>

                <section aria-label="Primary analytics insights" className="doctor-analytics-section">
                    <SectionHeading title="Primary Insight" subtitle="Service activity and current workload at a glance." />
                    <div className="doctor-primary-grid">
                        <div className="doctor-primary-chart">
                            <SectionPanel title="Service Trend" subtitle="Consultations over time, compared with the previous equal period." className="doctor-trend-panel">
                                <ServiceTrendChart rows={data.consultationVolume} bucket={displayPeriod.bucket} />
                            </SectionPanel>
                        </div>
                        <div className="doctor-primary-side">
                            <SectionPanel title="Pending Work" subtitle="Open items requiring action.">
                                <div className="doctor-pending-list">
                                    {overview.pendingItems.map(item => (
                                        <SummaryRow key={item.label} label={item.label} value={item.value} note={item.note} />
                                    ))}
                                </div>
                            </SectionPanel>
                            <SectionPanel title="Current Signals" subtitle="Most visible concern and backlog.">
                                <div className="doctor-signal-stack">
                                    <div className="doctor-signal-card">
                                        <span>Most Frequent Concern</span>
                                        <strong>{overview.topConcernLabel}</strong>
                                        <small className="tabular-nums">{overview.topConcernCount.toLocaleString()} record{overview.topConcernCount !== 1 ? 's' : ''}</small>
                                    </div>
                                    <div className="doctor-signal-card">
                                        <span>Needs Attention</span>
                                        <strong>{overview.attentionArea.label}</strong>
                                        <small className="tabular-nums">{overview.attentionArea.value.toLocaleString()} pending</small>
                                    </div>
                                </div>
                            </SectionPanel>
                        </div>
                    </div>
                </section>

                <section aria-label="Operational workload" className="doctor-analytics-section">
                    <SectionHeading title="Operational Workload" subtitle="Follow-up, laboratory, and prescription status mixes that may need coordination." />
                    <div className="doctor-operational-grid">
                        <SectionPanel title="Service Workload Distribution" subtitle="Raw current counts across service areas.">
                            <WorkloadRadarChart counts={workloadCounts} />
                        </SectionPanel>
                        <SectionPanel title="Follow-up Completion" subtitle="Return-visit status for the selected period.">
                            <FollowUpGauge rows={data.followUpActivity} />
                        </SectionPanel>
                        <SectionPanel title="Lab Request Status" subtitle="Laboratory request status mix.">
                            <LabStatusChart rows={[...data.labCurrentWorkload, ...data.labActivity]} emptyTitle="No lab status" />
                        </SectionPanel>
                        <SectionPanel title="Prescription Status" subtitle="Prescribing and dispensing status mix.">
                            <PrescriptionStatusChart pending={prescriptionStatus.pending} dispensed={prescriptionStatus.dispensed} />
                        </SectionPanel>
                    </div>
                </section>

                <section aria-label="Clinical insights" className="doctor-analytics-section">
                    <SectionHeading title="Clinical Insights" subtitle="The most common free-text diagnoses and complaints in this period." />
                    <div className="doctor-clinical-grid">
                        <SectionPanel title="Top Diagnoses" subtitle="Most frequently recorded diagnosis text.">
                            <RankingList rows={data.diagnoses} emptyTitle="No diagnosis aggregates" />
                        </SectionPanel>
                        <SectionPanel title="Top Complaints" subtitle="Most frequently recorded complaint text.">
                            <RankingList rows={data.complaints} emptyTitle="No complaint aggregates" />
                        </SectionPanel>
                    </div>
                </section>

                <GeographicInsightsSection
                    rows={data.barangayDistribution}
                    heatmapRows={data.barangayHeatmap}
                    selectedHeatmapMetric={selectedHeatmapMetric}
                    onSelectHeatmapMetric={setSelectedHeatmapMetric}
                    drilldownRows={barangayDrilldown}
                    isDrilldownLoading={isBarangayDrilldownLoading}
                    drilldownError={drilldownError}
                    selectedBarangay={selectedBarangay}
                    onSelectBarangay={setSelectedBarangay}
                />

                <AnalyticsNoteCard />

                <section aria-label="Detailed records" className="doctor-analytics-section">
                    <SectionHeading title="Detailed Records" subtitle="Secondary aggregate tables for drill-down review." />
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
                        <div className="doctor-detail-panel" role="tabpanel">
                            {detailTab === 'clinical' && (
                                <div className="ops-grid">
                                    <div className="col-span-12 lg:col-span-6">
                                        <h3 className="doctor-detail-heading">Recorded Diagnoses</h3>
                                        <FrequencyTable rows={data.diagnoses} emptyTitle="No diagnosis aggregates" />
                                    </div>
                                    <div className="col-span-12 lg:col-span-6">
                                        <h3 className="doctor-detail-heading">Recorded Complaints</h3>
                                        <FrequencyTable rows={data.complaints} emptyTitle="No complaint aggregates" />
                                    </div>
                                </div>
                            )}
                            {detailTab === 'laboratory' && <AggregateTable rows={[...data.labCurrentWorkload, ...data.labActivity]} emptyTitle="No lab activity" />}
                            {detailTab === 'prescriptions' && <AggregateTable rows={[...data.prescriptionCurrentWorkload, ...data.prescriptionPrescribed, ...data.prescriptionDispensed]} emptyTitle="No prescription activity" />}
                        </div>
                    </SectionPanel>
                </section>
            </div>
            )}
        </div>
    );
}
