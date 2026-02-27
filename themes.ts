// themes.ts

export interface Theme {
  '--bg-main': string;
  '--bg-card': string;
  '--bg-card-hover': string;
  '--bg-input': string;
  '--bg-table-header': string;
  '--bg-table-row-hover': string;
  '--accent': string;
  '--accent-hover': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--border-color': string;
  '--brand-primary': string;
  '--brand-secondary': string;
}

// The fallback 'Deep Navy' theme
export const federationTheme: Theme = {
  '--bg-main': '#0a192f',
  '--bg-card': '#112240',
  '--bg-card-hover': '#1d2f50',
  '--bg-input': '#1e293b',
  '--bg-table-header': '#1e293b',
  '--bg-table-row-hover': '#172a46',
  '--accent': '#3D3D99',
  '--accent-hover': '#2E2E7A',
  '--text-primary': '#ffffff',
  '--text-secondary': '#94a3b8',
  '--border-color': '#334155',
  '--brand-primary': '#3D3D99',
  '--brand-secondary': '#4DBCE9',
};

// A sample theme for other clubs for contrast if theme_config is not set
export const clubTheme: Theme = {
  '--bg-main': '#18181b', // zinc-900
  '--bg-card': '#27272a', // zinc-800
  '--bg-card-hover': '#3f3f46', // zinc-700
  '--bg-input': '#3f3f46',
  '--bg-table-header': '#3f3f46',
  '--bg-table-row-hover': '#52525b',
  '--accent': '#a16207', // amber-700
  '--accent-hover': '#854d0e', // amber-800
  '--text-primary': '#ffffff',
  '--text-secondary': '#a1a1aa', // zinc-400
  '--border-color': '#52525b', // zinc-600
  '--brand-primary': '#f59e0b', // amber-500
  '--brand-secondary': '#f59e0b',
};

/**
 * Applies a theme by setting CSS custom properties on the root element.
 * @param theme - A partial theme object to apply. If null or undefined, falls back to the federation theme.
 */
export const applyTheme = (theme?: Partial<Theme> | null) => {
  // Ensure we always have a full theme object by merging with the default.
  const themeToApply: Theme = { ...federationTheme, ...theme };
  const root = document.documentElement;
  Object.entries(themeToApply).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};