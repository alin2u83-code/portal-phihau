import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { QwanKiDoLogo } from './Logo';

interface Club {
    id: string;
    nume: string;
    slug?: string | null;
}

interface FormData {
    nume: string;
    prenume: string;
    data_nasterii: string;
    sex: string;
    email_contact: string;
    telefon: string;
    club_id: string;
    mesaj: string;
}

interface FormErrors {
    nume?: string;
    prenume?: string;
    email_contact?: string;
    club_id?: string;
    general?: string;
}

export const InscrierePublicPage: React.FC = () => {
    const { clubSlug } = useParams<{ clubSlug?: string }>();
    const [cluburi, setCluburi] = useState<Club[]>([]);
    const [clubPreselected, setClubPreselected] = useState<Club | null>(null);
    const [loadingCluburi, setLoadingCluburi] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    const [formData, setFormData] = useState<FormData>({
        nume: '',
        prenume: '',
        data_nasterii: '',
        sex: '',
        email_contact: '',
        telefon: '',
        club_id: '',
        mesaj: '',
    });

    useEffect(() => {
        const fetchCluburi = async () => {
            setLoadingCluburi(true);
            const { data, error } = await supabase
                .from('cluburi')
                .select('id, nume, slug')
                .order('nume', { ascending: true });

            if (!error && data) {
                setCluburi(data);
                // Dacă există slug în URL, pre-selectează clubul și blochează selectorul
                if (clubSlug) {
                    const found = data.find(c => c.slug === clubSlug);
                    if (found) {
                        setClubPreselected(found);
                        setFormData(prev => ({ ...prev, club_id: found.id }));
                    }
                }
            }
            setLoadingCluburi(false);
        };

        fetchCluburi();
    }, [clubSlug]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.nume.trim()) newErrors.nume = 'Numele este obligatoriu.';
        if (!formData.prenume.trim()) newErrors.prenume = 'Prenumele este obligatoriu.';
        if (!formData.club_id) newErrors.club_id = 'Selectează un club.';

        if (!formData.email_contact.trim()) {
            newErrors.email_contact = 'Email-ul este obligatoriu.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_contact.trim())) {
            newErrors.email_contact = 'Introdu un email valid.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setErrors({});

        const { error } = await supabase.from('cereri_inregistrare').insert({
            club_id: formData.club_id,
            nume: formData.nume.trim().toUpperCase(),
            prenume: formData.prenume.trim().toUpperCase(),
            data_nasterii: formData.data_nasterii || null,
            sex: formData.sex || null,
            email_contact: formData.email_contact.trim().toLowerCase(),
            telefon: formData.telefon || null,
            mesaj: formData.mesaj || null,
        });

        setSubmitting(false);

        if (error) {
            setErrors({ general: 'A apărut o eroare. Te rugăm să încerci din nou.' });
        } else {
            setSubmitted(true);
        }
    };

    const inputBase =
        'w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/70 focus:border-amber-500/70 transition-all';
    const labelBase = 'block text-sm font-medium text-slate-300 mb-1.5';
    const errorClass = 'border-red-500/70 focus:ring-red-500/70';

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
                <div className="w-full max-w-md text-center">
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 border-t-4 border-t-emerald-500 rounded-2xl p-8 shadow-2xl">
                        <QwanKiDoLogo className="mx-auto mb-6 h-20 w-20 border-2" iconClassName="w-12 h-12" />
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Cerere trimisă!</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            Cererea ta a fost trimisă! Te vom contacta în curând.
                        </p>
                        <Link
                            to="/login"
                            className="inline-block text-sm text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2"
                        >
                            Ai deja cont? Conectează-te
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            <div className="w-full max-w-lg">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 border-t-4 border-t-amber-500 rounded-2xl p-8 shadow-2xl">
                    <QwanKiDoLogo className="mx-auto mb-5 h-20 w-20 border-2" iconClassName="w-12 h-12" />

                    <div className="text-center mb-7">
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            {clubPreselected ? `Înregistrare — ${clubPreselected.nume}` : 'Înregistrare Sportiv'}
                        </h1>
                        <p className="text-slate-400 mt-1.5 text-sm">
                            Completează formularul și te vom contacta în curând.
                        </p>
                    </div>

                    {errors.general && (
                        <div className="flex items-start gap-3 p-4 rounded-xl mb-5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
                            </svg>
                            <p>{errors.general}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nume + Prenume */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelBase}>
                                    Nume <span className="text-red-400">*</span>
                                </label>
                                <input
                                    name="nume"
                                    type="text"
                                    value={formData.nume}
                                    onChange={handleChange}
                                    placeholder="Popescu"
                                    className={`${inputBase} ${errors.nume ? errorClass : ''}`}
                                />
                                {errors.nume && <p className="text-xs text-red-400 mt-1">{errors.nume}</p>}
                            </div>
                            <div>
                                <label className={labelBase}>
                                    Prenume <span className="text-red-400">*</span>
                                </label>
                                <input
                                    name="prenume"
                                    type="text"
                                    value={formData.prenume}
                                    onChange={handleChange}
                                    placeholder="Andrei"
                                    className={`${inputBase} ${errors.prenume ? errorClass : ''}`}
                                />
                                {errors.prenume && <p className="text-xs text-red-400 mt-1">{errors.prenume}</p>}
                            </div>
                        </div>

                        {/* Data nasterii + Sex */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelBase}>Data nașterii</label>
                                <input
                                    name="data_nasterii"
                                    type="date"
                                    value={formData.data_nasterii}
                                    onChange={handleChange}
                                    className={`${inputBase} [color-scheme:dark]`}
                                />
                            </div>
                            <div>
                                <label className={labelBase}>Sex</label>
                                <select
                                    name="sex"
                                    value={formData.sex}
                                    onChange={handleChange}
                                    className={`${inputBase}`}
                                >
                                    <option value="">Selectează...</option>
                                    <option value="Masculin">Masculin</option>
                                    <option value="Feminin">Feminin</option>
                                </select>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className={labelBase}>
                                Email contact <span className="text-red-400">*</span>
                            </label>
                            <input
                                name="email_contact"
                                type="email"
                                value={formData.email_contact}
                                onChange={handleChange}
                                placeholder="parinte@email.com"
                                className={`${inputBase} ${errors.email_contact ? errorClass : ''}`}
                            />
                            <p className="text-xs text-slate-500 mt-1">Al părintelui, dacă sportivul este minor.</p>
                            {errors.email_contact && <p className="text-xs text-red-400 mt-1">{errors.email_contact}</p>}
                        </div>

                        {/* Telefon */}
                        <div>
                            <label className={labelBase}>Telefon</label>
                            <input
                                name="telefon"
                                type="text"
                                value={formData.telefon}
                                onChange={handleChange}
                                placeholder="07xx xxx xxx"
                                className={inputBase}
                            />
                        </div>

                        {/* Club — ascuns dacă e pre-selectat prin slug */}
                        {clubPreselected ? (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-sm text-amber-300 font-medium">{clubPreselected.nume}</span>
                            </div>
                        ) : (
                            <div>
                                <label className={labelBase}>
                                    Club <span className="text-red-400">*</span>
                                </label>
                                <select
                                    name="club_id"
                                    value={formData.club_id}
                                    onChange={handleChange}
                                    disabled={loadingCluburi}
                                    className={`${inputBase} ${errors.club_id ? errorClass : ''} disabled:opacity-50`}
                                >
                                    <option value="">
                                        {loadingCluburi ? 'Se încarcă cluburile...' : 'Selectează clubul...'}
                                    </option>
                                    {cluburi.map(club => (
                                        <option key={club.id} value={club.id}>
                                            {club.nume}
                                        </option>
                                    ))}
                                </select>
                                {errors.club_id && <p className="text-xs text-red-400 mt-1">{errors.club_id}</p>}
                            </div>
                        )}

                        {/* Mesaj */}
                        <div>
                            <label className={labelBase}>Mesaj (opțional)</label>
                            <textarea
                                name="mesaj"
                                value={formData.mesaj}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Scrie-ne câteva cuvinte despre tine sau copilul tău..."
                                className={`${inputBase} resize-none`}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3.5 text-base font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white border-b-4 border-amber-800 active:border-b-0 active:translate-y-0.5 transition-all rounded-xl mt-2 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Se trimite...
                                </>
                            ) : (
                                'Trimite cererea'
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-slate-500 text-sm">
                        Ai deja cont?{' '}
                        <Link to="/login" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
                            Conectează-te
                        </Link>
                    </p>
                    <p className="text-slate-600 text-xs uppercase tracking-widest font-bold mt-3">
                        Qwan Ki Do - România
                    </p>
                </div>
            </div>
        </div>
    );
};
