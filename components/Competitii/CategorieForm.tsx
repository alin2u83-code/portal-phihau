import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CategorieCompetitie, ProbaCompetitie, Grad, Sportiv } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal, Input, Select, SearchableSelect, Switch } from '../ui';
import { verificaEligibilitate } from '../../utils/eligibilitateCompetitie';
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
  cloneDin?: CategorieCompetitie | null;
  inscrisi?: Sportiv[];
  dataCompetitie?: string;
  areInscrieri?: boolean;
}

export const CategorieForm: React.FC<CategorieFormProps> = ({ competitieId, probe, grade, categorie, onClose, onSaved, nextNumarCategorie, cloneDin, inscrisi, dataCompetitie, areInscrieri }) => {
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  const numRef = useRef<HTMLInputElement>(null);
  const denumireRef = useRef<HTMLInputElement>(null);
  const src = categorie ?? cloneDin ?? null;
  const [form, setForm] = useState({
    proba_id: src?.proba_id || probe[0]?.id || '',
    numar_categorie: categorie ? String(categorie.numar_categorie ?? '') : String(nextNumarCategorie ?? ''),
    denumire: src?.denumire || '',
    varsta_min: String(src?.varsta_min ?? '7'),
    varsta_max: String(src?.varsta_max ?? ''),
    gen: (src?.gen ?? 'Feminin') as 'Feminin' | 'Masculin' | 'Mixt',
    grad_min_ordine: String(src?.grad_min_ordine ?? ''),
    grad_max_ordine: String(src?.grad_max_ordine ?? ''),
    arma: src?.arma || '',
    tip_participare: (src?.tip_participare ?? 'individual') as 'individual' | 'pereche' | 'echipa',
    sportivi_per_echipa_min: String(src?.sportivi_per_echipa_min ?? '1'),
    sportivi_per_echipa_max: String(src?.sportivi_per_echipa_max ?? '1'),
    rezerve_max: String(src?.rezerve_max ?? '0'),
    max_echipe_per_club: String(src?.max_echipe_per_club ?? '1'),
    min_participanti_start: String(src?.min_participanti_start ?? '3'),
    doua_quyenuri: !!src?.doua_quyenuri,
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

  const blocat = !!categorie && !!areInscrieri;

  const valori = () => ({
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
    doua_quyenuri: form.doua_quyenuri,
  });

  // Sportivii înscriși care nu mai respectă criteriile noi (doar avertisment, nu blochează)
  const neeligibili = useMemo(() => {
    if (!categorie || !inscrisi?.length) return [];
    const pseudo = { ...categorie, ...valori() } as CategorieCompetitie;
    const data = dataCompetitie ?? new Date().toISOString().slice(0, 10);
    return inscrisi
      .map(sp => ({ sp, r: verificaEligibilitate(sp, pseudo, grade, data) }))
      .filter(x => !x.r.eligibil);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, categorie, inscrisi, grade, dataCompetitie]);

  // taxa derivata (utils/taxeCompetitie.ts) depinde de varsta_max (<=17) si de arma: avertisment cand se schimba pe o categorie cu inscrieri
  const schimbaTaxa = !!categorie && !!areInscrieri
    && ((parseInt(form.varsta_max) || null) !== (categorie.varsta_max ?? null) || (form.arma.trim() || null) !== (categorie.arma ?? null));

  const handleSave = async () => {
    setLoading(true);
    const payload = { competitie_id: competitieId, ...valori() };
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
    <Modal isOpen={true} onClose={onClose} title={categorie ? 'Editează Categorie' : cloneDin ? 'Clonează Categorie' : 'Adaugă Categorie'}>
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
          <Select label="Probă" value={form.proba_id} onChange={f('proba_id')} disabled={blocat}>
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
          <Select label="Tip Participare" value={form.tip_participare} onChange={f('tip_participare')} disabled={blocat}>
            <option value="individual">Individual</option>
            <option value="pereche">Pereche</option>
            <option value="echipa">Echipă</option>
          </Select>
          <Input label="Min. participanți start" type="number" value={form.min_participanti_start} onChange={f('min_participanti_start')} />
        </div>
        <Switch label="Două quyenuri" name="doua_quyenuri" checked={form.doua_quyenuri} onChange={e => setForm(p => ({ ...p, doua_quyenuri: e.target.checked }))} />
        {blocat && <p className="text-xs text-slate-400">Blocat: categoria are înscrieri (probă și tip participare).</p>}
        {form.tip_participare !== 'individual' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Sportivi/echipă min" type="number" value={form.sportivi_per_echipa_min} onChange={f('sportivi_per_echipa_min')} />
            <Input label="Sportivi/echipă max" type="number" value={form.sportivi_per_echipa_max} onChange={f('sportivi_per_echipa_max')} />
            <Input label="Rezerve max" type="number" value={form.rezerve_max} onChange={f('rezerve_max')} />
          </div>
        )}
        <Input label="Max echipe/club" type="number" value={form.max_echipe_per_club} onChange={f('max_echipe_per_club')} />
        {schimbaTaxa && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
            Atenție: vârsta maximă și arma determină taxa derivată (echipe juniori ≤17 ani / seniori, CVD). Modificarea lor schimbă taxa înscrierilor existente; taxele deja achitate nu se recalculează, diferența se reglează manual.
          </p>
        )}
        {neeligibili.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
            <p className="font-bold">Atenție: {neeligibili.length} sportivi înscriși nu mai respectă criteriile noi. Înscrierile rămân; mută-i din tab-ul Categorii dacă e nevoie.</p>
            <ul className="list-disc pl-4">
              {neeligibili.slice(0, 10).map(({ sp, r }) => (
                <li key={sp.id}>{sp.nume?.toUpperCase()} {sp.prenume} — {r.motive.join('; ')}</li>
              ))}
            </ul>
            {neeligibili.length > 10 && <p>… și încă {neeligibili.length - 10}</p>}
          </div>
        )}
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
