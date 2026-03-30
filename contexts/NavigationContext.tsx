import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { View } from '../types';

interface HistoryEntry {
    view: View;
    params: any;
}

interface NavigationContextType {
    activeView: View;
    setActiveView: (view: View) => void;
    viewParams: any;
    setViewParams: (params: any) => void;
    navigateTo: (view: View, params?: any) => void;
    /** Navigare din sidebar/meniu principal — golește history */
    navigateRoot: (view: View) => void;
    /** Mergi înapoi la ecranul anterior */
    goBack: () => void;
    canGoBack: boolean;
    previousView: View | null;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const MAX_HISTORY = 15;

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeView, setStoredView] = useLocalStorage<View>('phi-hau-active-view', 'dashboard');
    const [viewParams, setViewParams] = useState<any>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    const pushToHistory = useCallback((view: View, params: any) => {
        setHistory(prev => {
            const next = [...prev, { view, params }];
            return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
        });
    }, []);

    const setActiveView = useCallback((view: View) => {
        pushToHistory(activeView, viewParams);
        setStoredView(view);
        setViewParams(null);
    }, [activeView, viewParams, pushToHistory, setStoredView]);

    const navigateRoot = useCallback((view: View) => {
        setHistory([]);
        setStoredView(view);
        setViewParams(null);
    }, [setStoredView]);

    const navigateTo = useCallback((view: View, params: any = null) => {
        pushToHistory(activeView, viewParams);
        setStoredView(view);
        setViewParams(params ?? null);
    }, [activeView, viewParams, pushToHistory, setStoredView]);

    const goBack = useCallback(() => {
        if (history.length === 0) return;
        const entry = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        setStoredView(entry.view);
        setViewParams(entry.params);
    }, [history, setStoredView]);

    const canGoBack = history.length > 0;
    const previousView = canGoBack ? history[history.length - 1].view : null;

    return (
        <NavigationContext.Provider value={{ activeView, setActiveView, viewParams, setViewParams, navigateTo, navigateRoot, goBack, canGoBack, previousView }}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};
