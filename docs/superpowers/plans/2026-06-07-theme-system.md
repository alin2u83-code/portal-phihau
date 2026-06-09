# Theme System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adaugă dropdown compact de teme în Header (Variant B) cu preset-uri + override accent, extinde ThemeConfig cu tokeni sidebar, wires Sidebar la CSS vars, și adaugă script anti-FOUC în index.html.

**Architecture:** Infrastructura există deja (`lib/themes.ts`, `ThemeContext`, `ThemeEditor` modal). Planul extinde ThemeConfig cu `sidebarBg/sidebarText/sidebarActive`, actualizează `applyTheme()`, înlocuiește culorile hardcodate din Sidebar cu `var(--t-sidebar-*)`, creează un nou `ThemeDropdown` inline în Header, și adaugă script `<head>` anti-FOUC în `index.html`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, CSS custom properties (`--t-*` prefix), Zustand (via ThemeContext), Supabase (saveTheme există deja)

---

## File Map

| Fișier | Operație | Responsabilitate |
|--------|----------|-----------------|
| `types.ts:727` | Modify | Adaugă `sidebarBg`, `sidebarText`, `sidebarActive`, `sidebarActiveFg` la ThemeConfig |
| `lib/themes.ts` | Modify | applyTheme() + tokeni noi, update toate 8 teme, adaugă 2 teme light |
| `components/ThemeDropdown.tsx` | Create | Dropdown compact în header: preset grid + accent override + link avansat |
| `components/Header.tsx` | Modify | Adaugă ThemeDropdown în zona dreaptă, acceptă `onOpenThemeEditor` prop |
| `components/AppLayout.tsx` | Modify | Pasează `onOpenThemeEditor` la Header |
| `components/Sidebar.tsx` | Modify | Înlocuiește `bg-gradient from-slate-900` cu `style={{ background: 'var(--t-sidebar-bg)' }}` |
| `index.html` | Modify | Script anti-FOUC în `<head>` — aplică tema din localStorage înainte de React mount |

---

## Task 1: Extinde ThemeConfig cu tokeni sidebar

**Fișiere:**
- Modify: `types.ts:727-741`
- Modify: `lib/themes.ts:1-148`

- [ ] **Step 1.1: Extinde interfața ThemeConfig în types.ts**

Înlocuiește blocul ThemeConfig (linia 727-741) cu:

```typescript
export interface ThemeConfig {
  name: string;
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  primaryFg: string;
  secondary: string;
  secondaryHover: string;
  secondaryFg: string;
  // Sidebar tokens
  sidebarBg: string;
  sidebarText: string;
  sidebarActive: string;
  sidebarActiveFg: string;
}
```

- [ ] **Step 1.2: Actualizează `applyTheme()` în lib/themes.ts**

Înlocuiește funcția `applyTheme` (linia 134-148) cu:

```typescript
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
  root.style.setProperty('--t-sidebar-bg', theme.sidebarBg);
  root.style.setProperty('--t-sidebar-text', theme.sidebarText);
  root.style.setProperty('--t-sidebar-active', theme.sidebarActive);
  root.style.setProperty('--t-sidebar-active-fg', theme.sidebarActiveFg);
}
```

- [ ] **Step 1.3: Actualizează DEFAULT_THEME și toate PREDEFINED_THEMES cu tokenii noi**

Înlocuiește tot conținutul `lib/themes.ts` cu:

