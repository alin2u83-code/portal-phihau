import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { View } from '../types';

interface NavigationContextType {
    activeView: View;
    setActiveView: (view: View) => void;
    viewParams: any;
    setViewParams: (params: any) => void;
    navigateTo: (view: View, params?: any) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeView, setActiveView] = useLocalStorage<View>('phi-hau-active-view', 'dashboard');
    const [viewParams, setViewParams] = useState<any>(null);

    const navigateTo = (view: View, params: any = null) => {
        setActiveView(view);
        setViewParams(params);
    };

    return (
        <NavigationContext.Provider value={{ activeView, setActiveView, viewParams, setViewParams, navigateTo }}>
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
