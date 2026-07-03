export const shadows = {
    none: 'none',
    xs: '0 1px 2px rgba(15, 23, 42, 0.05)',
    sm: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
    md: '0 4px 16px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
    lg: '0 12px 32px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.06)',
    modal: '0 24px 64px rgba(15, 23, 42, 0.22)',
    focus: '0 0 0 3px rgba(37, 99, 235, 0.28)',
} as const;

export type ShadowToken = typeof shadows;
