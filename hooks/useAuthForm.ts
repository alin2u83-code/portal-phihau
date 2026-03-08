import { useState, useCallback } from 'react';

export interface AuthFormData {
    nume?: string;
    prenume?: string;
    email?: string;
    parola?: string;
    confirmParola?: string;
}

export interface AuthFormErrors {
    [key: string]: string;
}

export type AuthFormType = 'login' | 'register' | 'reset';

export function useAuthForm(formType: AuthFormType) {
    const [formData, setFormData] = useState<AuthFormData>({
        nume: '',
        prenume: '',
        email: '',
        parola: '',
        confirmParola: ''
    });
    const [errors, setErrors] = useState<AuthFormErrors>({});

    const validate = useCallback(() => {
        const newErrors: AuthFormErrors = {};

        if (formType === 'register') {
            if (!formData.nume) newErrors.nume = 'Numele este obligatoriu.';
            if (!formData.prenume) newErrors.prenume = 'Prenumele este obligatoriu.';
            if (formData.parola !== formData.confirmParola) {
                newErrors.confirmParola = 'Parolele nu se potrivesc.';
            }
        }

        if (formType === 'login' || formType === 'register' || formType === 'reset') {
            if (!formData.email) {
                newErrors.email = 'Email-ul este obligatoriu.';
            } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
                newErrors.email = 'Email-ul nu este valid.';
            }
        }

        if (formType === 'login' || formType === 'register') {
            if (!formData.parola) {
                newErrors.parola = 'Parola este obligatorie.';
            } else if (formData.parola!.length < 6) {
                newErrors.parola = 'Parola trebuie să aibă cel puțin 6 caractere.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, formType]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (errors[name]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    }, [errors]);

    const resetForm = useCallback(() => {
        setFormData({
            nume: '',
            prenume: '',
            email: '',
            parola: '',
            confirmParola: ''
        });
        setErrors({});
    }, []);

    return {
        formData,
        errors,
        handleChange,
        validate,
        resetForm,
        setErrors,
        setFormData
    };
}
