import React, { useState, useEffect, useMemo } from 'react';
import { Select } from './ui';

interface BirthDateInputProps {
  label: string;
  value: string | null | undefined; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
}

export const BirthDateInput: React.FC<BirthDateInputProps> = ({ label, value, onChange, required }) => {
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setYear(y);
      setMonth(String(parseInt(m, 10)));
      setDay(String(parseInt(d, 10)));
    } else {
        setYear('');
        setMonth('');
        setDay('');
    }
  }, [value]);
  
  useEffect(() => {
    if (day && month && year) {
        const maxDays = new Date(parseInt(year), parseInt(month), 0).getDate();
        if (parseInt(day) <= maxDays) {
            const formattedMonth = String(month).padStart(2, '0');
            const formattedDay = String(day).padStart(2, '0');
            onChange(`${year}-${formattedMonth}-${formattedDay}`);
        }
    }
  }, [day, month, year, onChange]);
  
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 100 }, (_, i) => currentYear - i), [currentYear]);
  const months = useMemo(() => [
    { value: '1', label: 'Ianuarie' }, { value: '2', label: 'Februarie' },
    { value: '3', label: 'Martie' }, { value: '4', label: 'Aprilie' },
    { value: '5', label: 'Mai' }, { value: '6', label: 'Iunie' },
    { value: '7', label: 'Iulie' }, { value: '8', label: 'August' },
    { value: '9', label: 'Septembrie' }, { value: '10', label: 'Octombrie' },
    { value: '11', label: 'Noiembrie' }, { value: '12', label: 'Decembrie' }
  ], []);
  
  const days = useMemo(() => {
      const numDays = (year && month) ? new Date(parseInt(year), parseInt(month), 0).getDate() : 31;
      return Array.from({ length: numDays }, (_, i) => String(i + 1));
  }, [year, month]);
  
  useEffect(() => {
    if(day) {
        const maxDays = (year && month) ? new Date(parseInt(year), parseInt(month), 0).getDate() : 31;
        if (parseInt(day) > maxDays) {
            setDay(''); 
        }
    }
  }, [year, month, day]);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
      <div className="grid grid-cols-3 gap-2">
        <Select
          label=""
          value={day}
          onChange={(e) => setDay(e.target.value)}
          required={required}
          aria-label="Ziua nașterii"
        >
          <option value="">Zi</option>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Select
          label=""
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          required={required}
          aria-label="Luna nașterii"
        >
          <option value="">Lună</option>
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
        <Select
          label=""
          value={year}
          onChange={(e) => setYear(e.target.value)}
          required={required}
          aria-label="Anul nașterii"
        >
          <option value="">An</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>
    </div>
  );
};