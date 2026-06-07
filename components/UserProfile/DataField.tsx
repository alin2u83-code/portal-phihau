import React from 'react';

export const DataField: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div>
        <dt className="text-sm font-medium text-slate-300">{label}</dt>
        <dd className="mt-1 text-base text-slate-100 font-semibold">{value || 'N/A'}</dd>
    </div>
);
