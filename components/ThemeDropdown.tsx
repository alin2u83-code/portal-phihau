import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Palette } from 'lucide-react';

interface ThemeDropdownProps {
  onOpenAdvanced: () => void;
}

export const ThemeDropdown: React.FC<ThemeDropdownProps> = ({ onOpenAdvanced }) => {
  const { predefinedThemes, currentTheme, setTheme, saveTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
      <button
        onClick={() => setIsOpen(v => !v)}
        title="Personalizare temă"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
          isOpen
            ? 'bg-slate-700 border-slate-600 text-white'
            : 'text-slate-400 border-slate-700/60 hover:text-slate-200 hover:border-slate-600 hover:bg-slate-800/60'
        }`}
      >
        <Palette className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Temă</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-700/80 shadow-2xl z-[9999] overflow-hidden"
          style={{ background: 'var(--t-surface)' }}
        >
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

          <div className="px-3 pb-3 flex gap-2">
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
