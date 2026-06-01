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
        const consentsForPatient = consents.filter(c => String(c.patient_id) === String(patient.id));
        const consentStatus = consentsForPatient.length > 0
            ? asText(consentsForPatient[0].consent_status || 'Signed')
            : 'Pending';
        transactions.push({
            id: `registration-${patient.id}`,
            type: 'registration',
            title: 'Patient registered',
            date: asText(patient.created_at),
            status: consentStatus === 'Signed' ? 'Consented' : consentStatus,
            summary: `${asText(patient.firstName)} ${asText(patient.lastName)}`.trim(),
            items: [
                { label: 'Demographics', values: [`${asText(patient.lastName)}, ${asText(patient.firstName)}`, `Age ${asText(patient.age)}`].filter(Boolean) },
                { label: 'Contact', values: [`${asText(patient.contactNumber)}`, `${asText(patient.address)}`].filter(Boolean) },
            ],
        });
    });

    consents.forEach(consent => {
        transactions.push({
            id: `consent-${consent.consent_id}`,
            type: 'consent',
            title: 'Patient consent',
            date: asText(consent.consent_date || consent.created_at),
            status: asText(consent.consent_status || 'Signed'),
            summary: asText(consent.personnel_name || consent.consent_personnel),
            items: [
                { label: 'Consent status', values: [asText(consent.consent_status || 'Signed')] },
                { label: 'Personnel', values: [asText(consent.personnel_name || consent.consent_personnel || 'Unknown')] },
            ].filter(group => group.values.length > 0),
        });
    });

    initials.forEach(record => {
        const items: { label: string; values: string[] }[] = [
            { label: 'Chief complaint', values: itemizeText(asText(record.chief_complaint)) },
            { label: 'Diagnosis', values: itemizeText(asText(record.diagnosis)) },
            { label: 'Consultation time', values: [asText(record.consultation_time)].filter(Boolean) },
            { label: 'Mode of transaction', values: [asText(record.mode_of_transaction)].filter(Boolean) },
            { label: 'Referred by', values: [asText(record.referred_by)].filter(Boolean) },
            { label: 'Mode of transfer', values: [asText(record.mode_of_transfer)].filter(Boolean) },
        ].filter(group => group.values.length > 0);
        transactions.push({
            id: `initial-${record.initialconsultation_id}`,
            type: 'initial_consultation',
            title: 'Nurse initial consultation',
            date: asText(record.consultation_date),
            status: asText(record.mode_of_transaction),
            summary: asText(record.chief_complaint),
            items,
        });
    });

    consultations.forEach(record => {
        const treatmentItems: string[] = [
            ...itemizeText(asText(record.medication_treatment)),
            ...itemizeText(asText(record.management_treatment)),
            ...itemizeText(asText(record.plan)),
        ];
        const items: { label: string; values: string[] }[] = [
            { label: 'Chief complaints', values: itemizeText(asText(record.chief_complaints)) },
            { label: 'Assessment / findings', values: itemizeText(asText(record.assessment || record.diagnosis)) },
            { label: 'Treatment / management', values: treatmentItems },
            { label: 'Diagnosis', values: itemizeText(asText(record.diagnosis)) },
            { label: 'Family history', values: itemizeText(asText(record.family_history)) },
            { label: 'Immunization history', values: itemizeText(asText(record.immunization_history)) },
            { label: 'Smoking status', values: [asText(record.smoking_status)].filter(Boolean) },
            { label: 'Drinking status', values: [asText(record.drinking_status)].filter(Boolean) },
            { label: 'Past medical / surgical history', values: itemizeText(asText(record.past_med_surge_history)) },
        ].filter(group => group.values.length > 0);
        transactions.push({
            id: `consultation-${record.consultation_id}`,
            type: 'doctor_consultation',
            title: 'Doctor consultation',
            date: asText(record.consultation_date || record.created_at),
            status: asText(record.attending_provider),
            summary: asText(record.diagnosis),
            items,
        });
    });

    labRequests.forEach(record => {
        const items: { label: string; values: string[] }[] = [
            { label: 'Requested tests', values: itemizeLabTests(record) },
            { label: 'Chief complaint', values: itemizeText(asText(record.chief_complaint)) },
            { label: 'Urgent', values: [record.is_urgent ? 'Yes' : null].filter(Boolean) },
        ].filter(group => group.values.length > 0);
        transactions.push({
            id: `lab-request-${record.labrequest_id}`,
            type: 'lab_request',
            title: 'Laboratory request',
            date: asText(record.request_date),
            status: asText(record.status || 'Pending'),
            summary: `${itemizeLabTests(record).length} test(s) requested`,
            items,
        });
    });

    labResults.forEach(record => {
        const items: { label: string; values: string[] }[] = [
            { label: 'Findings', values: itemizeText(asText(record.findings)) },
            { label: 'Performed by', values: [asText(record.performed_by)].filter(Boolean) },
            { label: 'Date performed', values: [asText(record.date_performed)].filter(Boolean) },
        ].filter(group => group.values.length > 0);
        transactions.push({
            id: `lab-result-${record.labresult_id}`,
            type: 'lab_result',
            title: 'Laboratory result',
            date: asText(record.date_performed),
            status: asText(record.status || 'Completed'),
            summary: asText(record.performed_by),
            items,
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
                label: 'Medications',
                values: medications.map(med => [med.name, med.dosage, med.frequency, med.duration, med.quantity].filter(Boolean).join(' | ')),
            }],
        });
    });

    followUps.forEach(record => {
        const items: { label: string; values: string[] }[] = [
            { label: 'Chief complaint', values: itemizeText(asText(record.chief_complaint)) },
            { label: 'Treatment', values: itemizeText(asText(record.medication_treatment)) },
            { label: 'Diagnosis', values: itemizeText(asText(record.diagnosis)) },
            { label: 'Visit date', values: [asText(record.visit_date)].filter(Boolean) },
            { label: 'Status', values: [asText(record.follow_up_status || 'Scheduled')] },
        ].filter(group => group.values.length > 0);
        transactions.push({
            id: `follow-up-${record.followup_id}`,
            type: 'follow_up',
            title: 'Follow-up visit',
            date: asText(record.visit_date),
            status: asText(record.follow_up_status || 'Scheduled'),
            summary: asText(record.diagnosis || record.chief_complaint),
            items,
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
