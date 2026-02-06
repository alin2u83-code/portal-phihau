import React, { useState, useEffect } from 'react';
import { Card } from './ui';

interface ProtectedGateProps {
    children: React.ReactNode;
    onRedirect: () => void;
    fallback?: React.ReactNode;
    isAuthorized: boolean | null;
}

const DefaultFallback: React.FC = () => (
    <Card className="my-16">
        <div className="flex flex-col items-center justify-center p-8 text-center">
            <svg className="animate-spin h-8 w-8 text-[var(--brand-secondary)] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h1 className="text-xl font-bold text-white">Verificare permisiuni...</h1>
            <p className="mt-2 text-slate-400">Se validează drepturile de acces.</p>
        </div>
    </Card>
);

export const ProtectedGate: React.FC<ProtectedGateProps> = ({ children, onRedirect, fallback = <DefaultFallback />, isAuthorized }) => {
    useEffect(() => {
        if (isAuthorized === false) {
            setTimeout(onRedirect, 0);
        }
    }, [isAuthorized, onRedirect]);

    if (isAuthorized === null) {
        return <>{fallback}</>;
    }

    if (isAuthorized) {
        return <>{children}</>;
    }

    return null;
};
