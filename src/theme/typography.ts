import { TextStyle } from 'react-native';

export const Typography = {
    h1: {
        fontSize: 28,
        fontWeight: '700' as TextStyle['fontWeight'],
        letterSpacing: -0.5,
    },
    h2: {
        fontSize: 22,
        fontWeight: '600' as TextStyle['fontWeight'],
        letterSpacing: -0.3,
    },
    h3: {
        fontSize: 18,
        fontWeight: '600' as TextStyle['fontWeight'],
        letterSpacing: -0.2,
    },
    body: {
        fontSize: 15,
        fontWeight: '400' as TextStyle['fontWeight'],
        lineHeight: 22,
    },
    bodySmall: {
        fontSize: 13,
        fontWeight: '400' as TextStyle['fontWeight'],
        lineHeight: 18,
    },
    caption: {
        fontSize: 11,
        fontWeight: '500' as TextStyle['fontWeight'],
        letterSpacing: 0.5,
        textTransform: 'uppercase' as TextStyle['textTransform'],
    },
    button: {
        fontSize: 15,
        fontWeight: '600' as TextStyle['fontWeight'],
        letterSpacing: 0.3,
    },
    label: {
        fontSize: 13,
        fontWeight: '500' as TextStyle['fontWeight'],
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};
