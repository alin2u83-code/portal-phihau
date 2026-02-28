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

// The fallback 'Deep Navy' theme - Updated to use #4DBCE9
export const federationTheme: Theme = {
  '--bg-main': '#0f172a', // Slate 900
  '--bg-card': '#1e293b', // Slate 800
  '--bg-card-hover': '#334155', // Slate 700
  '--bg-input': '#0f172a', // Slate 900
  '--bg-table-header': '#1e293b', // Slate 800
  '--bg-table-row-hover': '#334155', // Slate 700
  '--accent': '#4DBCE9', // The requested blue
  '--accent-hover': '#38bdf8', // Sky 400
  '--text-primary': '#f8fafc', // Slate 50
  '--text-secondary': '#94a3b8', // Slate 400
  '--border-color': '#334155', // Slate 700
  '--brand-primary': '#4DBCE9', // The requested blue
  '--brand-secondary': '#4DBCE9', // The requested blue
};

// A sample theme for other clubs - Updated to match the blue theme request
export const clubTheme: Theme = {
  '--bg-main': '#0f172a', // Slate 900
  '--bg-card': '#1e293b', // Slate 800
  '--bg-card-hover': '#334155', // Slate 700
  '--bg-input': '#0f172a', // Slate 900
  '--bg-table-header': '#1e293b', // Slate 800
  '--bg-table-row-hover': '#334155', // Slate 700
  '--accent': '#4DBCE9', // The requested blue
  '--accent-hover': '#38bdf8', // Sky 400
  '--text-primary': '#f8fafc', // Slate 50
  '--text-secondary': '#94a3b8', // Slate 400
  '--border-color': '#334155', // Slate 700
  '--brand-primary': '#4DBCE9', // The requested blue
  '--brand-secondary': '#4DBCE9', // The requested blue
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