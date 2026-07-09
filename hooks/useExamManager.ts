import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { SesiuneExamen, InscriereExamen, DecontFederatie, Sportiv, IstoricGrade, Grad } from '../types';
import { syncComisieMembri, ComisieEntryInput } from './useComisieMembri';

export const useExamManager = (
    setSesiuni: React.Dispatch<React.SetStateAction<SesiuneExamen[]>>,
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>,
    setDeconturiFederatie: React.Dispatch<React.SetStateAction<DecontFederatie[]>>,
    setSportivi?: React.Dispatch<React.SetStateAction<Sportiv[]>>,
    setIstoricGrade?: React.Dispatch<React.SetStateAction<IstoricGrade[]>>
) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);

    const saveSesiune = async (sesiuneData: Partial<SesiuneExamen>, sesiuneToEdit: SesiuneExamen | null, locatii: any[], comisieEntries: ComisieEntryInput[] = []) => {
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
                    await syncComisieMembri(data.id, comisieEntries);
                    const { data: viewData, error: viewError } = await supabase.from('sesiuni_examene').select('*').eq('id', data.id).maybeSingle();
                    // Fallback to inserted data if view filters it out (e.g. different club context)
                    const finalData = viewData || data;
                    setSesiuni(prev => prev.map(e => e.id === finalData.id ? finalData as SesiuneExamen : e));
                    showSuccess("Succes", "Sesiunea a fost actualizată.");
                }
            } else {
                const response = await supabase.from('sesiuni_examene').insert(dataToSave).select().single();
                console.log('Supabase Insert Response:', response);
                const { data, error } = response;
                if (error) throw error;
                if (data) {
                    await syncComisieMembri(data.id, comisieEntries);
                    const { data: viewData, error: viewError } = await supabase.from('sesiuni_examene').select('*').eq('id', data.id).maybeSingle();
                    // Fallback to inserted data if view filters it out
                    const finalData = viewData || data;
                    setSesiuni(prev => [...prev, finalData as SesiuneExamen]);
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
            const newIstoricEntries: IstoricGrade[] = [];
            // Bug fix (260709-m7m): urmărim EXPLICIT gradul aplicat efectiv în DB per
            // sportiv (doar când targetOrdine > currentOrdine, aceeași gardă ca update-ul
            // DB de mai jos), ca update-ul de state local să nu mai suprascrie
            // grad_actual_id necondiționat — vezi bug-ul din secțiunea de sincronizare
            // state (mai jos), care seta grad_actual_id la grad_sustinut_id indiferent
            // de ordine, provocând un downgrade optimist doar în UI (DB rămânea corect,
            // grație gărzii de mai jos, dar afișajul se dezincroniza până la refetch).
            const appliedGradeBySportiv = new Map<string, string>();
            
            // 2. Process each inscriere
            for (const inscriere of inscrieriSesiune) {
                if (inscriere.rezultat === 'Admis') {
                    // VALIDARE STRICTĂ grad_id (grad_sustinut_id)
                    let targetGradId = inscriere.grad_sustinut_id;
                    
                    if (!targetGradId || targetGradId === 'undefined' || targetGradId === 'null') {
                        // Fallback to current grade if available
                        if (inscriere.grad_actual_id) {
                            targetGradId = inscriere.grad_actual_id;
                        } else {
                            showError("Atenție", `Grad invalid pentru sportivul ${inscriere.sportiv_nume || inscriere.sportiv_id}. Se sare peste actualizarea gradului.`);
                            continue; // Skip this record
                        }
                    }

                    // Check dacă gradul există deja (orice sesiune) — constraint UNIQUE (sportiv_id, grad_id)
                    const { data: existingIstoric } = await supabase
                        .from('istoric_grade')
                        .select('id')
                        .eq('sportiv_id', inscriere.sportiv_id)
                        .eq('grad_id', targetGradId)
                        .maybeSingle();
                    
                    if (!existingIstoric) {
                        // Arhivare note în observații
                        const notesStr = inscriere.note_detaliate
                            ? Object.entries(inscriere.note_detaliate).map(([k, v]) => `${k}: ${v}`).join(', ')
                            : '';

                        // Insert istoric_grade
                        const { data: newIstoricData, error: insertIstoricError } = await supabase
                            .from('istoric_grade')
                            .insert({
                                sportiv_id: inscriere.sportiv_id,
                                grad_id: targetGradId,
                                data_obtinere: sesiuneData.data || sesiuneData.data_examen || new Date().toISOString().split('T')[0],
                                sesiune_examen_id: sesiuneId,
                                observatii: notesStr ? `Note examen: ${notesStr}` : 'Promovat prin examen'
                            })
                            .select()
                            .single();

                        if (insertIstoricError) throw insertIstoricError;
                        if (newIstoricData) newIstoricEntries.push(newIstoricData as IstoricGrade);
                    }

                    // Actualizează grad_actual_id direct în DB.
                    // Trigger-ul SQL sync_grad_actual_on_exam_result protejează contra downgrade,
                    // dar dacă triggerul nu e activ, actualizăm oricum (cel mai mare grad obținut
                    // este garantat de ordinea for-loop și de validarea de mai jos).
                    const targetGrade = grade.find(g => g.id === targetGradId);
                    const currentGrade = grade.find(g => g.id === inscriere.grad_actual_id);
                    const targetOrdine = targetGrade?.ordine ?? 0;
                    const currentOrdine = currentGrade?.ordine ?? -1;
                    if (targetOrdine > currentOrdine) {
                        const { error: gradUpdateError } = await supabase
                            .from('sportivi')
                            .update({ grad_actual_id: targetGradId })
                            .eq('id', inscriere.sportiv_id);
                        if (gradUpdateError) throw gradUpdateError;
                        appliedGradeBySportiv.set(inscriere.sportiv_id, targetGradId);
                    }
                }
                totalSportivi++;
            }

            // Update local state for sportivi - the trigger will handle the DB update,
            // but we update local state for immediate feedback.
            // Bug fix (260709-m7m): folosim appliedGradeBySportiv (populat DOAR când
            // targetOrdine > currentOrdine, aceeași gardă ca update-ul DB de mai sus) în
            // loc de a suprascrie necondiționat cu grad_sustinut_id — altfel un sportiv cu
            // un rezultat "Admis" pentru un grad INFERIOR celui deja deținut (ex. istoric_grade
            // introdus retroactiv) ar apărea downgradat optimist în UI, deși DB rămâne corect.
            if (setSportivi && appliedGradeBySportiv.size > 0) {
                setSportivi(prev => prev.map(s => {
                    const appliedGradId = appliedGradeBySportiv.get(s.id);
                    if (appliedGradId) {
                        return {
                            ...s,
                            grad_actual_id: appliedGradId
                        };
                    }
                    return s;
                }));
            }
            if (setIstoricGrade && newIstoricEntries.length > 0) {
                setIstoricGrade(prev => [...prev, ...newIstoricEntries]);
            }

            setSesiuni(prev => prev.map(s => s.id === sesiuneId ? { ...s, status: 'Finalizat' } : s));

            showSuccess("Examen Finalizat", "Examenul a fost finalizat și gradele au fost actualizate.");
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
