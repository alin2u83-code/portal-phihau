import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { SesiuneExamen, InscriereExamen, DecontFederatie, Sportiv, IstoricGrade, Grad } from '../types';

export const useExamManager = (
    setSesiuni: React.Dispatch<React.SetStateAction<SesiuneExamen[]>>,
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>,
    setDeconturiFederatie: React.Dispatch<React.SetStateAction<DecontFederatie[]>>,
    setSportivi?: React.Dispatch<React.SetStateAction<Sportiv[]>>,
    setIstoricGrade?: React.Dispatch<React.SetStateAction<IstoricGrade[]>>
) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);

    const saveSesiune = async (sesiuneData: Partial<SesiuneExamen>, sesiuneToEdit: SesiuneExamen | null, locatii: any[]) => {
        if (!supabase) {
            showError("Eroare", "Client Supabase neconfigurat.");
            return;
        }
        setLoading(true);
        try {
            const locatieSelectata = (locatii || []).find(l => l.id === sesiuneData.locatie_id);
            const dataToSave: Partial<SesiuneExamen> = {
                ...sesiuneData,
                localitate: locatieSelectata ? locatieSelectata.nume : 'Necunoscută',
                club_id: sesiuneData.club_id === '' ? null : sesiuneData.club_id
            };

            if (sesiuneToEdit) {
                const response = await supabase.from('sesiuni_examene').update(dataToSave).eq('id', sesiuneToEdit.id).select().single();
                console.log('Supabase Update Response:', response);
                const { data, error } = response;
                if (error) throw error;
                if (data) {
                    const { data: viewData, error: viewError } = await supabase.from('vedere_cluburi_sesiuni_examene').select('*').eq('id', data.id).single();
                    if (viewError) throw viewError;
                    setSesiuni(prev => prev.map(e => e.id === viewData.id ? viewData as SesiuneExamen : e));
                    showSuccess("Succes", "Sesiunea a fost actualizată.");
                }
            } else {
                const response = await supabase.from('sesiuni_examene').insert(dataToSave).select().single();
                console.log('Supabase Insert Response:', response);
                const { data, error } = response;
                if (error) throw error;
                if (data) {
                    const { data: viewData, error: viewError } = await supabase.from('vedere_cluburi_sesiuni_examene').select('*').eq('id', data.id).single();
                    if (viewError) throw viewError;
                    setSesiuni(prev => [...prev, viewData as SesiuneExamen]);
                    showSuccess("Succes", "Sesiunea a fost creată.");
                }
            }
        } catch (err: any) {
            console.error('DETALII EROARE:', JSON.stringify(err, null, 2));
            showError(sesiuneToEdit ? "Eroare la actualizare" : "Eroare la adăugare", err.message || err);
        } finally {
            setLoading(false);
        }
    };

    const deleteSesiune = async (id: string) => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { error: inscrieriError } = await supabase.from('inscrieri_examene').delete().eq('sesiune_id', id);
            if (inscrieriError) throw inscrieriError;
            setInscrieri(prev => prev.filter(p => p.sesiune_id !== id));

            const { error: sesiuneError } = await supabase.from('sesiuni_examene').delete().eq('id', id);
            if (sesiuneError) throw sesiuneError;
            setSesiuni(prev => prev.filter(e => e.id !== id));
            showSuccess("Succes", "Sesiunea și înscrierile asociate au fost șterse.");
            return true;
        } catch (err: any) {
            console.error('DETALII EROARE:', JSON.stringify(err, null, 2));
            showError("Eroare la ștergere", err.message || err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const finalizeExamen = async (sesiuneId: string, inscrieriSesiune: InscriereExamen[], sesiuneData: SesiuneExamen, grade: Grad[] = []) => {
        if (!supabase) return false;
        setLoading(true);
        try {
            // 1. Update sesiuni_examene status
            const { error: updateSesiuneError } = await supabase
                .from('sesiuni_examene')
                .update({ status: 'Finalizat' })
                .eq('id', sesiuneId);
            
            if (updateSesiuneError) throw updateSesiuneError;

            let totalSportivi = 0;
            const updatedSportiviIds = new Set<string>();
            const newIstoricEntries: IstoricGrade[] = [];
            
            // 2. Process each inscriere
            for (const inscriere of inscrieriSesiune) {
                if (inscriere.rezultat === 'Admis') {
                    // Update sportiv grad_actual_id
                    const { error: updateSportivError } = await supabase
                        .from('sportivi')
                        .update({ grad_actual_id: inscriere.grad_vizat_id })
                        .eq('id', inscriere.sportiv_id);
                    
                    if (updateSportivError) throw updateSportivError;
                    updatedSportiviIds.add(inscriere.sportiv_id);

                    // Check if istoric_grade exists
                    const { data: existingIstoric } = await supabase
                        .from('istoric_grade')
                        .select('id')
                        .eq('sportiv_id', inscriere.sportiv_id)
                        .eq('grad_id', inscriere.grad_vizat_id)
                        .eq('sesiune_examen_id', sesiuneId)
                        .maybeSingle();
                    
                    if (!existingIstoric) {
                        // Insert istoric_grade
                        const { data: newIstoricData, error: insertIstoricError } = await supabase
                            .from('istoric_grade')
                            .insert({
                                sportiv_id: inscriere.sportiv_id,
                                grad_id: inscriere.grad_vizat_id,
                                data_obtinere: sesiuneData.data || sesiuneData.data_examen || new Date().toISOString().split('T')[0],
                                sesiune_examen_id: sesiuneId
                            })
                            .select()
                            .single();
                        
                        if (insertIstoricError) throw insertIstoricError;
                        if (newIstoricData) newIstoricEntries.push(newIstoricData as IstoricGrade);
                    }
                }
                totalSportivi++;
            }

            // Update local state
            if (setSportivi && updatedSportiviIds.size > 0) {
                setSportivi(prev => prev.map(s => {
                    if (updatedSportiviIds.has(s.id)) {
                        const inscriere = inscrieriSesiune.find(i => i.sportiv_id === s.id && i.rezultat === 'Admis');
                        if (inscriere) {
                            const newGrad = grade.find(g => g.id === inscriere.grad_vizat_id);
                            return { 
                                ...s, 
                                grad_actual_id: inscriere.grad_vizat_id
                            };
                        }
                    }
                    return s;
                }));
            }
            if (setIstoricGrade && newIstoricEntries.length > 0) {
                setIstoricGrade(prev => [...prev, ...newIstoricEntries]);
            }

            // 3. Create decont_federatie
            let newDecont = null;
            if (sesiuneData.club_id) {
                const { data: decontData, error: decontError } = await supabase
                    .from('deconturi_federatie')
                    .insert({
                        club_id: sesiuneData.club_id,
                        tip_activitate: 'Examen ' + (sesiuneData.data || sesiuneData.data_examen || new Date().toISOString().split('T')[0]),
                        nr_participanti: totalSportivi,
                        suma_totala: 0,
                        status_plata: 'In asteptare'
                    })
                    .select()
                    .single();
                
                if (decontError) throw decontError;
                newDecont = decontData;
            }

            setSesiuni(prev => prev.map(s => s.id === sesiuneId ? { ...s, status: 'Finalizat' } : s));

            if (newDecont) {
                setDeconturiFederatie(prev => [...prev, newDecont]);
            }
            showSuccess("Examen Finalizat", "Examenul a fost finalizat și decontul a fost generat.");
            return true;
        } catch (err: any) {
            console.error('DETALII EROARE:', JSON.stringify(err, null, 2));
            showError("Eroare la finalizare", `A apărut o eroare la finalizarea examenului. Detalii: ${err.message || err}`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        saveSesiune,
        deleteSesiune,
        finalizeExamen,
        loading
    };
};
