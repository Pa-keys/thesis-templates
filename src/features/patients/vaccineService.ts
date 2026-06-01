import { supabase } from '../../lib/supabase/client';
import { cleanVaccineRecord, type VaccineRecord } from '../vaccines/vaccineOptions';
import { normalizeVaccineRecords } from './itemization';

interface VaccinationLog {
    id: number | string;
    data_fields: Record<string, unknown> | null;
}

async function getVaccinationLog(patientId: string): Promise<VaccinationLog | null> {
    const { data, error } = await supabase
        .from('fhsis_logs')
        .select('id, data_fields')
        .eq('patient_id', patientId)
        .eq('category', 'vaccination')
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
        id: data.id as number | string,
        data_fields: (data.data_fields || {}) as Record<string, unknown>,
    };
}

export async function saveVaccineRecord(patientId: string, record: VaccineRecord): Promise<void> {
    const now = new Date().toISOString().substring(0, 7);
    const cleanRecord = cleanVaccineRecord(record);

    const existingLog = await getVaccinationLog(patientId);

    if (existingLog) {
        const currentFields = (existingLog.data_fields || {}) as Record<string, unknown>;
        const existingRecords = normalizeVaccineRecords(currentFields);
        const existingIndex = existingRecords.findIndex(item => item.id === cleanRecord.id);
        const vaccineRecords = existingIndex >= 0
            ? existingRecords.map(item => item.id === cleanRecord.id ? cleanRecord : item)
            : [...existingRecords, cleanRecord];

        const updatedFields = {
            ...currentFields,
            vaccine_records: vaccineRecords,
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
                data_fields: { vaccine_records: [cleanRecord] },
                report_month: now,
                encoded_by: user?.user?.id || null,
            }]);

        if (error) throw error;
    }
}

export async function fetchVaccineRecords(patientId: string): Promise<VaccineRecord[]> {
    const existingLog = await getVaccinationLog(patientId);

    if (!existingLog) return [];

    const fields = existingLog.data_fields;
    if (!fields) return [];

    return normalizeVaccineRecords(fields);
}

export async function removeVaccineRecord(patientId: string, vaccineId: string): Promise<void> {
    const existingLog = await getVaccinationLog(patientId);

    if (!existingLog) return;

    const currentFields = (existingLog.data_fields || {}) as Record<string, unknown>;
    const existingRecords = normalizeVaccineRecords(currentFields);

    const updatedRecords = existingRecords.filter(record => record.id !== vaccineId);

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
