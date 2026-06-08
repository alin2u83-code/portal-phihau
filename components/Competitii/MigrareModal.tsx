import React, { useState } from 'react';
import { Competitie, ProbaCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal, Select } from '../ui';
import { useError } from '../ErrorProvider';
import { fmtDate } from './constants';
import {
  generateTemplateTehnnica, generateTemplateGiaoDau, generateTemplateCVD,
  buildCategorieDenumire, DEFAULT_PROBE_PER_TIP, TemplateCategorieInput,
} from '../../utils/competitiiTemplates';

export interface EvenimentLegacy {
  id: string;
  denumire: string;
  data: string;
  data_sfarsit?: string;
  locatie?: string;
  organizator?: string;
  probe_disponibile?: string[];
  club_id?: string;
}

export const MigrareModal: React.FC<{
  ev: EvenimentLegacy | null;
  onClose: () => void;
  onMigrated: (newComp: Competitie, legacyId: string) => void;
}> = ({ ev, onClose, onMigrated }) => {
  const { showError } = useError();
  const [tip, setTip] = useState<string>('tehnica');
  const [seedCategories, setSeedCategories] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!ev) return null;

  const handleMigrate = async () => {
    setLoading(true);
    // 1. Insert in competitii (păstrăm legacy_eveniment_id pentru a nu pierde rezultatele)
    const payload: Record<string, unknown> = {
      denumire: ev.denumire,
      tip,
      data_inceput: ev.data,
      data_sfarsit: ev.data_sfarsit || ev.data,
      locatie: ev.locatie || null,
      organizator: ev.organizator || null,
      status: 'finalizata',
      club_id: ev.club_id || null,
      legacy_eveniment_id: ev.id,
    };
    const { data: compData, error: compErr } = await supabase
      .from('competitii').insert(payload).select().single();
    if (compErr) { showError("Eroare migrare", compErr.message); setLoading(false); return; }

    const newComp = compData as Competitie;

    // 2. Seed categories if requested
    if (seedCategories) {
      let templates: TemplateCategorieInput[] = [];
      if (tip === 'tehnica') templates = generateTemplateTehnnica();
      else if (tip === 'giao_dau') templates = generateTemplateGiaoDau();
      else if (tip === 'cvd') templates = generateTemplateCVD();

      const probe = DEFAULT_PROBE_PER_TIP[tip as keyof typeof DEFAULT_PROBE_PER_TIP] || [];
      const probeInsert = probe.map((p: { tip_proba: string; denumire: string }, i: number) => ({
        competitie_id: newComp.id, tip_proba: p.tip_proba, denumire: p.denumire, ordine_afisare: i,
      }));
      const { data: probeData } = await supabase.from('probe_competitie').insert(probeInsert).select();
      if (probeData && templates.length > 0) {
        const probeMap: Record<string, string> = {};
        (probeData as ProbaCompetitie[]).forEach(p => { probeMap[p.tip_proba] = p.id; });
        const cats = templates.map((t, i) => ({
          competitie_id: newComp.id,
          proba_id: t.tip_proba ? probeMap[t.tip_proba] || null : null,
          numar_categorie: t.numar_categorie,
          denumire: buildCategorieDenumire(t),
          varsta_min: t.varsta_min,
          varsta_max: t.varsta_max ?? null,
          gen: t.gen,
          grad_min_ordine: t.grad_min_ordine ?? null,
          grad_max_ordine: t.grad_max_ordine ?? null,
          arma: t.arma ?? null,
          tip_participare: t.tip_participare,
          sportivi_per_echipa_min: t.sportivi_per_echipa_min ?? 1,
          sportivi_per_echipa_max: t.sportivi_per_echipa_max ?? 1,
          rezerve_max: t.rezerve_max ?? 0,
          max_echipe_per_club: t.max_echipe_per_club ?? 1,
          min_participanti_start: t.min_participanti_start ?? 3,
          ordine_afisare: i,
        }));
        await supabase.from('categorii_competitie').insert(cats);
      }
    }

    // 3. NU ștergem din evenimente — rezultatele sportivilor (tabela rezultate)
    // sunt legate de eveniment_id cu ON DELETE CASCADE și s-ar pierde.
    // legacy_eveniment_id din competitii permite filtrarea din lista legacy.

    onMigrated(newComp, ev.id);
    setLoading(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Migrează: ${ev.denumire}`}>
      <div className="space-y-4">
        <div className="bg-slate-700/40 rounded p-3 text-sm text-slate-300 space-y-1">
          <div>{fmtDate(ev.data)}{ev.data_sfarsit && ev.data_sfarsit !== ev.data ? ` – ${fmtDate(ev.data_sfarsit)}` : ''}</div>
          {ev.locatie && <div>{ev.locatie}</div>}
          {ev.probe_disponibile?.length ? <div>Probe: {ev.probe_disponibile.join(', ')}</div> : null}
        </div>
        <Select label="Tip competiție (nou sistem)" value={tip} onChange={e => setTip(e.target.value)}>
          <option value="tehnica">CN Copii/Juniori – Tehnică</option>
          <option value="giao_dau">CN Giao Dau – Lupte</option>
          <option value="cvd">CN Co Vo Dao – Arme</option>
        </Select>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
          <input type="checkbox" checked={seedCategories} onChange={e => setSeedCategories(e.target.checked)}
            className="rounded border-slate-600 bg-slate-700" />
          Generează categorii automat
        </label>
        <p className="text-xs text-slate-400 bg-green-900/20 border border-green-700/30 rounded p-2">
          Competiția va fi creată cu status <strong>Finalizată</strong>. Evenimentul vechi <strong>nu se șterge</strong> — rezultatele sportivilor înregistrați rămân păstrate și pot fi consultate din secțiunea Rezultate.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Anulează</Button>
          <Button variant="success" onClick={handleMigrate} disabled={loading}>
            {loading ? 'Se migrează...' : 'Migrează'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