```typescript
import type { ThemeConfig } from '../types';

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
  sidebarBg: '#020617',
  sidebarText: '#94a3b8',
  sidebarActive: '#3b82f6',
  sidebarActiveFg: '#ffffff',
};

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
    sidebarBg: '#010b18',
    sidebarText: '#7ea5c8',
    sidebarActive: '#1d4ed8',
    sidebarActiveFg: '#ffffff',
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
    sidebarBg: '#021208',
    sidebarText: '#6ee7a0',
    sidebarActive: '#16a34a',
    sidebarActiveFg: '#ffffff',
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
    sidebarBg: '#0f0505',
    sidebarText: '#f87171',
    sidebarActive: '#dc2626',
    sidebarActiveFg: '#ffffff',
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
    sidebarBg: '#0a0514',
    sidebarText: '#a78bfa',
    sidebarActive: '#7c3aed',
    sidebarActiveFg: '#ffffff',
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
    sidebarBg: '#0c0a02',
    sidebarText: '#fbbf24',
    sidebarActive: '#d97706',
    sidebarActiveFg: '#ffffff',
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
    sidebarBg: '#020c0f',
    sidebarText: '#67e8f9',
    sidebarActive: '#0891b2',
    sidebarActiveFg: '#ffffff',
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
    sidebarBg: '#030303',
    sidebarText: '#737373',
    sidebarActive: '#525252',
    sidebarActiveFg: '#ffffff',
  },
  // Teme light (noi)
  {
    name: 'Office Light',
    bg: '#f4f6fa',
    surface: '#ffffff',
    surface2: '#f1f5f9',
    border: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#64748b',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryFg: '#ffffff',
    secondary: '#f1f5f9',
    secondaryHover: '#e2e8f0',
    secondaryFg: '#334155',
    sidebarBg: '#1e3a5f',
    sidebarText: '#cbd5e1',
    sidebarActive: '#3b82f6',
    sidebarActiveFg: '#ffffff',
  },
  {
    name: 'Snow',
    bg: '#ffffff',
    surface: '#f8fafc',
    surface2: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#475569',
    primary: '#7c3aed',
    primaryHover: '#6d28d9',
    primaryFg: '#ffffff',
    secondary: '#f1f5f9',
    secondaryHover: '#e2e8f0',
    secondaryFg: '#334155',
    sidebarBg: '#4c1d95',
    sidebarText: '#ddd6fe',
    sidebarActive: '#7c3aed',
    sidebarActiveFg: '#ffffff',
  },
];

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
  root.style.setProperty('--t-sidebar-bg', theme.sidebarBg);
  root.style.setProperty('--t-sidebar-text', theme.sidebarText);
  root.style.setProperty('--t-sidebar-active', theme.sidebarActive);
  root.style.setProperty('--t-sidebar-active-fg', theme.sidebarActiveFg);
}
```

- [ ] **Step 1.4: Verificare TypeScript — niciun error**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Rezultat așteptat: 0 erori legate de ThemeConfig.

- [ ] **Step 1.5: Commit**

```bash
git add types.ts lib/themes.ts
git commit -m "feat(theme): extend ThemeConfig with sidebar tokens + add light themes"
```

---

## Task 2: Wire Sidebar la CSS vars

**Fișiere:**
- Modify: `components/Sidebar.tsx`

- [ ] **Step 2.1: Înlocuiește fundalul hardcodat din `buildSidebarContent`**

La linia 129, înlocuiește:
```tsx
<div data-tutorial="sidebar" className="flex flex-col h-full min-h-0 text-slate-200 shadow-2xl">
    {/* Background */}
    <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 pointer-events-none" />
    <div className="absolute inset-0 border-r border-slate-800/80 pointer-events-none" />
```

cu:
```tsx
<div
    data-tutorial="sidebar"
    className="flex flex-col h-full min-h-0 shadow-2xl"
    style={{ background: 'var(--t-sidebar-bg)', color: 'var(--t-sidebar-text)' }}
>
    <div className="absolute inset-0 border-r border-white/5 pointer-events-none" />
```

- [ ] **Step 2.2: Actualizează NavMenu — item activ și hover**

Găsește în Sidebar.tsx (sau în componenta NavMenu din Sidebar) logica pentru item activ din nav. Caută pattern-ul unde se aplică clasa activă pe nav item. Înlocuiește culorile hardcodate pentru item activ:

Caută:
```tsx
// pattern cu bg-sky-500, bg-blue-600, sau bg-slate-700 pe nav item activ
```

Adaugă `style` inline pentru item activ:
```tsx
style={isActive ? {
  background: 'var(--t-sidebar-active)',
  color: 'var(--t-sidebar-active-fg)',
} : undefined}
```

> **Notă:** Caută în Sidebar.tsx după `NavMenu` sau componentele nav inline. Aplică `style` pe elementul `<button>` sau `<div>` al nav item-ului activ, fără să elimini clasele existente de padding/border-radius.

