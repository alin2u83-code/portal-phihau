import React, { useState } from 'react';
import { Input } from '../ui';

interface PeriodFilterBarProps {
    startDate: string;
    endDate: string;
    onChange: (startDate: string, endDate: string) => void;
    className?: string;
}

type PresetKey = 'saptamana' | 'luna_curenta' | 'luna_trecuta' | '3_luni' | '6_luni' | 'an_curent' | 'custom';

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const getPresetDates = (preset: PresetKey): { start: string; end: string } => {
    const now = new Date();
    const end = fmt(now);

    switch (preset) {
        case 'saptamana': {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            return { start: fmt(d), end };
        }
        case 'luna_curenta':
            return { start: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, end };
        case 'luna_trecuta': {
            const firstOfCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastOfPrev = new Date(firstOfCurrent.getTime() - 1);
            const firstOfPrev = new Date(lastOfPrev.getFullYear(), lastOfPrev.getMonth(), 1);
            return { start: fmt(firstOfPrev), end: fmt(lastOfPrev) };
        }
        case '3_luni': {
            const d = new Date(now);
            d.setMonth(d.getMonth() - 3);
            return { start: fmt(d), end };
        }
        case '6_luni': {
            const d = new Date(now);
            d.setMonth(d.getMonth() - 6);
            return { start: fmt(d), end };
        }
        case 'an_curent':
            return { start: `${now.getFullYear()}-01-01`, end };
        default:
            return { start: '', end: '' };
    }
};

const PRESETS: { key: PresetKey; label: string }[] = [
    { key: 'saptamana', label: 'Săptămâna' },
    { key: 'luna_curenta', label: 'Luna curentă' },
    { key: 'luna_trecuta', label: 'Luna trecută' },
    { key: '3_luni', label: '3 luni' },
    { key: '6_luni', label: '6 luni' },
    { key: 'an_curent', label: 'Anul curent' },
    { key: 'custom', label: 'Personalizat' },
];

export const PeriodFilterBar: React.FC<PeriodFilterBarProps> = ({ startDate, endDate, onChange, className = '' }) => {
    const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

    const handlePreset = (preset: PresetKey) => {
        setActivePreset(preset);
        if (preset === 'custom') return;
        const { start, end } = getPresetDates(preset);
        onChange(start, end);
    };

    const handleDateChange = (field: 'start' | 'end', value: string) => {
        setActivePreset('custom');
        onChange(field === 'start' ? value : startDate, field === 'end' ? value : endDate);
    };

    const handleClear = () => {
        setActivePreset(null);
        onChange('', '');
    };

    const showDateInputs = activePreset === 'custom' || (!activePreset && (startDate || endDate));

    return (
        <div className={`flex flex-wrap gap-2 items-center ${className}`}>
            {PRESETS.map(p => (
                <button
                    key={p.key}
                    type="button"
                    onClick={() => handlePreset(p.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                        activePreset === p.key
                            ? 'bg-brand-primary border-brand-primary text-white'
                            : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white'
                    }`}
                >
                    {p.label}
                </button>
            ))}
            {showDateInputs && (
                <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                    <Input
                        label=""
                        type="date"
                        value={startDate}
                        onChange={e => handleDateChange('start', e.target.value)}
                    />
                    <span className="text-slate-400 text-sm shrink-0">—</span>
                    <Input
                        label=""
                        type="date"
                        value={endDate}
                        onChange={e => handleDateChange('end', e.target.value)}
                    />
                </div>
            )}
            {(startDate || endDate) && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors px-1"
                    title="Șterge filtrul de perioadă"
                >
                    ✕ Șterge
                </button>
            )}
        </div>
    );
};
