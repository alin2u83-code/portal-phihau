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
  primary: string;
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  sidebarBg: string;
  sidebarText: string;
}

const DEFAULT_CUSTOM: CustomThemeState = {
  name: 'Temă Personalizată',
  primary: DEFAULT_THEME.primary,
  bg: DEFAULT_THEME.bg,
  surface: DEFAULT_THEME.surface,
  surface2: DEFAULT_THEME.surface2,
  border: DEFAULT_THEME.border,
  text: DEFAULT_THEME.text,
  textMuted: DEFAULT_THEME.textMuted,
  sidebarBg: DEFAULT_THEME.sidebarBg,
  sidebarText: DEFAULT_THEME.sidebarText,
};

function buildCustomThemeConfig(custom: CustomThemeState): ThemeConfig {
  return {
    ...DEFAULT_THEME,
    name: custom.name || 'Temă Personalizată',
    primary: custom.primary,
    primaryHover: custom.primary,
    bg: custom.bg,
    surface: custom.surface,
    surface2: custom.surface2,
    border: custom.border,
    text: custom.text,
    textMuted: custom.textMuted,
    secondary: custom.surface,
    secondaryHover: custom.border,
    secondaryFg: custom.text,
    sidebarBg: custom.sidebarBg,
    sidebarText: custom.sidebarText,
    sidebarActive: custom.primary,
    sidebarActiveFg: '#ffffff',
  };
}

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
    if (activeTab === 'custom') {
      return buildCustomThemeConfig(customTheme);
    }
    return selectedTheme ?? currentTheme;
  };

  const handleSaveUser = async () => {
    setIsSaving(true);
    try {
      await saveTheme(getEffectiveTheme(), 'user');
      onClose();
    } catch {
      // Eroarea e logată în ThemeContext
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
      // Eroarea e logată în ThemeContext
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Personalizare Tema">
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
                  <span className="text-xs text-slate-300 text-center leading-tight">
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Preview live */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 mb-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Previzualizare butoane
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm">
                Exemplu primar
              </Button>
              <Button variant="secondary" size="sm">
                Exemplu secundar
              </Button>
            </div>
          </div>

          {/* Butoane acțiune */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveUser}
              disabled={isSaving}
              isLoading={isSaving}
            >
              Aplica doar mie
            </Button>
            {canApplyToClub && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveClub}
                disabled={isSaving}
                isLoading={isSaving}
              >
                Aplica la tot clubul
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Tab: Personalizat */}
      {activeTab === 'custom' && (
        <div>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nume tema</label>
              <input
                type="text"
                value={customTheme.name}
                onChange={(e) => handleCustomColorChange('name', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                placeholder="Tema mea personalizata"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Culoare primara</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customTheme.primary}
                    onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
                  />
                  <span className="text-xs text-slate-500 font-mono">{customTheme.primary}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Fundal</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customTheme.bg}
                    onChange={(e) => handleCustomColorChange('bg', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
                  />
                  <span className="text-xs text-slate-500 font-mono">{customTheme.bg}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Suprafete</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customTheme.surface}
                    onChange={(e) => handleCustomColorChange('surface', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
                  />
                  <span className="text-xs text-slate-500 font-mono">{customTheme.surface}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Borduri</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customTheme.border}
                    onChange={(e) => handleCustomColorChange('border', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
                  />
                  <span className="text-xs text-slate-500 font-mono">{customTheme.border}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Text principal</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customTheme.text}
                    onChange={(e) => handleCustomColorChange('text', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
                  />
                  <span className="text-xs text-slate-500 font-mono">{customTheme.text}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Text secundar</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customTheme.textMuted}
                    onChange={(e) => handleCustomColorChange('textMuted', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
                  />
                  <span className="text-xs text-slate-500 font-mono">{customTheme.textMuted}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Suprafețe 2</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customTheme.surface2}
                    onChange={(e) => handleCustomColorChange('surface2', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
                  />
                  <span className="text-xs text-slate-500 font-mono">{customTheme.surface2}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block text-xs text-slate-400 mb-1">Text sidebar</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customTheme.sidebarText}
                    onChange={(e) => handleCustomColorChange('sidebarText', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
                  />
                  <span className="text-xs text-slate-500 font-mono">{customTheme.sidebarText}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Preview live */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 mb-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Previzualizare butoane
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm">
                Exemplu primar
              </Button>
              <Button variant="secondary" size="sm">
                Exemplu secundar
              </Button>
            </div>
          </div>

          {/* Butoane acțiune */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveUser}
              disabled={isSaving}
              isLoading={isSaving}
            >
              Aplica doar mie
            </Button>
            {canApplyToClub && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveClub}
                disabled={isSaving}
                isLoading={isSaving}
              >
                Aplica la tot clubul
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Tab: Temele Mele */}
      {activeTab === 'saved' && (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-6">Temele salvate vor aparea aici.</p>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Inchide
          </Button>
        </div>
      )}
    </Modal>
  );
};
