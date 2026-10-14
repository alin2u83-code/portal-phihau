import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Grupa as GrupaType, Locatie } from '../../types';
import { Button, Input, Modal, Select, Badge } from '../ui';
import { supabase } from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { useError } from '../ErrorProvider';
import { numeSalaGrupa } from './locatieGrupa';

interface IstoricRow { id: string; locatie_id: string | null; data_de_la: string; }
interface CerereRow { id: string; locatie_id: string; data_de_la: string; status: 'in_asteptare' | 'aprobata' | 'respinsa'; }

const azi = () => new Date().toISOString().split('T')[0];
const formatData = (d: string) => (d === '1900-01-01' ? 'inițial' : d.split('-').reverse().join('.'));

export const LocatieGrupaPanel: React.FC<{ grupa: GrupaType }> = ({ grupa }) => {
    const { locatii, setGrupe, activeRoleContext } = useData();
    const { showError, showSuccess } = useError();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [locatieId, setLocatieId] = useState('');
    const [dataDeLa, setDataDeLa] = useState(azi());
    const [saving, setSaving] = useState(false);

    const rol = (activeRoleContext as any)?.roluri?.nume || (activeRoleContext as any)?.rol_denumire || '';
    const esteAdmin = rol === 'ADMIN_CLUB' || rol === 'SUPER_ADMIN_FEDERATIE';
    const esteInstructor = rol === 'INSTRUCTOR';
    const poateSchimba = esteAdmin || esteInstructor;

    const locatiiClub = useMemo(
        () => (locatii as Locatie[]).filter(l => !l.club_id || !grupa.club_id || l.club_id === grupa.club_id),
        [locatii, grupa.club_id]
    );

    const { data: istoric = [] } = useQuery({
        queryKey: ['grupa-locatie-istoric', grupa.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('grupa_locatie_istoric')
                .select('id, locatie_id, data_de_la').eq('grupa_id', grupa.id).order('data_de_la', { ascending: false });
            if (error) throw error;
            return (data || []) as IstoricRow[];
        },
        staleTime: 60_000,
    });

    const { data: cerere = null } = useQuery({
        queryKey: ['grupa-locatie-cerere', grupa.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('grupa_locatie_cereri')
                .select('id, locatie_id, data_de_la, status').eq('grupa_id', grupa.id).eq('status', 'in_asteptare').maybeSingle();
            if (error) throw error;
            return (data || null) as CerereRow | null;
        },
        staleTime: 30_000,
    });

    const numeLocatie = (id: string | null) => (locatii as Locatie[]).find(l => l.id === id)?.nume || '—';
    const salaCurenta = numeSalaGrupa(grupa, locatii as Locatie[]);

    const refresh = async () => {
        const { data } = await supabase.rpc('locatie_grupa_la_data', { p_grupa: grupa.id, p_data: azi() });
        if (data !== undefined) setGrupe((prev: any[]) => prev.map(g => g.id === grupa.id ? { ...g, locatie_id: data } : g));
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['grupa-locatie-istoric', grupa.id] }),
            queryClient.invalidateQueries({ queryKey: ['grupa-locatie-cerere', grupa.id] }),
            queryClient.invalidateQueries({ queryKey: ['grupe'] }),
            queryClient.invalidateQueries({ queryKey: ['program-antrenamente'] }),
        ]);
    };

    const handleSave = async () => {
        if (!locatieId) { showError('Locație lipsă', new Error('Alege sala.')); return; }
        setSaving(true);
        try {
            if (esteAdmin) {
                const { error } = await supabase.rpc('schimba_locatie_grupa', { p_grupa: grupa.id, p_locatie: locatieId, p_data: dataDeLa });
                if (error) throw error;
                showSuccess('Locație schimbată', `Sala se aplică de la ${formatData(dataDeLa)}.`);
            } else {
                const { error } = await supabase.rpc('cere_schimbare_locatie_grupa', { p_grupa: grupa.id, p_locatie: locatieId, p_data: dataDeLa });
                if (error) throw error;
                showSuccess('Cerere trimisă', 'Adminul clubului trebuie să aprobe schimbarea.');
            }
            setIsOpen(false);
            await refresh();
        } catch (err: any) {
            showError('Eroare la schimbarea locației', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDecide = async (aproba: boolean) => {
        if (!cerere) return;
        setSaving(true);
        try {
            const { error } = await supabase.rpc('decide_cerere_locatie_grupa', { p_cerere: cerere.id, p_aproba: aproba });
            if (error) throw error;
            showSuccess(aproba ? 'Cerere aprobată' : 'Cerere respinsă', aproba ? 'Locația a fost schimbată.' : 'Locația rămâne neschimbată.');
            await refresh();
        } catch (err: any) {
            showError('Eroare la decizie', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <p className="text-sm text-slate-400 flex items-center justify-end gap-2 flex-wrap">
                <span>
                    Sala: {salaCurenta ? salaCurenta : (
                        poateSchimba
                            ? <button type="button" className="text-amber-400 underline" onClick={() => { setLocatieId(''); setDataDeLa(azi()); setIsOpen(true); }}>Setează sala</button>
                            : 'Nespecificată'
                    )}
                </span>
                {poateSchimba && salaCurenta && (
                    <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 underline min-h-[24px]"
                        onClick={() => { setLocatieId(''); setDataDeLa(azi()); setIsOpen(true); }}>
                        Schimbă locația
                    </button>
                )}
            </p>
            {cerere && (
                <div className="mt-1 flex items-center justify-end gap-2 flex-wrap text-xs">
                    <Badge variant="amber">Cerere în așteptare: {numeLocatie(cerere.locatie_id)} de la {formatData(cerere.data_de_la)}</Badge>
                    {esteAdmin && (
                        <>
                            <Button size="sm" variant="primary" isLoading={saving} onClick={() => handleDecide(true)}>Aprobă</Button>
                            <Button size="sm" variant="secondary" disabled={saving} onClick={() => handleDecide(false)}>Respinge</Button>
                        </>
                    )}
                </div>
            )}

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={esteAdmin ? 'Schimbă locația grupei' : 'Cere schimbarea locației'}>
                <div className="space-y-4">
                    <Select label="Sala nouă" value={locatieId} onChange={e => setLocatieId(e.target.value)}>
                        <option value="">Alege sala...</option>
                        {locatiiClub.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}
                    </Select>
                    <Input label="Se aplică de la data" type="date" value={dataDeLa} onChange={e => setDataDeLa(e.target.value)} />
                    <p className="text-xs text-slate-400">
                        Antrenamentele și prezențele dinainte de această dată rămân pe sala veche; cele de la această dată încolo folosesc sala nouă.
                        {!esteAdmin && ' Schimbarea intră în vigoare după aprobarea adminului clubului.'}
                    </p>
                    {istoric.length > 0 && (
                        <div className="text-xs text-slate-400 border-t border-slate-700 pt-2">
                            <p className="font-semibold text-slate-300 mb-1">Istoric locații</p>
                            <ul className="space-y-0.5">
                                {istoric.map(i => <li key={i.id}>{formatData(i.data_de_la)} → {numeLocatie(i.locatie_id)}</li>)}
                            </ul>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setIsOpen(false)} disabled={saving}>Anulează</Button>
                        <Button variant="primary" onClick={handleSave} isLoading={saving}>{esteAdmin ? 'Salvează' : 'Trimite cererea'}</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