- [ ] **Step 2.3: Actualizează butonul "Tema" din sidebar**

La linia 183, înlocuiește clasele de culoare text:
```tsx
className={`w-full flex items-center ${effectiveExpanded ? 'gap-2 px-3 py-2' : 'justify-center p-2.5'} rounded-xl text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all border border-slate-700/40`}
```

cu:
```tsx
className={`w-full flex items-center ${effectiveExpanded ? 'gap-2 px-3 py-2' : 'justify-center p-2.5'} rounded-xl transition-all border border-white/10`}
style={{ color: 'var(--t-sidebar-text)', opacity: 0.7 }}
```

- [ ] **Step 2.4: Verificare vizuală**

Pornește dev server: `npm run dev`

Deschide app. Sidebar trebuie să aibă fundalul din `sidebarBg` al DEFAULT_THEME (`#020617`). Schimbă tema la "Office Light" din ThemeEditor (modal existent în sidebar) — sidebar-ul trebuie să devină `#1e3a5f`.

- [ ] **Step 2.5: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "feat(theme): wire Sidebar to CSS vars --t-sidebar-*"
```

---

## Task 3: Creează ThemeDropdown component (Variant B)

**Fișiere:**
- Create: `components/ThemeDropdown.tsx`

- [ ] **Step 3.1: Creează fișierul**

```tsx
// components/ThemeDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { PaletteIcon } from './icons';

interface ThemeDropdownProps {
  onOpenAdvanced: () => void;
}

