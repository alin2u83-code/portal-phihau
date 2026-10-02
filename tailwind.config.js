import colors from 'tailwindcss/colors.js';
import plugin from 'tailwindcss/plugin.js';

// ---- Contrast teme luminoase (quick 261002-mo3) ----
// Paleta slate + nuantele pale ale accentelor merg prin variabile CSS, ca sa poata fi
// inversate pe temele luminoase (data-theme-mode="light", setat in applyTheme) fara a edita componentele.
const toRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
};
const SLATE_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const SLATE_LIGHT = { 50: '950', 100: '900', 200: '800', 300: '700', 400: '600', 500: '600', 600: '300', 700: '300', 800: '200', 900: '100', 950: '50' };
const ACCENTS = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const WARM = ['amber', 'yellow', 'orange', 'lime'];
const ACCENT_SHADES = ['200', '300', '400', '500', '600', '800', '900'];
const LIGHT_600 = ['cyan', 'sky', 'emerald', 'green', 'teal']; // alb pe *-600 < 4.5:1 -> *-700
// nuanta folosita in mod luminos pentru fiecare nuanta pala
const accentLight = (hue, shade) => (shade === '800' ? '200' : shade === '900' ? '100' : shade === '600' ? (LIGHT_600.includes(hue) ? '700' : '600') : WARM.includes(hue) ? (shade === '500' ? '700' : '800') : { 200: '900', 300: '800', 400: '800', 500: '700' }[shade]);

const slateColors = {};
SLATE_SHADES.forEach((n) => { slateColors[n] = `rgb(var(--c-slate-${n}) / <alpha-value>)`; });
const accentColors = {};
ACCENTS.forEach((h) => {
  accentColors[h] = {};
  ACCENT_SHADES.forEach((n) => { accentColors[h][n] = `rgb(var(--c-${h}-${n}) / <alpha-value>)`; });
});

const darkVars = {};
const lightVars = {};
SLATE_SHADES.forEach((n) => {
  darkVars[`--c-slate-${n}`] = toRgb(colors.slate[n]);
  lightVars[`--c-slate-${n}`] = toRgb(n === '500' ? '#526071' : n === '400' ? '#475569' : colors.slate[SLATE_LIGHT[n]]);
});
ACCENTS.forEach((h) => ACCENT_SHADES.forEach((n) => {
  darkVars[`--c-${h}-${n}`] = toRgb(colors[h][n]);
  lightVars[`--c-${h}-${n}`] = toRgb(colors[h][accentLight(h, n)]);
}));

// fundaluri saturate pe care text-white ramane alb
const SAT_SHADES = ['500', '600', '700'];
const SAT = [];
[...ACCENTS, 'brand', 'slate'].forEach((h) => SAT_SHADES.forEach((n) => { if (h !== 'slate') SAT.push(`[class~="bg-${h}-${n}"]`); }));
SAT.push('[class~="bg-brand"]', '[class*="bg-gradient"]', '[class*="bg-[var(--t-primary"]', '[class*="bg-[var(--t-sidebar"]', '[class*="bg-[var(--t-status"]', '[class*="from-"]');
const satList = SAT.join(', ');

// variabilele legacy (--bg-card etc.) sunt fixe pe dark in index.css/SystemGuardian; in mod light le legam de tema
// (!important: SystemGuardian le seteaza inline pe :root)
const legacyLight = {
  '--bg-main': 'var(--t-bg)',
  '--bg-card': 'var(--t-surface)',
  '--bg-card-hover': 'var(--t-table-row-hover)',
  '--bg-input': 'var(--t-input-bg)',
  '--bg-table-header': 'var(--t-table-header-bg)',
  '--bg-table-row-hover': 'var(--t-table-row-hover)',
  '--text-primary': 'var(--t-text)',
  '--text-secondary': 'var(--t-text-muted)',
  '--text-muted': 'var(--t-text-muted)',
  '--border-color': 'var(--t-border)',
};
Object.keys(legacyLight).forEach((k) => { legacyLight[k] += ' !important'; });

// text cu opacitate (text-emerald-300/60) pierde contrast pe fundal deschis -> culoare plina in mod light
const alphaTextRules = {};
[...ACCENTS, 'slate'].forEach((h) => ['200', '300', '400', '500'].forEach((n) => {
  const sel = [40, 50, 60, 70, 80, 90].map((a) => `[data-theme-mode="light"] .text-${h}-${n}\\/${a}`).join(', ');
  alphaTextRules[sel] = { color: `rgb(var(--c-${h}-${n}))` };
}));

// fundaluri tintate cu opacitate (bg-green-600/30) -> tinta usoara a culorii 500 pe fundal deschis
const alphaBgRules = {};
ACCENTS.forEach((h) => [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90].forEach((a) => {
  const sel = ['500', '600', '700', '800', '900', '950'].filter((n) => a <= 50 || Number(n) >= 800).map((n) => `[data-theme-mode="light"] .bg-${h}-${n}\\/${a}`).join(', ');
  alphaBgRules[sel] = { backgroundColor: `rgb(${toRgb(colors[h][500])} / 0.12)` };
}));

const darkText = {};
ACCENTS.forEach((h) => ['800', '900'].forEach((n) => { darkText[`[data-theme-mode="light"] .text-${h}-${n}`] = { color: colors[h][n] }; }));

const themeContrastPlugin = plugin(({ addBase }) => {
  addBase({
    ...alphaTextRules,
    ...alphaBgRules,
    ...darkText,
    ':root': darkVars,
    '[data-theme-mode="light"]': { ...lightVars, ...legacyLight },
    // sidebar/footer sunt albe pe temele luminoase (urmeaza paleta light); [data-keep-dark] = zone care raman inchise la cerere
    '[data-theme-mode="light"] [data-keep-dark]': darkVars,
    '[data-theme-mode="light"] aside': { borderRight: '1px solid var(--t-border)' },
    '[data-theme-mode="light"] *': { colorScheme: 'light' },
    [`[data-theme-mode="light"] .text-white:not(:where(${satList}), :where(${satList}) *)`]: { color: 'rgb(var(--c-slate-50))' },
    // text slate-600/700 = text discret pe dark; in light trebuie sa ramana lizibil (bg/border-ul lor se inverseaza)
    '[data-theme-mode="light"] .text-slate-600, [data-theme-mode="light"] .text-slate-700': { color: '#526071' },
    '[data-theme-mode="light"] .border-white\\/5, [data-theme-mode="light"] .border-white\\/10, [data-theme-mode="light"] .border-white\\/20': { borderColor: 'rgb(15 23 42 / 0.12)' },
    '[data-theme-mode="light"] .bg-white\\/5, [data-theme-mode="light"] .bg-white\\/10': { backgroundColor: 'rgb(15 23 42 / 0.05)' },
  });
});
// ---- /Contrast ----

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        slate: slateColors,
        ...accentColors,
        'status-success': '#10b981', // emerald-500
        'status-danger': '#ef4444', // red-500
        'status-warning': '#f59e0b', // amber-500
        'brand': {
          DEFAULT: '#3b82f6', // blue-500
          dark: '#1d4ed8', // blue-700
          light: '#60a5fa', // blue-400
        }
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(59, 130, 246, 0.5)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.4s ease-out forwards',
        'fade-in-down': 'fade-in-down 0.2s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    }
  },
  plugins: [themeContrastPlugin],
}
