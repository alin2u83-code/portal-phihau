import React, { createContext, useContext, ReactNode } from 'react';
import { useDataProvider } from '../hooks/useDataProvider';

type DataContextType = ReturnType<typeof useDataProvider>;

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const data = useDataProvider();

    return (
        <DataContext.Provider value={data}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
