import { supabase } from '../../lib/supabase/client';

export type AnalyticsBucket = 'day' | 'week' | 'month';

export interface AnalyticsPeriod {
    from: string;
    toExclusive: string;
    bucket: AnalyticsBucket;
}

export interface AnalyticsRow {
    metric_key: string;
    bucket_start: string | null;
    dimension_key: string | null;
    current_count: number | null;
    previous_count: number | null;
    reliability: string | null;
    excluded_invalid_date_count: number | null;
    fallback_date_count: number | null;
    unknown_status_count: number | null;
    blank_group_count: number | null;
}

export interface DoctorAnalyticsData {
    consultationVolume: AnalyticsRow[];
    followUpActivity: AnalyticsRow[];
    followUpCurrentWorkload: AnalyticsRow[];
    diagnoses: AnalyticsRow[];
    complaints: AnalyticsRow[];
    labActivity: AnalyticsRow[];
    labCurrentWorkload: AnalyticsRow[];
    prescriptionPrescribed: AnalyticsRow[];
    prescriptionDispensed: AnalyticsRow[];
    prescriptionCurrentWorkload: AnalyticsRow[];
    dataQuality: AnalyticsRow[];
}

type RpcResult = {
    data: AnalyticsRow[] | null;
    error: { message?: string; code?: string } | null;
};

async function callAnalyticsRpc(functionName: string, args?: Record<string, string | number>): Promise<AnalyticsRow[]> {
    const client = supabase as unknown as {
        rpc: (name: string, args?: Record<string, string | number>) => Promise<RpcResult>;
    };
    const { data, error } = await client.rpc(functionName, args);

    if (error) {
        throw new Error(error.code === '42501' ? 'permission_denied' : 'analytics_unavailable');
    }

    return data ?? [];
}

export async function fetchDoctorAnalytics(period: AnalyticsPeriod): Promise<DoctorAnalyticsData> {
    const sharedPeriod = {
        p_from: period.from,
        p_to_exclusive: period.toExclusive,
        p_bucket: period.bucket,
    };

    const [
        consultationVolume,
        followUpActivity,
        followUpCurrentWorkload,
        diagnoses,
        complaints,
        labActivity,
        labCurrentWorkload,
        prescriptionPrescribed,
        prescriptionDispensed,
        prescriptionCurrentWorkload,
        dataQuality,
    ] = await Promise.all([
        callAnalyticsRpc('analytics_consultation_volume', sharedPeriod),
        callAnalyticsRpc('analytics_follow_up_activity', { ...sharedPeriod, p_scope: 'historical' }),
        callAnalyticsRpc('analytics_follow_up_activity', { ...sharedPeriod, p_scope: 'current_active_workload' }),
        callAnalyticsRpc('analytics_clinical_text_frequency', {
            p_from: period.from,
            p_to_exclusive: period.toExclusive,
            p_text_kind: 'diagnosis',
            p_source: 'all',
            p_limit: 10,
        }),
        callAnalyticsRpc('analytics_clinical_text_frequency', {
            p_from: period.from,
            p_to_exclusive: period.toExclusive,
            p_text_kind: 'complaint',
            p_source: 'all',
            p_limit: 10,
        }),
        callAnalyticsRpc('analytics_lab_activity', { ...sharedPeriod, p_scope: 'historical' }),
        callAnalyticsRpc('analytics_lab_activity', { ...sharedPeriod, p_scope: 'current_active_workload' }),
        callAnalyticsRpc('analytics_prescription_activity', {
            ...sharedPeriod,
            p_date_mode: 'prescribed',
            p_scope: 'historical',
        }),
        callAnalyticsRpc('analytics_prescription_activity', {
            ...sharedPeriod,
            p_date_mode: 'dispensed',
            p_scope: 'historical',
        }),
        callAnalyticsRpc('analytics_prescription_activity', {
            ...sharedPeriod,
            p_date_mode: 'prescribed',
            p_scope: 'current_active_workload',
        }),
        callAnalyticsRpc('analytics_data_quality', {
            p_from: period.from,
            p_to_exclusive: period.toExclusive,
        }),
    ]);

    return {
        consultationVolume,
        followUpActivity,
        followUpCurrentWorkload,
        diagnoses,
        complaints,
        labActivity,
        labCurrentWorkload,
        prescriptionPrescribed,
        prescriptionDispensed,
        prescriptionCurrentWorkload,
        dataQuality,
    };
}
