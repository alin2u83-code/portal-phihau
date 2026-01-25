export interface Theme {
  '--bg-main': string;
  '--bg-card': string;
  '--bg-input': string;
  '--accent': string;
  '--accent-hover': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--border-color': string;
  '--brand-primary': string;
  '--brand-secondary': string;
}

export const federationTheme: Theme = {
  '--bg-main': '#0a192f',
  '--bg-card': '#112240',
  '--bg-input': '#1e293b',
  '--accent': '#1d4ed8',
  '--accent-hover': '#1e40af',
  '--text-primary': '#ffffff',
  '--text-secondary': '#94a3b8',
  '--border-color': '#334155',
  '--brand-primary': '#1d4ed8',
  '--brand-secondary': '#1d4ed8',
};

export const clubTheme: Theme = {
  '--bg-main': '#18181b', // zinc-900
  '--bg-card': '#27272a', // zinc-800
  '--bg-input': '#3f3f46', // zinc-700
  '--accent': '#3b82f6', // blue-500
  '--accent-hover': '#2563eb', // blue-600
  '--text-primary': '#ffffff',
  '--text-secondary': '#a1a1aa', // zinc-400
  '--border-color': '#52525b', // zinc-600
  '--brand-primary': '#3b82f6',
  '--brand-secondary': '#3b82f6',
};

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};
