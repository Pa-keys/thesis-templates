import { supabase } from '../../lib/supabase/client';
import { logAuditEvent } from '../audit/services';

export interface LabResultPayload {
    labrequest_id: number;
    patient_id: number | null;
    consultation_id: number | null;
    findings: string;
    performed_by: string;
    date_performed: string;
    status: 'Completed';
}

export async function upsertCompletedLabResult(payload: LabResultPayload): Promise<void> {
    let labResultId: number | null = null;
    let auditAction: 'create' | 'update' = 'create';
    const { data: existingLabResult, error: existingError } = await supabase
        .from('lab_result')
        .select('labresult_id')
        .eq('labrequest_id', payload.labrequest_id)
        .order('labresult_id', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingError) throw existingError;

    if (existingLabResult) {
        auditAction = 'update';
        labResultId = existingLabResult.labresult_id as number;
        const { error } = await supabase
            .from('lab_result')
            .update({
                patient_id: payload.patient_id,
                consultation_id: payload.consultation_id,
                findings: payload.findings,
                performed_by: payload.performed_by,
                date_performed: payload.date_performed,
                status: payload.status,
            })
            .eq('labresult_id', existingLabResult.labresult_id);

        if (error) throw error;
    } else {
        const { error } = await supabase.from('lab_result').insert([payload]);
        if (error) throw error;
    }

    const { error: updateRequestError } = await supabase
        .from('lab_request')
        .update({ status: 'Completed' })
        .eq('labrequest_id', payload.labrequest_id);

    if (updateRequestError) throw updateRequestError;

    void logAuditEvent({
        action: auditAction,
        module: 'Laboratory',
        recordId: labResultId,
        recordType: 'lab_result',
        description: auditAction === 'create' ? 'Created laboratory result.' : 'Updated laboratory result.',
        metadata: {
            labresult_id: labResultId ?? undefined,
            labrequest_id: payload.labrequest_id,
            patient_id: payload.patient_id ?? undefined,
            consultation_id: payload.consultation_id ?? undefined,
            status: payload.status,
        },
    });
    void logAuditEvent({
        action: 'update',
        module: 'Laboratory',
        recordId: payload.labrequest_id,
        recordType: 'lab_request',
        description: 'Updated laboratory request status.',
        metadata: {
            labrequest_id: payload.labrequest_id,
            patient_id: payload.patient_id ?? undefined,
            consultation_id: payload.consultation_id ?? undefined,
            status: 'Completed',
        },
    });
}
