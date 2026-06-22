export type VaccineCategory =
    | 'Child Care / Core RHU Immunization'
    | 'Maternal Care / Women of Reproductive Age'
    | 'NCD & Seniors / Adult or Special-Risk'
    | 'Rabies & Leprosy / Public Health'
    | 'Optional';

export interface VaccineOption {
    category: VaccineCategory;
    name: string;
}

export interface VaccineRecord {
    id: string;
    vaccine_category: VaccineCategory | '';
    vaccine_name: string;
    other_vaccine_name?: string;
    dose_label?: string;
    date_given?: string;
    next_due_date?: string;
    administered_by?: string;
    facility?: string;
    lot_number?: string;
    remarks?: string;
}

export const OTHER_VACCINE_NAME = 'Others / Specify';

export const VACCINE_OPTIONS: readonly VaccineOption[] = [
    { category: 'Child Care / Core RHU Immunization', name: 'BCG' },
    { category: 'Child Care / Core RHU Immunization', name: 'Hepatitis B Vaccine' },
    { category: 'Child Care / Core RHU Immunization', name: 'Pentavalent Vaccine (DPT-HepB-Hib)' },
    { category: 'Child Care / Core RHU Immunization', name: 'Oral Polio Vaccine (OPV)' },
    { category: 'Child Care / Core RHU Immunization', name: 'Inactivated Polio Vaccine (IPV)' },
    { category: 'Child Care / Core RHU Immunization', name: 'Pneumococcal Conjugate Vaccine (PCV)' },
    { category: 'Child Care / Core RHU Immunization', name: 'Measles-Containing Vaccine (MCV)' },
    { category: 'Child Care / Core RHU Immunization', name: 'Measles-Rubella Vaccine (MR)' },
    { category: 'Child Care / Core RHU Immunization', name: 'Measles-Mumps-Rubella Vaccine (MMR)' },
    { category: 'Child Care / Core RHU Immunization', name: 'Rotavirus Vaccine' },
    { category: 'Maternal Care / Women of Reproductive Age', name: 'Tetanus Toxoid Vaccine (TT)' },
    { category: 'Maternal Care / Women of Reproductive Age', name: 'Tetanus-Diphtheria Vaccine (Td)' },
    { category: 'NCD & Seniors / Adult or Special-Risk', name: 'Influenza Vaccine' },
    { category: 'NCD & Seniors / Adult or Special-Risk', name: 'Pneumococcal Vaccine' },
    { category: 'NCD & Seniors / Adult or Special-Risk', name: 'PCV' },
    { category: 'NCD & Seniors / Adult or Special-Risk', name: 'PPSV23' },
    { category: 'NCD & Seniors / Adult or Special-Risk', name: 'COVID-19 Vaccine' },
    { category: 'Rabies & Leprosy / Public Health', name: 'Anti-Rabies Vaccine' },
    { category: 'Rabies & Leprosy / Public Health', name: 'Tetanus Toxoid / Td' },
    { category: 'Optional', name: OTHER_VACCINE_NAME },
] as const;

export function createVaccineRecord(overrides: Partial<VaccineRecord> = {}): VaccineRecord {
    return {
        id: crypto.randomUUID(),
        vaccine_category: '',
        vaccine_name: '',
        other_vaccine_name: '',
        dose_label: '',
        date_given: '',
        next_due_date: '',
        administered_by: '',
        facility: '',
        lot_number: '',
        remarks: '',
        ...overrides,
    };
}

export function getVaccineCategory(vaccineName: string): VaccineCategory | '' {
    return VACCINE_OPTIONS.find(option => option.name === vaccineName)?.category || '';
}

export function getVaccineDisplayName(record: Pick<VaccineRecord, 'vaccine_name' | 'other_vaccine_name'>): string {
    if (record.vaccine_name === OTHER_VACCINE_NAME) return record.other_vaccine_name?.trim() || OTHER_VACCINE_NAME;
    return record.vaccine_name;
}

export function cleanVaccineRecord(record: VaccineRecord): VaccineRecord {
    const category = record.vaccine_category || getVaccineCategory(record.vaccine_name);
    return {
        id: record.id || crypto.randomUUID(),
        vaccine_category: category,
        vaccine_name: record.vaccine_name.trim(),
        other_vaccine_name: record.other_vaccine_name?.trim() || '',
        dose_label: record.dose_label?.trim() || '',
        date_given: record.date_given?.trim() || '',
        next_due_date: record.next_due_date?.trim() || '',
        administered_by: record.administered_by?.trim() || '',
        facility: record.facility?.trim() || '',
        lot_number: record.lot_number?.trim() || '',
        remarks: record.remarks?.trim() || '',
    };
}

export function isMeaningfulVaccineRecord(record: VaccineRecord): boolean {
    return Boolean(
        record.vaccine_name ||
        record.other_vaccine_name ||
        record.dose_label ||
        record.date_given ||
        record.next_due_date ||
        record.administered_by ||
        record.facility ||
        record.lot_number ||
        record.remarks
    );
}
