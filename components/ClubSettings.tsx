import React, { useState, useEffect } from 'react';
import { Button, Card, Input, FormSection } from './ui';
import { ArrowLeftIcon, SaveIcon, BuildingOfficeIcon, PaintBrushIcon } from './icons';
import { Club, User } from '../types';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface ClubSettingsProps {
    onBack: () => void;
    currentUser: User;
    clubs: Club[];
    setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
}

export const ClubSettings: React.FC<ClubSettingsProps> = ({ onBack, currentUser, clubs, setClubs }) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);
    
    // Determine active club based on user role
    const activeClubId = currentUser.club_id;
    const activeClub = clubs.find(c => c.id === activeClubId);

    const [formData, setFormData] = useState<{
        nume: string;
        oras: string;
        cif: string;
        email_contact: string;
        telefon_contact: string;
        adresa_contact: string;
        primary_color: string;
        secondary_color: string;
    }>({
        nume: '',
        oras: '',
        cif: '',
        email_contact: '',
        telefon_contact: '',
        adresa_contact: '',
        primary_color: '#3b82f6',
        secondary_color: '#1e293b'
    });

    useEffect(() => {
        if (activeClub) {
            const config = activeClub.theme_config || {};
            setFormData({
                nume: activeClub.nume || '',
                oras: activeClub.oras || '',
                cif: activeClub.cif || '',
                email_contact: config.email_contact || '',
                telefon_contact: config.telefon_contact || '',
                adresa_contact: config.adresa_contact || '',
                primary_color: config.primary_color || '#3b82f6',
                secondary_color: config.secondary_color || '#1e293b'
            });
        }
    }, [activeClub]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!activeClub) return;
        setLoading(true);

        try {
            const theme_config = {
                ...(activeClub.theme_config || {}),
                email_contact: formData.email_contact,
                telefon_contact: formData.telefon_contact,
                adresa_contact: formData.adresa_contact,
                primary_color: formData.primary_color,
                secondary_color: formData.secondary_color
            };

            const { data, error } = await supabase
                .from('cluburi')
                .update({
                    nume: formData.nume,
                    oras: formData.oras,
                    cif: formData.cif,
                    theme_config: theme_config
                })
                .eq('id', activeClub.id)
                .select()
                .single();

            if (error) throw error;

            setClubs(prev => prev.map(c => c.id === activeClub.id ? data : c));
            showSuccess("Setări Actualizate", "Informațiile clubului au fost salvate cu succes.");
            
            // Apply theme immediately if possible (reload might be needed for full effect)
            if (formData.primary_color) {
                document.documentElement.style.setProperty('--primary-color', formData.primary_color);
            }

        } catch (err: any) {
            showError("Eroare la Salvare", err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!activeClub) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-400">Nu aveți un club asociat sau nu aveți permisiuni de administrare.</p>
                <Button onClick={onBack} variant="secondary" className="mt-4">Înapoi</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-down">
            <div className="flex items-center justify-between">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Dashboard</Button>
                <h1 className="text-2xl font-bold text-white">Setări Club: {activeClub.nume}</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <div className="flex items-center gap-2 mb-4 text-blue-400">
                        <BuildingOfficeIcon className="w-6 h-6" />
                        <h2 className="text-xl font-bold">Informații Generale</h2>
                    </div>
                    <div className="space-y-4">
                        <Input label="Nume Club" name="nume" value={formData.nume} onChange={handleChange} />
                        <Input label="Oraș" name="oras" value={formData.oras} onChange={handleChange} />
                        <Input label="CIF / Cod Fiscal" name="cif" value={formData.cif} onChange={handleChange} />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                        <BuildingOfficeIcon className="w-6 h-6" />
                        <h2 className="text-xl font-bold">Date de Contact</h2>
                    </div>
                    <div className="space-y-4">
                        <Input label="Email Contact" name="email_contact" type="email" value={formData.email_contact} onChange={handleChange} />
                        <Input label="Telefon Contact" name="telefon_contact" type="tel" value={formData.telefon_contact} onChange={handleChange} />
                        <Input label="Adresă Fizică" name="adresa_contact" value={formData.adresa_contact} onChange={handleChange} />
                    </div>
                </Card>

                <Card className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-4 text-purple-400">
                        <PaintBrushIcon className="w-6 h-6" />
                        <h2 className="text-xl font-bold">Personalizare Vizuală</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Culoare Principală (Brand)</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    name="primary_color" 
                                    value={formData.primary_color} 
                                    onChange={handleChange}
                                    className="h-10 w-20 rounded border border-slate-600 bg-slate-700 cursor-pointer"
                                />
                                <Input 
                                    label="" 
                                    name="primary_color" 
                                    value={formData.primary_color} 
                                    onChange={handleChange} 
                                    className="flex-grow"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Folosită pentru butoane principale, accente și link-uri.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Culoare Secundară (Fundal)</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    name="secondary_color" 
                                    value={formData.secondary_color} 
                                    onChange={handleChange}
                                    className="h-10 w-20 rounded border border-slate-600 bg-slate-700 cursor-pointer"
                                />
                                <Input 
                                    label="" 
                                    name="secondary_color" 
                                    value={formData.secondary_color} 
                                    onChange={handleChange} 
                                    className="flex-grow"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Folosită pentru fundaluri secundare și elemente de contrast.</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-700">
                <Button onClick={handleSave} variant="success" size="lg" isLoading={loading}>
                    <SaveIcon className="w-5 h-5 mr-2" /> Salvează Modificările
                </Button>
            </div>
        </div>
    );
};