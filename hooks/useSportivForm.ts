import { useState } from 'react';
import { Sportiv } from '../types';

export const useSportivForm = (initialData: Partial<Sportiv> = {}) => {
    const [formData, setFormData] = useState<Partial<Sportiv>>(initialData);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.nume) newErrors.nume = 'Numele este obligatoriu';
        if (!formData.prenume) newErrors.prenume = 'Prenumele este obligatoriu';
        if (!formData.data_nasterii) newErrors.data_nasterii = 'Data nașterii este obligatorie';
        if (!formData.club_id) newErrors.club_id = 'Clubul este obligatoriu';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    return { formData, setFormData, errors, validate, handleChange };
};
