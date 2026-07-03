export function toSafeString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return String(value);
}

export function safeTrim(value: unknown): string {
    return toSafeString(value).trim();
}

export function isBlank(value: unknown): boolean {
    return safeTrim(value) === '';
}

export function toNumberOrNull(value: unknown): number | null {
    const text = safeTrim(value);
    if (!text) return null;
    const parsed = Number(text);
    return Number.isNaN(parsed) ? null : parsed;
}
