
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

export const federationTheme: Theme = {
  '--bg-main': '#0f172a',        // deep-navy
  '--bg-card': '#1e293b',        // light-navy
  '--bg-card-hover': '#334155',   // slate-700
  '--bg-input': '#1e293b',
  '--bg-table-header': '#334155',
  '--bg-table-row-hover': '#1e293b',
  '--accent': '#3b82f6',         // blue-500
  '--accent-hover': '#2563eb',   // blue-600
  '--text-primary': '#f8fafc',     // slate-50
  '--text-secondary': '#94a3b8',   // slate-400
  '--border-color': '#334155',
  '--brand-primary': '#3b82f6',
  '--brand-secondary': '#f59e0b',
};

export const applyTheme = (theme?: Partial<Theme> | null) => {
  const themeToApply: Theme = { ...federationTheme, ...theme };
  const root = document.documentElement;
  Object.entries(themeToApply).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};
