export interface PatientRegistrationForm {
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    age: string;
    sex: string;
    civilStatus: string;
    birthday: string;
    nationality: string;
    bloodType: string;
    religion: string;
    birthPlace: string;
    address: string;
    contactNumber: string;
    educationalAttain: string;
    employmentStatus: string;
    philhealthNo: string;
    philhealthStatus: string;
    category: string;
    categoryOthers: string;
    relativeName: string;
    relativeRelation: string;
    relativeAddress: string;
    relativeContact: string;
}

export const RELIGION_OPTIONS = [
    'Roman Catholic',
    'Iglesia ni Cristo',
    'Born Again Christian',
    'Christian',
    'Islam',
    'Seventh-day Adventist',
    'Jehovah\'s Witness',
    'Buddhist',
    'Hindu',
    'Indigenous / IP Belief',
    'No Religion',
    'Prefer not to say',
    'Other',
] as const;

export interface PatientRegistrationPayload extends Omit<PatientRegistrationForm, 'age'> {
    age: number | null;
}

export interface PatientRecord extends Omit<PatientRegistrationForm, 'age'> {
    id: string;
    age: number | null;
    created_at?: string;
    createdAt?: string;
}

export interface FieldErrors {
    [key: string]: string;
}
