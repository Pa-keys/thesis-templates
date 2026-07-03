import { breakpoints, mediaQueries } from './breakpoints';
import { colors } from './colors';
import { motion } from './motion';
import { radius } from './radius';
import { shadows } from './shadows';
import { layout, spacing } from './spacing';
import { typography } from './typography';

export const theme = {
    colors,
    typography,
    spacing,
    layout,
    radius,
    shadows,
    breakpoints,
    mediaQueries,
    motion,
} as const;

export type Theme = typeof theme;
