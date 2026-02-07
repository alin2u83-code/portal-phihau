
import React from 'react';
import { User } from '../types';

export const WelcomeHero: React.FC<{ profile: User }> = ({ profile }) => {
    
    const { roleName, roleStyle } = React.useMemo(() => {
        const userRoles = profile.roluri || [];
        const highestRole = userRoles.length > 0 ? userRoles[0] : null; // Assuming roles are sorted by importance
        const name = highestRole?.nume || 'Sportiv';
        
        let style = 'bg-emerald-500/20 text-emerald-300';
        if (name === 'Admin Club' || name === 'Admin' || name === 'SUPER_ADMIN_FEDERATIE') {
            style = 'bg-red-500/20 text-red-300';
        } else if (name === 'Instructor') {
            style = 'bg-sky-500/20 text-sky-300';
        }
        
        return { roleName: name.replace(/_/g, ' ').toLowerCase(), roleStyle: style };
    }, [profile]);
    
    return (
        <div className="glass-card p-6 md:p-8">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
                Bun venit, {profile.prenume}!
            </h2>
            <p className="text-slate-400 mt-1">Sunteți autentificat ca <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${roleStyle}`}>{roleName}</span>.</p>
        </div>
    );
};
