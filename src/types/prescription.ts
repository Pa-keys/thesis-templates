export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: string;
}

export interface ParsedPrescription {
    medications: Medication[];
    malformed: boolean;
}
