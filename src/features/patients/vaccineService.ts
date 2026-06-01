import { supabase } from '../../lib/supabase/client';
import type { VaccineRecord } from './itemization';

export async function saveVaccineRecord(patientId: string, record: VaccineRecord): Promise<void> {
    const now = new Date().toISOString().substring(0, 7);

    const { data: existingLog } = await supabase
        .from('fhsis_logs')
        .select('id, data_fields')
        .eq('patient_id', patientId)
        .eq('category', 'vaccination')
        .maybeSingle();

    if (existingLog) {
        const currentFields = (existingLog.data_fields || {}) as Record<string, unknown>;
        const existingRecords = Array.isArray(currentFields.vaccine_records)
            ? currentFields.vaccine_records as VaccineRecord[]
            : [];

        const updatedFields = {
            ...currentFields,
            vaccine_records: [...existingRecords, record],
        };

        const { error } = await supabase
            .from('fhsis_logs')
            .update({ data_fields: updatedFields })
            .eq('id', existingLog.id);

        if (error) throw error;
    } else {
        const { data: user } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('fhsis_logs')
            .insert([{
                patient_id: patientId,
                category: 'vaccination',
                data_fields: { vaccine_records: [record] },
                report_month: now,
                encoded_by: user?.user?.id || null,
            }]);

        if (error) throw error;
    }
}

export async function fetchVaccineRecords(patientId: string): Promise<VaccineRecord[]> {
    const { data, error } = await supabase
        .from('fhsis_logs')
        .select('data_fields')
        .eq('patient_id', patientId)
        .eq('category', 'vaccination')
        .maybeSingle();

    if (error || !data) return [];

    const fields = data.data_fields as Record<string, unknown> | null;
    if (!fields) return [];

    const records = Array.isArray(fields.vaccine_records)
        ? fields.vaccine_records as VaccineRecord[]
        : [];

    return records.filter(r => r && typeof r.vaccine_name === 'string' && r.vaccine_name.trim());
}

export async function removeVaccineRecord(patientId: string, index: number): Promise<void> {
    const { data: existingLog } = await supabase
        .from('fhsis_logs')
        .select('id, data_fields')
        .eq('patient_id', patientId)
        .eq('category', 'vaccination')
        .maybeSingle();

    if (!existingLog) return;

    const currentFields = (existingLog.data_fields || {}) as Record<string, unknown>;
    const existingRecords = Array.isArray(currentFields.vaccine_records)
        ? currentFields.vaccine_records as VaccineRecord[]
        : [];

    const updatedRecords = existingRecords.filter((_, i) => i !== index);

    const { error } = await supabase
        .from('fhsis_logs')
        .update({
            data_fields: {
                ...currentFields,
                vaccine_records: updatedRecords,
            },
        })
        .eq('id', existingLog.id);

    if (error) throw error;
}
