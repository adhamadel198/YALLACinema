import { useColorScheme } from 'react-native';

// Brand tokens carried over from the web prototype's pages.css.
const light = { ink: '#29243b', muted: '#777287', bg: '#fffaf1', panel: '#ffffff', line: '#ebe2d7', accent: '#ff654d', accentInk: '#ffffff', good: '#27835c' };
const dark = { ink: '#f4eedf', muted: '#b9ad91', bg: '#11100e', panel: '#1c1914', line: '#453923', accent: '#c5a15a', accentInk: '#11100e', good: '#91c59c' };

export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === 'dark' ? dark : light);
