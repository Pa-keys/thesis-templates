export const radius = {
    none: '0',
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    full: '9999px',
    control: '0.75rem',
    card: '1rem',
    modal: '1.25rem',
} as const;

export type RadiusToken = typeof radius;
