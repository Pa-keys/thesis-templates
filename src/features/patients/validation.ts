import type { FieldErrors, PatientRegistrationForm, PatientRegistrationPayload } from '../../types/patient';

export function calcAge(birthday: string): string {
    if (!birthday) return '';
    const dob = new Date(birthday);
    if (isNaN(dob.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDelta = today.getMonth() - dob.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 0 ? String(age) : '';
}

export function formatPhilhealth(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 12);
    if (digits.length <= 2) return digits;
    if (digits.length <= 11) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11)}`;
}

export function philhealthDigits(formatted: string): string {
    return formatted.replace(/\D/g, '');
}

export function validatePatientRegistration(form: PatientRegistrationForm): FieldErrors {
    const errors: FieldErrors = {};

    if (form.contactNumber && form.contactNumber.length !== 11) {
        errors.contactNumber = 'Contact number must be exactly 11 digits.';
    }

    if (form.relativeContact && form.relativeContact.length !== 11) {
        errors.relativeContact = 'Emergency contact number must be exactly 11 digits.';
    }

    if (form.philhealthNo && philhealthDigits(form.philhealthNo).length !== 12) {
        errors.philhealthNo = 'PhilHealth number must be 12 digits (XX-XXXXXXXXX-X).';
    }

    if (form.birthday) {
        const dob = new Date(form.birthday);
        if (dob > new Date()) errors.birthday = 'Birthday cannot be a future date.';
    }

    if (form.age && (Number.parseInt(form.age, 10) < 0 || Number.parseInt(form.age, 10) > 150)) {
        errors.age = 'Please enter a valid age.';
    }

    if (form.category === 'Other/s' && !form.categoryOthers.trim()) {
        errors.categoryOthers = 'Please specify the patient classification.';
    }

    return errors;
}

export function toPatientRegistrationPayload(form: PatientRegistrationForm): PatientRegistrationPayload {
    const parsedAge = Number.parseInt(form.age, 10);
    return {
        ...form,
        age: Number.isNaN(parsedAge) ? null : parsedAge,
    };
}
