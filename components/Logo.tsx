import React from 'react';

export const QwanKiDoLogo: React.FC<{ className?: string; iconClassName?: string }> = ({ className = "h-12 w-12" }) => (
    <div className={`flex items-center justify-center rounded-full overflow-hidden ${className}`}>
        <img src="/favicon.png" alt="Qwan Ki Do Romania" className="w-full h-full object-cover" />
    </div>
);
