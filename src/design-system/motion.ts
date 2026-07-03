export const motion = {
    duration: {
        instant: '0ms',
        fast: '160ms',
        base: '220ms',
        slow: '320ms',
    },
    easing: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
        exit: 'cubic-bezier(0.7, 0, 0.84, 0)',
    },
} as const;

export type MotionToken = typeof motion;
