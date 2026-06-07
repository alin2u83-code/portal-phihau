import React, { useState } from 'react';
import { Modal, Button } from './ui';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import type { ThemeConfig } from '../types';
import { DEFAULT_THEME } from '../lib/themes';

interface ThemeEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveTab = 'predefined' | 'custom' | 'saved';

interface CustomThemeState {
  name: string;
  // Layout
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  // Primary action
  primary: string;
  // Sidebar
  sidebarBg: string;
  sidebarText: string;
  sidebarActive: string;
  // Header
  headerBg: string;
  headerBorder: string;
  // Tables
  tableHeaderBg: string;
  tableHeaderText: string;
  tableRowHover: string;
  // Status colors
  statusSuccess: string;
  statusDanger: string;
  statusWarning: string;
  statusInfo: string;
}

const DEFAULT_CUSTOM: CustomThemeState = {
  name: 'Temă Personalizată',
  bg: DEFAULT_THEME.bg,
  surface: DEFAULT_THEME.surface,
  surface2: DEFAULT_THEME.surface2,
  border: DEFAULT_THEME.border,
  text: DEFAULT_THEME.text,
  textMuted: DEFAULT_THEME.textMuted,
  primary: DEFAULT_THEME.primary,
  sidebarBg: DEFAULT_THEME.sidebarBg,
  sidebarText: DEFAULT_THEME.sidebarText,
  sidebarActive: DEFAULT_THEME.sidebarActive,
  headerBg: DEFAULT_THEME.headerBg,
  headerBorder: DEFAULT_THEME.headerBorder,
  tableHeaderBg: DEFAULT_THEME.tableHeaderBg,
  tableHeaderText: DEFAULT_THEME.tableHeaderText,
  tableRowHover: DEFAULT_THEME.tableRowHover,
  statusSuccess: DEFAULT_THEME.statusSuccess,
  statusDanger: DEFAULT_THEME.statusDanger,
  statusWarning: DEFAULT_THEME.statusWarning,
  statusInfo: DEFAULT_THEME.statusInfo,
};

function buildCustomThemeConfig(c: CustomThemeState): ThemeConfig {
  return {
    ...DEFAULT_THEME,
    name: c.name || 'Temă Personalizată',
    bg: c.bg,
    surface: c.surface,
    surface2: c.surface2,
    border: c.border,
    text: c.text,
    textMuted: c.textMuted,
    primary: c.primary,
    primaryHover: c.primary,
    primaryFg: '#ffffff',
    secondary: c.surface,
    secondaryHover: c.border,
    secondaryFg: c.text,
    sidebarBg: c.sidebarBg,
    sidebarText: c.sidebarText,
    sidebarActive: c.sidebarActive,
    sidebarActiveFg: '#ffffff',
    headerBg: c.headerBg,
    headerBorder: c.headerBorder,
    tableHeaderBg: c.tableHeaderBg,
    tableHeaderText: c.tableHeaderText,
    tableRowHover: c.tableRowHover,
    statusSuccess: c.statusSuccess,
    statusDanger: c.statusDanger,
    statusWarning: c.statusWarning,
    statusInfo: c.statusInfo,
  };
}

interface ColorPickerRowProps {
  label: string;
  field: keyof CustomThemeState;
  value: string;
  onChange: (field: keyof CustomThemeState, value: string) => void;
}

const ColorPickerRow: React.FC<ColorPickerRowProps> = ({ label, field, value, onChange }) => (
  <div className="flex items-center justify-between gap-3">
    <label className="text-xs text-slate-300 flex-1 min-w-0 truncate">{label}</label>
    <div className="flex items-center gap-2 shrink-0">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-slate-600 bg-transparent"
      />
      <span className="text-[10px] text-slate-500 font-mono w-16">{value}</span>
    </div>
  </div>
);

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/60 hover:bg-slate-700/50 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</span>
        <span className="text-slate-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2.5 bg-slate-900/30">
          {children}
        </div>
      )}
    </div>
  );
};

