import React from 'react';

interface UserStatusBadgeProps {
    activeRoleContext: any;
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({ activeRoleContext }) => {
    if (!activeRoleContext) return null;

    const isInstructor = activeRoleContext.rol_denumire === 'INSTRUCTOR';
    const name = activeRoleContext.nume_utilizator_cache || 'Utilizator';

    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
            <span className="text-sm font-medium text-white">{name}</span>
            {isInstructor && (
                <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold rounded-full border border-yellow-500">
                    Võ Sư
                </span>
            )}
        </div>
    );
};
