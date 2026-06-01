// The Master Data (Shared)
export interface Patient {
    id: string; // UUID from Supabase
    first_name: string;
    last_name: string;
    barangay: string;
    date_of_birth: string;
    sex: 'Male' | 'Female';
}

// The Midwife Input Data (Specific)
export interface CensusRecord {
    id: string;
    patient_id: string; // Link to Patient
    category: 'maternal' | 'child' | 'fp' | 'dental' | 'ncd';
    data_fields: Record<string, any>; // The specific inputs (LMP, Vaccine, etc.)
    report_month: string;
    created_at: string;
    // Joined data for UI display
    patient_name?: string; 
    patient_barangay?: string;
}