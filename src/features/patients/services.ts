import { supabase } from '../../lib/supabase/client';
import type { PatientRegistrationPayload } from '../../types/patient';

export interface PatientConsentPayload {
    patient_id: string;
    consent_signer: boolean;
    consent_signature?: string | null;
    consent_personnel: string;
    consent_personnel_signature?: string | null;
    consent_date: string;
}

export async function createPatient(payload: PatientRegistrationPayload): Promise<void> {
    const { error } = await supabase.from('patients').insert([payload]);
    if (error) throw error;
}

export async function updatePatientRecord(patientId: string, updates: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from('patients').update(updates).eq('id', patientId);
    if (error) throw error;
}

export async function savePatientConsent(payload: PatientConsentPayload): Promise<void> {
    const { data: existing, error: checkError } = await supabase
        .from('patient_consent')
        .select('consent_id')
        .eq('patient_id', payload.patient_id)
        .maybeSingle();

    if (checkError) throw checkError;
    if (existing) throw new Error('Patient consent is already recorded.');

    const { error } = await supabase.from('patient_consent').insert([payload]);
    if (error) throw error;
}
