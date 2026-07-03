import type { Medication, ParsedPrescription } from '../../types/prescription';
import { safeTrim } from '../../lib/utils/strings';

function isMedication(value: unknown): value is Partial<Medication> {
    return Boolean(value && typeof value === 'object');
}

export function parsePrescriptionContent(raw: string | null | undefined): ParsedPrescription {
    if (!raw) return { medications: [], malformed: false };

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return { medications: [], malformed: true };

        return {
            malformed: false,
            medications: parsed.filter(isMedication).map(item => ({
                name: safeTrim(item.name),
                dosage: safeTrim(item.dosage),
                frequency: safeTrim(item.frequency),
                duration: safeTrim(item.duration),
                quantity: safeTrim(item.quantity),
            })).filter(item => item.name || item.dosage || item.frequency || item.duration || item.quantity),
        };
    } catch {
        return { medications: [], malformed: true };
    }
}
