import React from 'react';
import { Input } from './ui';

interface BirthDateInputProps {
  label: string;
  value: string | null | undefined; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}

export const BirthDateInput: React.FC<BirthDateInputProps> = ({ label, value, onChange, required, error }) => {
  return (
    <div className="w-full">
      <Input
        type="date"
        label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        error={error}
        className="!text-lg !py-2.5 h-12"
      />
    </div>
  );
};