export const ThemeEditor: React.FC<ThemeEditorProps> = ({ isOpen, onClose }) => {
  const { currentTheme, setTheme, saveTheme, predefinedThemes } = useTheme();
  const { activeRoleContext } = useData();
  const permissions = usePermissions(activeRoleContext);

  const [activeTab, setActiveTab] = useState<ActiveTab>('predefined');
  const [selectedTheme, setSelectedTheme] = useState<ThemeConfig | null>(null);
  const [customTheme, setCustomTheme] = useState<CustomThemeState>(DEFAULT_CUSTOM);
  const [isSaving, setIsSaving] = useState(false);

  const handleSwatchClick = (theme: ThemeConfig) => {
    setTheme(theme);
    setSelectedTheme(theme);
  };

  const handleCustomColorChange = (field: keyof CustomThemeState, value: string) => {
    const updated = { ...customTheme, [field]: value };
    setCustomTheme(updated);
    const built = buildCustomThemeConfig(updated);
    setTheme(built);
    setSelectedTheme(built);
  };

  const getEffectiveTheme = (): ThemeConfig => {
    if (activeTab === 'custom') return buildCustomThemeConfig(customTheme);
    return selectedTheme ?? currentTheme;
  };

  const handleSaveUser = async () => {
    setIsSaving(true);
    try {
      await saveTheme(getEffectiveTheme(), 'user');
      onClose();
    } catch {
      // logat în ThemeContext
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClub = async () => {
    setIsSaving(true);
    try {
      await saveTheme(getEffectiveTheme(), 'club');
      onClose();
    } catch {
      // logat în ThemeContext
    } finally {
      setIsSaving(false);
    }
  };

  const tabButtonClass = (tab: ActiveTab) =>
    `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
      activeTab === tab
        ? 'border-sky-400 text-sky-400'
        : 'border-transparent text-slate-400 hover:text-slate-200'
    }`;

  const canApplyToClub = permissions.isAdminClub || permissions.isFederationAdmin;

  const ActionButtons = () => (
    <div className="flex flex-wrap gap-3 pt-2">
      <Button variant="primary" size="sm" onClick={handleSaveUser} disabled={isSaving} isLoading={isSaving}>
        Aplică doar mie
      </Button>
      {canApplyToClub && (
        <Button variant="secondary" size="sm" onClick={handleSaveClub} disabled={isSaving} isLoading={isSaving}>
          Aplică la tot clubul
        </Button>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Personalizare Temă">
      {/* Tab bar */}
      <div className="flex border-b border-slate-700 mb-6 -mt-1">
        <button className={tabButtonClass('predefined')} onClick={() => setActiveTab('predefined')}>
          Teme Predefinite
        </button>
        <button className={tabButtonClass('custom')} onClick={() => setActiveTab('custom')}>
          Personalizat
        </button>
        <button className={tabButtonClass('saved')} onClick={() => setActiveTab('saved')}>
          Temele Mele
        </button>
      </div>

      {/* Tab: Teme Predefinite */}
      {activeTab === 'predefined' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {predefinedThemes.map((theme) => {
              const isSelected =
                selectedTheme?.name === theme.name ||
                (!selectedTheme && currentTheme.name === theme.name);
              return (
                <button
                  key={theme.name}
                  onClick={() => handleSwatchClick(theme)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-sky-400 ring-2 ring-sky-400/40'
                      : 'border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  <div className="w-12 h-10 rounded-lg shadow-md border-2 border-slate-700/40 overflow-hidden flex">
                    <div style={{ width: '40%', background: theme.sidebarBg }} />
                    <div style={{ flex: 1, background: theme.bg }} />
                  </div>
                  <span className="text-xs text-slate-300 text-center leading-tight">{theme.name}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 mb-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Previzualizare butoane</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm">Primar</Button>
              <Button variant="secondary" size="sm">Secundar</Button>
              <Button variant="success" size="sm">Succes</Button>
              <Button variant="danger" size="sm">Eroare</Button>
            </div>
          </div>

          <ActionButtons />
        </div>
      )}

      {/* Tab: Personalizat */}
      {activeTab === 'custom' && (
        <div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Nume temă</label>
            <input
              type="text"
              value={customTheme.name}
              onChange={(e) => handleCustomColorChange('name', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="Tema mea personalizată"
            />
          </div>

          <div className="space-y-2 mb-6">
            <Section title="Layout & Text" defaultOpen>
              <ColorPickerRow label="Fundal principal" field="bg" value={customTheme.bg} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Suprafețe (carduri)" field="surface" value={customTheme.surface} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Suprafețe 2 (hover, badge bg)" field="surface2" value={customTheme.surface2} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Borduri" field="border" value={customTheme.border} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Text principal" field="text" value={customTheme.text} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Text secundar / labels" field="textMuted" value={customTheme.textMuted} onChange={handleCustomColorChange} />
            </Section>

            <Section title="Culoare Primară & Butoane">
              <ColorPickerRow label="Culoare primară (buton, accent)" field="primary" value={customTheme.primary} onChange={handleCustomColorChange} />
            </Section>

            <Section title="Sidebar">
              <ColorPickerRow label="Fundal sidebar" field="sidebarBg" value={customTheme.sidebarBg} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Text sidebar" field="sidebarText" value={customTheme.sidebarText} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Element activ sidebar" field="sidebarActive" value={customTheme.sidebarActive} onChange={handleCustomColorChange} />
            </Section>

            <Section title="Header (bara de sus)">
              <ColorPickerRow label="Fundal header" field="headerBg" value={customTheme.headerBg} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Bordură header" field="headerBorder" value={customTheme.headerBorder} onChange={handleCustomColorChange} />
            </Section>

            <Section title="Tabele">
              <ColorPickerRow label="Fundal header tabel" field="tableHeaderBg" value={customTheme.tableHeaderBg} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Text header tabel" field="tableHeaderText" value={customTheme.tableHeaderText} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Hover rând" field="tableRowHover" value={customTheme.tableRowHover} onChange={handleCustomColorChange} />
            </Section>

            <Section title="Statusuri & Badge-uri">
              <ColorPickerRow label="Succes (verde)" field="statusSuccess" value={customTheme.statusSuccess} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Eroare (roșu)" field="statusDanger" value={customTheme.statusDanger} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Avertizare (portocaliu)" field="statusWarning" value={customTheme.statusWarning} onChange={handleCustomColorChange} />
              <ColorPickerRow label="Informare (albastru)" field="statusInfo" value={customTheme.statusInfo} onChange={handleCustomColorChange} />
            </Section>
          </div>

          {/* Preview live */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Previzualizare</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm">Primar</Button>
              <Button variant="secondary" size="sm">Secundar</Button>
              <Button variant="success" size="sm">Succes</Button>
              <Button variant="danger" size="sm">Eroare</Button>
              <Button variant="warning" size="sm">Avertizare</Button>
              <Button variant="info" size="sm">Info</Button>
            </div>
          </div>

          <ActionButtons />
        </div>
      )}

      {/* Tab: Temele Mele */}
      {activeTab === 'saved' && (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-6">Temele salvate vor apărea aici.</p>
          <Button variant="secondary" size="sm" onClick={onClose}>Închide</Button>
        </div>
      )}
    </Modal>
  );
};
