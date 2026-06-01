import { supabase } from '../../lib/supabase/client';

export type WorkflowPayload = Record<string, unknown>;

export async function saveInitialConsultationWithVitals(
    consultationPayload: WorkflowPayload,
    vitalsPayload: WorkflowPayload,
): Promise<number> {
    const { data: consultation, error: consultationError } = await supabase
        .from('initial_consultation')
        .insert([consultationPayload])
        .select('initialconsultation_id')
        .single();

    if (consultationError) throw new Error('initial_consultation: ' + consultationError.message);

    const consultationId = consultation.initialconsultation_id as number;
    const { error: vitalsError } = await supabase
        .from('vital_sign')
        .insert([{ ...vitalsPayload, initial_consultation_id: consultationId }]);

    if (vitalsError) {
        await supabase.from('initial_consultation').delete().eq('initialconsultation_id', consultationId);
        throw new Error('vital_sign: ' + vitalsError.message);
    }

    return consultationId;
}

export async function upsertConsultation(payload: WorkflowPayload, consultationId?: number | null): Promise<number> {
    if (consultationId) {
        const { error } = await supabase.from('consultation').update(payload).eq('consultation_id', consultationId);
        if (error) throw error;
        return consultationId;
    }

    const { data, error } = await supabase
        .from('consultation')
        .insert([payload])
        .select('consultation_id')
        .single();

    if (error) throw error;
    return data.consultation_id as number;
}

export async function upsertFollowUpByConsultation(consultationId: number, payload: WorkflowPayload): Promise<void> {
    const { data: existing, error: checkError } = await supabase
        .from('follow_up')
        .select('consultation_id')
        .eq('consultation_id', consultationId)
        .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
        const { error } = await supabase.from('follow_up').update(payload).eq('consultation_id', consultationId);
        if (error) throw error;
        return;
    }

    const { error } = await supabase.from('follow_up').insert([payload]);
    if (error) throw error;
}

export async function upsertLatestFollowUpByPatient(patientId: string, payload: WorkflowPayload): Promise<void> {
    const { data: existing, error: checkError } = await supabase
        .from('follow_up')
        .select('followup_id')
        .eq('patient_id', patientId)
        .order('followup_id', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
        const { error } = await supabase.from('follow_up').update(payload).eq('followup_id', existing.followup_id);
        if (error) throw error;
        return;
    }

    const { error } = await supabase.from('follow_up').insert([payload]);
    if (error) throw error;
}

export async function createLabRequest(payload: WorkflowPayload): Promise<void> {
    const { error } = await supabase.from('lab_request').insert([payload]);
    if (error) throw error;
}

export async function createPrescription(payload: WorkflowPayload): Promise<void> {
    const { error } = await supabase.from('prescription').insert([payload]);
    if (error) throw error;
}
