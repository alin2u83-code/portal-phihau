import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CategorieCompetitie, ProbaCompetitie, Grad } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal, Input, Select, SearchableSelect } from '../ui';
import { useError } from '../ErrorProvider';

export const VARSTE_OPTIUNI = [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,30,35,40];

export const VARSTE_OPTIONS = VARSTE_OPTIUNI.map(v => ({ value: String(v), label: String(v) }));

export interface CategorieFormProps {
  competitieId: string;
  probe: ProbaCompetitie[];
  grade: Grad[];
  categorie: CategorieCompetitie | null;
  nextNumarCategorie?: number;
  onClose: () => void;
  onSaved: (c: CategorieCompetitie) => void;
}

export const CategorieForm: React.FC<CategorieFormProps> = ({ competitieId, probe, grade, categorie, onClose, onSaved, nextNumarCategorie }) => {
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  const numRef = useRef<HTMLInputElement>(null);
  const denumireRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    proba_id: categorie?.proba_id || probe[0]?.id || '',
    numar_categorie: categorie ? String(categorie.numar_categorie ?? '') : String(nextNumarCategorie ?? ''),
    denumire: categorie?.denumire || '',
    varsta_min: String(categorie?.varsta_min ?? '7'),
    varsta_max: String(categorie?.varsta_max ?? ''),
    gen: (categorie?.gen ?? 'Feminin') as 'Feminin' | 'Masculin' | 'Mixt',
    grad_min_ordine: String(categorie?.grad_min_ordine ?? ''),
    grad_max_ordine: String(categorie?.grad_max_ordine ?? ''),
    arma: categorie?.arma || '',
    tip_participare: (categorie?.tip_participare ?? 'individual') as 'individual' | 'pereche' | 'echipa',
    sportivi_per_echipa_min: String(categorie?.sportivi_per_echipa_min ?? '1'),
    sportivi_per_echipa_max: String(categorie?.sportivi_per_echipa_max ?? '1'),
    rezerve_max: String(categorie?.rezerve_max ?? '0'),
    max_echipe_per_club: String(categorie?.max_echipe_per_club ?? '1'),
    min_participanti_start: String(categorie?.min_participanti_start ?? '3'),
  });

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  // Auto tip_participare din tip probă
  useEffect(() => {
    const proba = probe.find(p => p.id === form.proba_id);
    if (!proba) return;
    const map: Record<string, 'individual' | 'pereche' | 'echipa'> = {
      thao_quyen_individual: 'individual',
      thao_lo_individual: 'individual',
      sincron: 'echipa',
      song_luyen: 'pereche',
      giao_dau: 'echipa',
    };
    const tp = map[proba.tip_proba];
    if (tp) setForm(p => ({ ...p, tip_participare: tp }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.proba_id]);

  // Auto max membri din tip participare / proba
  useEffect(() => {
    const proba = probe.find(p => p.id === form.proba_id);
    if (proba?.tip_proba === 'sincron') {
      setForm(p => ({ ...p, sportivi_per_echipa_min: '3', sportivi_per_echipa_max: '3' }));
    } else if (form.tip_participare === 'pereche') {
      setForm(p => ({ ...p, sportivi_per_echipa_min: '2', sportivi_per_echipa_max: '2' }));
    } else if (form.tip_participare === 'individual') {
      setForm(p => ({ ...p, sportivi_per_echipa_min: '1', sportivi_per_echipa_max: '1' }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tip_participare, form.proba_id]);

  const gradeOptions = useMemo(
    () => [...grade].sort((a, b) => a.ordine - b.ordine).map(g => ({
      value: String(g.ordine),
      label: g.nume,
    })),
    [grade]
  );

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      competitie_id: competitieId,
      proba_id: form.proba_id || null,
      numar_categorie: parseInt(form.numar_categorie) || null,
      denumire: form.denumire.trim() || null,
      varsta_min: parseInt(form.varsta_min) || 0,
      varsta_max: parseInt(form.varsta_max) || null,
      gen: form.gen,
      grad_min_ordine: parseInt(form.grad_min_ordine) || null,
      grad_max_ordine: parseInt(form.grad_max_ordine) || null,
      arma: form.arma.trim() || null,
      tip_participare: form.tip_participare,
      sportivi_per_echipa_min: parseInt(form.sportivi_per_echipa_min) || 1,
      sportivi_per_echipa_max: parseInt(form.sportivi_per_echipa_max) || 1,
      rezerve_max: parseInt(form.rezerve_max) || 0,
      max_echipe_per_club: parseInt(form.max_echipe_per_club) || 1,
      min_participanti_start: parseInt(form.min_participanti_start) || 3,
    };
    try {
      if (categorie) {
        const { data, error } = await supabase.from('categorii_competitie').update(payload).eq('id', categorie.id).select().single();
        if (error) throw error;
        onSaved(data as CategorieCompetitie);
      } else {
        const { data, error } = await supabase.from('categorii_competitie').insert(payload).select().single();
        if (error) throw error;
        onSaved(data as CategorieCompetitie);
      }
    } catch (err: any) {
      showError('Eroare', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={categorie ? 'Editează Categorie' : 'Adaugă Categorie'}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            ref={numRef}
            label="Nr. Categorie"
            type="number"
            value={form.numar_categorie}
            onChange={f('numar_categorie')}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); denumireRef.current?.focus(); } }}
          />
          <Select label="Probă" value={form.proba_id} onChange={f('proba_id')}>
            <option value="">Fără probă</option>
            {probe.map(p => <option key={p.id} value={p.id}>{p.denumire}</option>)}
          </Select>
        </div>
        <Input
          ref={denumireRef}
          label="Denumire (auto sau personalizată)"
          value={form.denumire}
          onChange={f('denumire')}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); /* focus next native input */ } }}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchableSelect
            label="Vârstă Min"
            options={VARSTE_OPTIONS}
            value={form.varsta_min}
            onChange={v => setForm(p => ({ ...p, varsta_min: v }))}
            placeholder="Selectează vârsta..."
          />
          <SearchableSelect
            label="Vârstă Max"
            options={VARSTE_OPTIONS}
            value={form.varsta_max}
            onChange={v => setForm(p => ({ ...p, varsta_max: v }))}
            placeholder="Fără limită"
            emptyLabel="Fără limită"
          />
          <Select label="Gen" value={form.gen} onChange={f('gen')}>
            <option value="Feminin">Feminin</option>
            <option value="Masculin">Masculin</option>
            <option value="Mixt">Mixt</option>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SearchableSelect
            label="Grad Min (gol = orice)"
            options={gradeOptions}
            value={form.grad_min_ordine}
            onChange={v => setForm(p => ({ ...p, grad_min_ordine: v }))}
            placeholder="Orice grad"
            emptyLabel="Orice grad"
          />
          <SearchableSelect
            label="Grad Max (gol = orice)"
            options={gradeOptions}
            value={form.grad_max_ordine}
            onChange={v => setForm(p => ({ ...p, grad_max_ordine: v }))}
            placeholder="Orice grad"
            emptyLabel="Orice grad"
          />
        </div>
        <Input label="Armă (pentru CVD, ex: Bong)" value={form.arma} onChange={f('arma')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Tip Participare" value={form.tip_participare} onChange={f('tip_participare')}>
            <option value="individual">Individual</option>
            <option value="pereche">Pereche</option>
            <option value="echipa">Echipă</option>
          </Select>
          <Input label="Min. participanți start" type="number" value={form.min_participanti_start} onChange={f('min_participanti_start')} />
        </div>
        {form.tip_participare !== 'individual' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Sportivi/echipă min" type="number" value={form.sportivi_per_echipa_min} onChange={f('sportivi_per_echipa_min')} />
            <Input label="Sportivi/echipă max" type="number" value={form.sportivi_per_echipa_max} onChange={f('sportivi_per_echipa_max')} />
            <Input label="Rezerve max" type="number" value={form.rezerve_max} onChange={f('rezerve_max')} />
          </div>
        )}
        <Input label="Max echipe/club" type="number" value={form.max_echipe_per_club} onChange={f('max_echipe_per_club')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button variant="success" onClick={handleSave} disabled={loading}>
            {loading ? 'Se salvează...' : (categorie ? 'Actualizează' : 'Adaugă')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
