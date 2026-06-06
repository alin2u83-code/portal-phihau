import type { ThemeConfig } from '../types';

// Tema implicită: QwanKiDo Blue
export const DEFAULT_THEME: ThemeConfig = {
  name: 'QwanKiDo Blue',
  bg: '#020617',
  surface: '#0f172a',
  surface2: '#1e293b',
  border: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  primaryFg: '#ffffff',
  secondary: '#1e293b',
  secondaryHover: '#334155',
  secondaryFg: '#e2e8f0',
};

// 8 teme predefinite (prima = DEFAULT_THEME)
export const PREDEFINED_THEMES: ThemeConfig[] = [
  DEFAULT_THEME,
  {
    name: 'Midnight Navy',
    bg: '#020617',
    surface: '#0c1526',
    surface2: '#122240',
    border: '#1a2f52',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    primary: '#1d4ed8',
    primaryHover: '#1e40af',
    primaryFg: '#ffffff',
    secondary: '#0c1526',
    secondaryHover: '#122240',
    secondaryFg: '#bfdbfe',
  },
  {
    name: 'Forest',
    bg: '#021208',
    surface: '#052e16',
    surface2: '#0a4023',
    border: '#14532d',
    text: '#f8fafc',
    textMuted: '#86efac',
    primary: '#16a34a',
    primaryHover: '#15803d',
    primaryFg: '#ffffff',
    secondary: '#052e16',
    secondaryHover: '#0a4023',
    secondaryFg: '#dcfce7',
  },
  {
    name: 'Crimson',
    bg: '#0f0505',
    surface: '#1c0a0a',
    surface2: '#2d1010',
    border: '#450a0a',
    text: '#f8fafc',
    textMuted: '#fca5a5',
    primary: '#dc2626',
    primaryHover: '#b91c1c',
    primaryFg: '#ffffff',
    secondary: '#1c0a0a',
    secondaryHover: '#2d1010',
    secondaryFg: '#fee2e2',
  },
  {
    name: 'Violet',
    bg: '#0a0514',
    surface: '#13082b',
    surface2: '#1f0e42',
    border: '#2e1065',
    text: '#f8fafc',
    textMuted: '#c4b5fd',
    primary: '#7c3aed',
    primaryHover: '#6d28d9',
    primaryFg: '#ffffff',
    secondary: '#13082b',
    secondaryHover: '#1f0e42',
    secondaryFg: '#ede9fe',
  },
  {
    name: 'Amber',
    bg: '#0c0a02',
    surface: '#1c1a05',
    surface2: '#292508',
    border: '#3d3400',
    text: '#f8fafc',
    textMuted: '#fcd34d',
    primary: '#d97706',
    primaryHover: '#b45309',
    primaryFg: '#ffffff',
    secondary: '#1c1a05',
    secondaryHover: '#292508',
    secondaryFg: '#fef3c7',
  },
  {
    name: 'Ocean',
    bg: '#020c0f',
    surface: '#0c1e24',
    surface2: '#102d36',
    border: '#164e63',
    text: '#f8fafc',
    textMuted: '#67e8f9',
    primary: '#0891b2',
    primaryHover: '#0e7490',
    primaryFg: '#ffffff',
    secondary: '#0c1e24',
    secondaryHover: '#102d36',
    secondaryFg: '#cffafe',
  },
  {
    name: 'Graphite',
    bg: '#030303',
    surface: '#111111',
    surface2: '#1a1a1a',
    border: '#262626',
    text: '#f5f5f5',
    textMuted: '#a3a3a3',
    primary: '#525252',
    primaryHover: '#404040',
    primaryFg: '#ffffff',
    secondary: '#111111',
    secondaryHover: '#1a1a1a',
    secondaryFg: '#e5e5e5',
  },
];

/**
 * Aplică o temă pe document.documentElement prin setarea variabilelor CSS --t-*.
 * Coexistă cu --bg-*, --brand-* (themes.ts la rădăcină — neatins).
 */
export function applyTheme(theme: ThemeConfig): void {
  const root = document.documentElement;
  root.style.setProperty('--t-bg', theme.bg);
  root.style.setProperty('--t-surface', theme.surface);
  root.style.setProperty('--t-surface-2', theme.surface2);
  root.style.setProperty('--t-border', theme.border);
  root.style.setProperty('--t-text', theme.text);
  root.style.setProperty('--t-text-muted', theme.textMuted);
  root.style.setProperty('--t-primary', theme.primary);
  root.style.setProperty('--t-primary-hover', theme.primaryHover);
  root.style.setProperty('--t-primary-fg', theme.primaryFg);
  root.style.setProperty('--t-secondary', theme.secondary);
  root.style.setProperty('--t-secondary-hover', theme.secondaryHover);
  root.style.setProperty('--t-secondary-fg', theme.secondaryFg);
}