export const ThemeDropdown: React.FC<ThemeDropdownProps> = ({ onOpenAdvanced }) => {
  const { predefinedThemes, currentTheme, setTheme, saveTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Închide la click în afară
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Închide la Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handlePickTheme = (theme: typeof predefinedThemes[0]) => {
    setTheme(theme);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveTheme(currentTheme, 'user');
    } finally {
      setIsSaving(false);
      setIsOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(v => !v)}
        title="Personalizare temă"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
          isOpen
            ? 'bg-slate-700 border-slate-600 text-white'
            : 'text-slate-400 border-slate-700/60 hover:text-slate-200 hover:border-slate-600 hover:bg-slate-800/60'
        }`}
      >
        <PaletteIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Temă</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-700/80 shadow-2xl z-[9999] overflow-hidden"
          style={{ background: 'var(--t-surface)' }}
        >
          {/* Header */}
          <div
            className="px-3 py-2.5 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--t-border)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--t-text)' }}>
              Temă aplicație
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-300 text-sm leading-none px-1"
            >
              ×
            </button>
          </div>

          {/* Preset grid */}
          <div className="p-3">
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {predefinedThemes.map(theme => {
                const isActive = theme.name === currentTheme.name;
                return (
                  <button
                    key={theme.name}
                    onClick={() => handlePickTheme(theme)}
                    title={theme.name}
                    className={`flex flex-col gap-1 p-1 rounded-lg border transition-all ${
                      isActive
                        ? 'border-sky-400 ring-1 ring-sky-400/40'
                        : 'border-transparent hover:border-slate-600'
                    }`}
                  >
                    {/* Mini swatch: sidebar + bg */}
                    <div
                      className="w-full h-7 rounded overflow-hidden flex"
                      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div style={{ width: '35%', background: theme.sidebarBg }} />
                      <div style={{ flex: 1, background: theme.bg }} />
                    </div>
                    <span
                      className="text-[8px] text-center leading-tight truncate w-full"
                      style={{ color: isActive ? 'var(--t-primary)' : 'var(--t-text-muted)' }}
                    >
                      {theme.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tema curentă preview */}
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-3"
              style={{ background: 'var(--t-surface-2)' }}
            >
              <div
                className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                style={{ background: 'var(--t-primary)' }}
              />
              <span className="text-xs flex-1 truncate" style={{ color: 'var(--t-text)' }}>
                {currentTheme.name}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div
            className="px-3 pb-3 flex gap-2"
          >
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'var(--t-primary)',
                color: 'var(--t-primary-fg)',
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? 'Se salvează...' : 'Salvează'}
            </button>
            <button
              onClick={() => { setIsOpen(false); onOpenAdvanced(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                borderColor: 'var(--t-border)',
                color: 'var(--t-text-muted)',
              }}
            >
              Avansat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3.2: Verificare TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep ThemeDropdown
```

Rezultat așteptat: niciun output (zero erori).

- [ ] **Step 3.3: Commit**

```bash
git add components/ThemeDropdown.tsx
git commit -m "feat(theme): add ThemeDropdown compact header component (Variant B)"
```

---

## Task 4: Integrează ThemeDropdown în Header

**Fișiere:**
- Modify: `components/Header.tsx`
- Modify: `components/AppLayout.tsx`

- [ ] **Step 4.1: Actualizează `HeaderProps` în Header.tsx**

La linia 10, adaugă prop-ul nou în interfață:
```tsx
interface HeaderProps {
    onBack: () => void;
    currentUser: User;
    permissions?: Permissions;
    onLogout: () => void;
    isSidebarExpanded: boolean;
    userRoles?: any[];
    onSwitchRole?: (context: any) => void;
    onOpenMobileSidebar?: () => void;
    onOpenThemeEditor: () => void;    // <-- adaugă
}
```

- [ ] **Step 4.2: Adaugă import ThemeDropdown în Header.tsx**

La top-ul fișierului, adaugă:
```tsx
import { ThemeDropdown } from './ThemeDropdown';
```

- [ ] **Step 4.3: Adaugă `onOpenThemeEditor` în destructuring și JSX**

În funcția componentei, adaugă `onOpenThemeEditor` la destructuring (linia 58):
```tsx
export const Header: React.FC<HeaderProps> = ({
    onBack,
    currentUser,
    permissions,
    onLogout,
    isSidebarExpanded,
    userRoles,
    onSwitchRole,
    onOpenMobileSidebar,
    onOpenThemeEditor,    // <-- adaugă
}) => {
```

- [ ] **Step 4.4: Adaugă ThemeDropdown în zona dreaptă a Header-ului**

La linia 152, în `<div className="flex items-center gap-2 md:gap-3 flex-shrink-0">`, adaugă `ThemeDropdown` înaintea separatorului:

```tsx
{/* Right: Theme + Notifications & User Menu */}
<div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
    <ThemeDropdown onOpenAdvanced={onOpenThemeEditor} />

    <div className="h-6 w-px bg-slate-800 hidden md:block" />

    {currentUser && <NotificationBell currentUser={currentUser} />}

    <div className="h-6 w-px bg-slate-800 hidden md:block" />

    <UserMenu
        currentUser={currentUser}
        permissions={permissions}
        onNavigate={setActiveView}
        onLogout={onLogout}
        userRoles={userRoles}
        onSwitchRole={onSwitchRole}
    />
</div>
```

- [ ] **Step 4.5: Actualizează AppLayout.tsx — pasează `onOpenThemeEditor` la Header**

La linia 68-77 în AppLayout.tsx, adaugă prop-ul la `<Header>`:

```tsx
<Header
    onBack={handleBackToDashboard}
    currentUser={currentUser}
    permissions={permissions}
    onLogout={handleLogout}
    isSidebarExpanded={isSidebarExpanded}
    userRoles={userRoles}
    onSwitchRole={onSwitchRole}
    onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
    onOpenThemeEditor={() => setIsThemeEditorOpen(true)}   // <-- adaugă
/>
```

- [ ] **Step 4.6: Verificare TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Rezultat așteptat: 0 erori.

- [ ] **Step 4.7: Test manual**

1. `npm run dev`
2. Login în aplicație
3. Header → buton "🎨 Temă" trebuie să fie vizibil în dreapta
4. Click → dropdown cu 10 preset swatches (5 per rând) + buton "Salvează" + buton "Avansat"
5. Click pe "Office Light" → sidebar și fundalul trebuie să se schimbe instant
6. Click "Avansat" → deschide ThemeEditor modal
7. Click "Salvează" → tema se salvează la user în Supabase

- [ ] **Step 4.8: Commit**

```bash
git add components/Header.tsx components/AppLayout.tsx
git commit -m "feat(theme): add ThemeDropdown to Header, wire onOpenThemeEditor prop"
```

---

## Task 5: Anti-FOUC script în index.html

**Fișiere:**
- Modify: `index.html`

- [ ] **Step 5.1: Adaugă script inline în `<head>` din index.html**

Găsește `</head>` în index.html și adaugă scriptul înaintea lui:

```html
<!-- Anti-FOUC: aplică tema din localStorage înainte de React mount -->
<script>
  try {
    var saved = localStorage.getItem('phihau-theme');
    if (saved) {
      var t = JSON.parse(saved);
      var r = document.documentElement;
      if (t.bg) r.style.setProperty('--t-bg', t.bg);
      if (t.surface) r.style.setProperty('--t-surface', t.surface);
      if (t.surface2) r.style.setProperty('--t-surface-2', t.surface2);
      if (t.border) r.style.setProperty('--t-border', t.border);
      if (t.text) r.style.setProperty('--t-text', t.text);
      if (t.textMuted) r.style.setProperty('--t-text-muted', t.textMuted);
      if (t.primary) r.style.setProperty('--t-primary', t.primary);
      if (t.primaryHover) r.style.setProperty('--t-primary-hover', t.primaryHover);
      if (t.primaryFg) r.style.setProperty('--t-primary-fg', t.primaryFg);
      if (t.secondary) r.style.setProperty('--t-secondary', t.secondary);
      if (t.secondaryHover) r.style.setProperty('--t-secondary-hover', t.secondaryHover);
      if (t.secondaryFg) r.style.setProperty('--t-secondary-fg', t.secondaryFg);
      if (t.sidebarBg) r.style.setProperty('--t-sidebar-bg', t.sidebarBg);
      if (t.sidebarText) r.style.setProperty('--t-sidebar-text', t.sidebarText);
      if (t.sidebarActive) r.style.setProperty('--t-sidebar-active', t.sidebarActive);
      if (t.sidebarActiveFg) r.style.setProperty('--t-sidebar-active-fg', t.sidebarActiveFg);
    }
  } catch (e) {}
</script>
```

> **Notă:** ThemeContext.tsx face fetch Supabase async. Scriptul de mai sus aplică instantaneu din localStorage ca fallback, evitând flash-ul. ThemeContext.tsx trebuie să salveze și în localStorage la `saveTheme`.

- [ ] **Step 5.2: Adaugă save în localStorage în ThemeContext.tsx**

În `saveTheme` din ThemeContext.tsx (linia 77), adaugă salvare în localStorage după salvarea în Supabase:

```tsx
const saveTheme = useCallback(async (theme: ThemeConfig, scope: 'user' | 'club') => {
  let error;

  if (scope === 'user') {
    ({ error } = await supabase
      .from('users')
      .update({ tema_config: theme })
      .eq('id', currentUser?.id));
  } else {
    ({ error } = await supabase
      .from('cluburi')
      .update({ tema_config: theme })
      .eq('id', activeRoleContext?.club_id));
  }

  if (error) {
    throw error;
  }

  // Salvează în localStorage pentru anti-FOUC la reload
  if (scope === 'user') {
    localStorage.setItem('phihau-theme', JSON.stringify(theme));
  }

  applyTheme(theme);
  setCurrentTheme(theme);
}, [currentUser?.id, activeRoleContext?.club_id]);
```

- [ ] **Step 5.3: Test FOUC**

1. Selectează tema "Office Light" și salvează
2. Hard refresh (`Ctrl+Shift+R`)
3. Observă: sidebar-ul trebuie să apară deja cu culoarea corectă fără flash la culoarea dark

- [ ] **Step 5.4: Commit**

```bash
git add index.html contexts/ThemeContext.tsx
git commit -m "feat(theme): add anti-FOUC script in index.html + localStorage persist"
```

---

## Task 6: Actualizează ThemeEditor modal — suport teme light

**Fișiere:**
- Modify: `components/ThemeEditor.tsx`

- [ ] **Step 6.1: Actualizează `DEFAULT_CUSTOM` cu câmpurile noi**

La linia 24, înlocuiește:
```tsx
const DEFAULT_CUSTOM: CustomThemeState = {
  name: 'Temă Personalizată',
  primary: DEFAULT_THEME.primary,
  bg: DEFAULT_THEME.bg,
  surface: DEFAULT_THEME.surface,
  border: DEFAULT_THEME.border,
};
```

cu:
```tsx
const DEFAULT_CUSTOM: CustomThemeState = {
  name: 'Temă Personalizată',
  primary: DEFAULT_THEME.primary,
  bg: DEFAULT_THEME.bg,
  surface: DEFAULT_THEME.surface,
  border: DEFAULT_THEME.border,
  sidebarBg: DEFAULT_THEME.sidebarBg,
};
```

- [ ] **Step 6.2: Extinde interfața `CustomThemeState`**

La linia 16:
```tsx
interface CustomThemeState {
  name: string;
  primary: string;
  bg: string;
  surface: string;
  border: string;
  sidebarBg: string;
}
```

- [ ] **Step 6.3: Actualizează `buildCustomThemeConfig`**

```tsx
function buildCustomThemeConfig(custom: CustomThemeState): ThemeConfig {
  return {
    ...DEFAULT_THEME,
    name: custom.name || 'Temă Personalizată',
    primary: custom.primary,
    primaryHover: custom.primary,
    bg: custom.bg,
    surface: custom.surface,
    surface2: custom.surface,
    border: custom.border,
    secondary: custom.surface,
    secondaryHover: custom.border,
    sidebarBg: custom.sidebarBg,
    sidebarText: DEFAULT_THEME.sidebarText,
    sidebarActive: custom.primary,
    sidebarActiveFg: '#ffffff',
  };
}
```

- [ ] **Step 6.4: Adaugă color picker pentru Sidebar în tab-ul Custom**

În tab-ul "Personalizat" (după `border` input-ul, linia ~260), adaugă:

```tsx
<div>
  <label className="block text-xs text-slate-400 mb-1">Fundal sidebar</label>
  <div className="flex items-center gap-2">
    <input
      type="color"
      value={customTheme.sidebarBg}
      onChange={(e) => handleCustomColorChange('sidebarBg', e.target.value)}
      className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
    />
    <span className="text-xs text-slate-500 font-mono">{customTheme.sidebarBg}</span>
  </div>
</div>
```

- [ ] **Step 6.5: Actualizează preview în ThemeEditor**

În tab-ul "Teme Predefinite", înlocuiește swatch-ul `w-12 h-12` cu mini sidebar preview:

```tsx
<div className="w-12 h-10 rounded-lg shadow-md border-2 border-slate-700/40 overflow-hidden flex">
  <div style={{ width: '40%', background: theme.sidebarBg }} />
  <div style={{ flex: 1, background: theme.bg }} />
</div>
```

- [ ] **Step 6.6: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 6.7: Commit**

```bash
git add components/ThemeEditor.tsx
git commit -m "feat(theme): extend ThemeEditor with sidebar color + update preset previews"
```

---

## Verificare Finală

- [ ] `npm run dev` — aplicație pornește fără erori
- [ ] Header: buton 🎨 Temă vizibil pe desktop și mobil
- [ ] Dropdown: 10 preset swatches, click schimbă tema instant
- [ ] "Avansat" → deschide ThemeEditor modal
- [ ] "Salvează" → theme persistă la reload (localStorage) și la alt dispozitiv (Supabase)
- [ ] Sidebar: culoarea urmărește tema selectată (nu mai e fixă slate-900)
- [ ] Tema "Office Light" → sidebar albastru închis, fundal gri-alb
- [ ] Hard refresh: niciun flash de culoare (anti-FOUC funcționează)
- [ ] `npx tsc --noEmit` → 0 erori

---

## Note Implementare

**Tokenii `--t-sidebar-*`** acoperă sidebar-ul. Componente ca tabele, butoane, carduri din `ui.tsx` folosesc deja `--t-primary`, `--t-surface`, `--t-border` prin stilizare inline sau CSS. Migrarea completă Tailwind → CSS vars pe toate componentele e un task separat, de făcut progresiv.

**`onOpenThemeEditor` în Header:** Header-ul primește acest prop din AppLayout. Nu trece prin ThemeContext pentru a evita cuplaj inutil.

**Supabase column `tema_config`:** Câmpul există deja pe tabela `users` (confirmat în ThemeContext.tsx linia 48: `.select('tema_config')`). Nu necesită migrație DB.
