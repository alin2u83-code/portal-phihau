import React from 'react';

export const DataField: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div>
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className="mt-1 text-md text-slate-200 font-semibold">{value || 'N/A'}</dd>
    </div>
);
