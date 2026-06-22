import type { Medication, ParsedPrescription } from '../../types/prescription';

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
                name: String(item.name ?? '').trim(),
                dosage: String(item.dosage ?? '').trim(),
                frequency: String(item.frequency ?? '').trim(),
                duration: String(item.duration ?? '').trim(),
                quantity: String(item.quantity ?? '').trim(),
            })).filter(item => item.name || item.dosage || item.frequency || item.duration || item.quantity),
        };
    } catch {
        return { medications: [], malformed: true };
    }
}
