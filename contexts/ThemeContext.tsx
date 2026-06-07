import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useData } from './DataContext';
import { supabase } from '../supabaseClient';
import type { ThemeConfig } from '../types';
import { PREDEFINED_THEMES, DEFAULT_THEME, applyTheme } from '../lib/themes';

interface ThemeContextValue {
  currentTheme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  saveTheme: (theme: ThemeConfig, scope: 'user' | 'club') => Promise<void>;
  predefinedThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { activeRoleContext, currentUser, clubs } = useData();
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const clubThemeRef = useRef<ThemeConfig | null>(null);

  // Effect 1 — la schimbarea clubului activ sau a listei de cluburi
  useEffect(() => {
    const activeClub = clubs.find(c => c.id === activeRoleContext?.club_id);
    const clubTheme = (activeClub?.tema_config as ThemeConfig | null) ?? null;
    clubThemeRef.current = clubTheme;

    if (clubTheme) {
      // Aplicăm tema clubului temporar; va fi suprascrisă de effect-ul 2 dacă user are override
      applyTheme(clubTheme);
      setCurrentTheme(clubTheme);
    }
  }, [activeRoleContext?.club_id, clubs]);

  // Effect 2 — la schimbarea utilizatorului curent; poate suprascrie tema clubului cu override user
  useEffect(() => {
    if (!currentUser?.id) {
      const fallback = clubThemeRef.current ?? DEFAULT_THEME;
      applyTheme(fallback);
      setCurrentTheme(fallback);
      return;
    }

    const fetchUserTheme = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('tema_config')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        // Utilizatorul nu are override sau eroare — folosim tema clubului sau default
        const fallback = clubThemeRef.current ?? DEFAULT_THEME;
        applyTheme(fallback);
        setCurrentTheme(fallback);
        return;
      }

      const resolvedTheme: ThemeConfig =
        (data?.tema_config as ThemeConfig | null) ??
        clubThemeRef.current ??
        DEFAULT_THEME;

      applyTheme(resolvedTheme);
      setCurrentTheme(resolvedTheme);
    };

    fetchUserTheme();
  }, [currentUser?.id]);

  // Preview live fără save — aplică tema pe DOM imediat
  const setTheme = useCallback((theme: ThemeConfig) => {
    applyTheme(theme);
    setCurrentTheme(theme);
  }, []);

  // Salvează tema în DB (user sau club) și aplică pe DOM
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

  const value: ThemeContextValue = {
    currentTheme,
    setTheme,
    saveTheme,
    predefinedThemes: PREDEFINED_THEMES,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
