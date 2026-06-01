import { parsePrescriptionContent } from '../pharmacy/prescriptionParser';
import type { Medication } from '../../types/prescription';
import { createVaccineRecord, getVaccineCategory, type VaccineRecord } from '../vaccines/vaccineOptions';
export type { VaccineRecord } from '../vaccines/vaccineOptions';

const TEST_LABELS: Record<string, string> = {
    is_cbc: 'Complete Blood Count (CBC)',
    is_cbc_platelet: 'CBC with Platelet Count',
    is_hgb_hct: 'Hemoglobin and Hematocrit',
    is_xray: 'Chest X-Ray',
    is_ultrasound: 'Ultrasound',
    is_rbs: 'Random Blood Sugar',
    is_fbs: 'Fasting Blood Sugar',
    is_uric_acid: 'Uric Acid',
    is_cholesterol: 'Cholesterol',
    is_urinalysis: 'Urinalysis',
    is_fecalysis: 'Fecalysis',
    is_sputum: 'Sputum',
};

export function itemizeText(value?: string | null): string[] {
    if (!value) return [];
    return value
        .split(/\r?\n|;|,(?=\s*[A-Za-z])/)
        .map(item => item.trim())
        .filter(Boolean);
}

export function itemizeLabTests(row: Record<string, unknown>): string[] {
    const tests = Object.entries(TEST_LABELS)
        .filter(([key]) => Boolean(row[key]))
        .map(([, label]) => label);

    const others = typeof row.others === 'string' ? row.others.trim() : '';
    if (others) tests.push(...itemizeText(others));

    return tests;
}

export function itemizePrescription(rxContent?: string | null): Medication[] {
    if (!rxContent) return [];
    return parsePrescriptionContent(rxContent).medications;
}

export function itemizePrescriptionDisplay(rxContent?: string | null): string[] {
    const parsed = parsePrescriptionContent(rxContent);
    if (parsed.malformed) return ['Prescription content could not be parsed. Review the original prescription record.'];
    return parsed.medications
        .map(med => [med.name, med.dosage, med.frequency, med.duration, med.quantity].filter(Boolean).join(' | '))
        .filter(Boolean);
}

export function normalizeVaccineRecords(dataFields: Record<string, unknown> | null | undefined): VaccineRecord[] {
    if (!dataFields) return [];
    const fromArray = Array.isArray(dataFields.vaccine_records)
        ? dataFields.vaccine_records
            .map((record): VaccineRecord | null => {
                if (!record || typeof record !== 'object') return null;
                const raw = record as Record<string, unknown>;
                const vaccineName = String(raw.vaccine_name || '').trim();
                if (!vaccineName) return null;
                return {
                    id: String(raw.id || crypto.randomUUID()),
                    vaccine_category: String(raw.vaccine_category || getVaccineCategory(vaccineName)) as VaccineRecord['vaccine_category'],
                    vaccine_name: vaccineName,
                    other_vaccine_name: String(raw.other_vaccine_name || '').trim() || undefined,
                    dose_label: String(raw.dose_label || '').trim() || undefined,
                    date_given: String(raw.date_given || '').trim() || undefined,
                    next_due_date: String(raw.next_due_date || '').trim() || undefined,
                    administered_by: String(raw.administered_by || '').trim() || undefined,
                    facility: String(raw.facility || '').trim() || undefined,
                    lot_number: String(raw.lot_number || '').trim() || undefined,
                    remarks: String(raw.remarks || '').trim() || undefined,
                };
            })
            .filter((record): record is VaccineRecord => Boolean(record))
        : [];

    const bcgDate = typeof dataFields.bcg_date === 'string' ? dataFields.bcg_date.trim() : '';
    if (bcgDate && !fromArray.some(record => record.vaccine_name.toLowerCase() === 'bcg')) {
        fromArray.unshift(createVaccineRecord({
            vaccine_name: 'BCG',
            vaccine_category: 'Child Care / Core RHU Immunization',
            dose_label: 'Birth dose',
            date_given: bcgDate,
            remarks: typeof dataFields.bcg_age_category === 'string' ? dataFields.bcg_age_category : undefined,
        }));
    }

    return fromArray;
}
