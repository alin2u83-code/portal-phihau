import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';

interface ClubGuardProps {
    children: React.ReactNode;
}

export const ClubGuard: React.FC<ClubGuardProps> = ({ children }) => {
    const { loading, activeRoleContext } = useData();
    const permissions = usePermissions(activeRoleContext);

    if (loading) {
        return <div className="flex items-center justify-center h-screen text-white">Se încarcă permisiunile...</div>;
    }

    return <>{children}</>;
};
