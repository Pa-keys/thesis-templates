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
