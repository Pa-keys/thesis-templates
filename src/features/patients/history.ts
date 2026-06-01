import { supabase } from '../../lib/supabase/client';
import { itemizeLabTests, itemizePrescription, itemizeText, normalizeVaccineRecords, type VaccineRecord } from './itemization';

export type TransactionType =
    | 'registration'
    | 'consent'
    | 'initial_consultation'
    | 'doctor_consultation'
    | 'lab_request'
    | 'lab_result'
    | 'prescription'
    | 'pharmacy'
    | 'vaccine'
    | 'follow_up';

export interface PatientTransaction {
    id: string;
    type: TransactionType;
    title: string;
    date?: string | null;
    status?: string | null;
    summary?: string;
    items: { label: string; values: string[] }[];
}

async function safeSelect<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>, label: string): Promise<T[]> {
    const { data, error } = await query;
    if (error) {
        console.warn(`Patient history ${label} query skipped:`, error);
        return [];
    }
    return data ?? [];
}

const asText = (value: unknown) => typeof value === 'string' ? value : value == null ? '' : String(value);

export async function fetchPatientTransactions(patientId: string): Promise<PatientTransaction[]> {
    const numericId = Number(patientId);
    const idValue = Number.isNaN(numericId) ? patientId : numericId;

    const [patients, consents, initials, consultations, labRequests, labResults, prescriptions, followUps, fhsisLogs] = await Promise.all([
        safeSelect<Record<string, unknown>>(
            supabase.from('patients').select('id, created_at, firstName, lastName').eq('id', idValue).limit(1),
            'registration'
        ),
        safeSelect<Record<string, unknown>>(
            supabase.from('patient_consent').select('consent_id, patient_id, consent_status, consent_date, created_at').eq('patient_id', idValue),
            'consent'
        ),
        safeSelect<Record<string, unknown>>(
            supabase.from('initial_consultation').select('*').eq('patient_id', idValue),
            'initial consultation'
        ),
        safeSelect<Record<string, unknown>>(
            supabase.from('consultation').select('*').eq('patient_id', idValue),
            'doctor consultation'
        ),
        safeSelect<Record<string, unknown>>(
            supabase.from('lab_request').select('*').eq('patient_id', idValue),
            'lab requests'
        ),
        safeSelect<Record<string, unknown>>(
            supabase.from('lab_result').select('*').eq('patient_id', idValue),
            'lab results'
        ),
        safeSelect<Record<string, unknown>>(
            supabase.from('prescription').select('*').eq('patient_id', idValue),
            'prescriptions'
        ),
        safeSelect<Record<string, unknown>>(
            supabase.from('follow_up').select('*').eq('patient_id', idValue),
            'follow-ups'
        ),
        safeSelect<Record<string, unknown>>(
            supabase.from('fhsis_logs').select('*').eq('patient_id', idValue),
            'fhsis logs'
        ),
    ]);

    const transactions: PatientTransaction[] = [];

    patients.forEach(patient => {
        transactions.push({
            id: `registration-${patient.id}`,
            type: 'registration',
            title: 'Patient registered',
            date: asText(patient.created_at),
            status: 'Recorded',
            summary: `${asText(patient.firstName)} ${asText(patient.lastName)}`.trim(),
            items: [{ label: 'Registration', values: ['Demographics and emergency details saved'] }],
        });
    });

    consents.forEach(consent => {
        transactions.push({
            id: `consent-${consent.consent_id}`,
            type: 'consent',
            title: 'Patient consent',
            date: asText(consent.consent_date || consent.created_at),
            status: asText(consent.consent_status || 'Signed'),
            items: [{ label: 'Consent', values: [asText(consent.consent_status || 'Signed')] }],
        });
    });

    initials.forEach(record => {
        transactions.push({
            id: `initial-${record.initialconsultation_id}`,
            type: 'initial_consultation',
            title: 'Nurse initial consultation',
            date: asText(record.consultation_date),
            status: asText(record.mode_of_transaction),
            summary: asText(record.chief_complaint),
            items: [
                { label: 'Ailments / complaints', values: itemizeText(asText(record.chief_complaint)) },
                { label: 'Initial diagnosis', values: itemizeText(asText(record.diagnosis)) },
                { label: 'Transfer', values: itemizeText(asText(record.mode_of_transfer)) },
            ].filter(group => group.values.length > 0),
        });
    });

    consultations.forEach(record => {
        transactions.push({
            id: `consultation-${record.consultation_id}`,
            type: 'doctor_consultation',
            title: 'Doctor consultation',
            date: asText(record.consultation_date || record.created_at),
            status: asText(record.attending_provider),
            summary: asText(record.diagnosis),
            items: [
                { label: 'Ailments / complaints', values: itemizeText(asText(record.chief_complaints)) },
                { label: 'Findings / assessment', values: itemizeText(asText(record.assessment || record.diagnosis)) },
                { label: 'Treatment', values: [...itemizeText(asText(record.medication_treatment)), ...itemizeText(asText(record.management_treatment)), ...itemizeText(asText(record.plan))] },
                { label: 'Immunization history', values: itemizeText(asText(record.immunization_history)) },
            ].filter(group => group.values.length > 0),
        });
    });

    labRequests.forEach(record => {
        transactions.push({
            id: `lab-request-${record.labrequest_id}`,
            type: 'lab_request',
            title: 'Laboratory request',
            date: asText(record.request_date),
            status: asText(record.status || 'Pending'),
            summary: asText(record.chief_complaint),
            items: [
                { label: 'Requested tests', values: itemizeLabTests(record) },
                { label: 'Complaint', values: itemizeText(asText(record.chief_complaint)) },
            ].filter(group => group.values.length > 0),
        });
    });

    labResults.forEach(record => {
        transactions.push({
            id: `lab-result-${record.labresult_id}`,
            type: 'lab_result',
            title: 'Laboratory result',
            date: asText(record.date_performed),
            status: asText(record.status || 'Completed'),
            summary: asText(record.performed_by),
            items: [{ label: 'Findings', values: itemizeText(asText(record.findings)) }],
        });
    });

    prescriptions.forEach(record => {
        const medications = itemizePrescription(asText(record.rx_content));
        transactions.push({
            id: `prescription-${record.prescription_id}`,
            type: record.status === 'Dispensed' ? 'pharmacy' : 'prescription',
            title: record.status === 'Dispensed' ? 'Prescription dispensed' : 'Prescription created',
            date: asText(record.dispensed_at || record.prescription_date),
            status: asText(record.status || 'Pending'),
            summary: asText(record.doctor_name),
            items: [{
                label: 'Prescriptions',
                values: medications.map(med => [med.name, med.dosage, med.frequency, med.duration, med.quantity].filter(Boolean).join(' | ')),
            }],
        });
    });

    followUps.forEach(record => {
        transactions.push({
            id: `follow-up-${record.followup_id}`,
            type: 'follow_up',
            title: 'Follow-up',
            date: asText(record.visit_date),
            status: asText(record.follow_up_status || 'Scheduled'),
            summary: asText(record.diagnosis || record.chief_complaint),
            items: [
                { label: 'Ailments / complaints', values: itemizeText(asText(record.chief_complaint)) },
                { label: 'Treatment', values: itemizeText(asText(record.medication_treatment)) },
            ].filter(group => group.values.length > 0),
        });
    });

    fhsisLogs.forEach(log => {
        const dataFields = (log.data_fields || {}) as Record<string, unknown>;
        const vaccines: VaccineRecord[] = normalizeVaccineRecords(dataFields);
        vaccines.forEach((vaccine, index) => {
            transactions.push({
                id: `vaccine-${log.id}-${index}`,
                type: 'vaccine',
                title: 'Vaccine record',
                date: vaccine.date_given || asText(log.created_at),
                status: asText(log.category || 'FHSIS'),
                summary: vaccine.vaccine_name,
                items: [{
                    label: 'Vaccines',
                    values: [[vaccine.vaccine_name, vaccine.dose_label, vaccine.date_given, vaccine.remarks].filter(Boolean).join(' | ')],
                }],
            });
        });
    });

    return transactions.sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
    });
}
