import React, { useState, useEffect } from 'react';
import { Competitie, ProbaCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal, Input, Select } from '../ui';
import { useError } from '../ErrorProvider';
import {
  generateTemplateTehnnica, generateTemplateGiaoDau, generateTemplateCVD,
  buildCategorieDenumire, DEFAULT_PROBE_PER_TIP, TemplateCategorieInput
} from '../../utils/competitiiTemplates';
import { TipuriLabelsContext, statusLabel } from './constants';

// -----------------------------------------------
// CREATE / EDIT COMPETITION MODAL
// -----------------------------------------------
export interface CompetitieFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (c: Competitie) => void;
  comp: Competitie | null;
}

export const CompetitieForm: React.FC<CompetitieFormProps> = ({ isOpen, onClose, onSaved, comp }) => {
  const tipuriLabelsCtx = React.useContext(TipuriLabelsContext);
  const [form, setForm] = useState({
    denumire: '', tip: 'tehnica' as Competitie['tip'],
    data_inceput: new Date().toISOString().split('T')[0],
    data_sfarsit: new Date().toISOString().split('T')[0],
    locatie: '', organizator: '', deadline_inscrieri: '',
    individual_tehnica: '80', individual_cvd: '80',
    echipa_seniori: '120', echipa_juniori: '150', cvd_echipa: '80',
    observatii: '',
    status: 'draft' as Competitie['status'],
  });
  const [loading, setLoading] = useState(false);
  const [seedCategories, setSeedCategories] = useState(true);
  const { showError } = useError();

  useEffect(() => {
    if (isOpen) {
      if (comp) {
        const ct = comp.config_taxe;
        setForm({
          denumire: comp.denumire, tip: comp.tip,
          data_inceput: comp.data_inceput, data_sfarsit: comp.data_sfarsit,
          locatie: comp.locatie || '', organizator: comp.organizator || '',
          deadline_inscrieri: comp.deadline_inscrieri || '',
          individual_tehnica: String(ct?.individual_tehnica ?? comp.taxa_individual ?? 80),
          individual_cvd: String(ct?.individual_cvd ?? 80),
          echipa_seniori: String(ct?.echipa_seniori ?? comp.taxa_echipa ?? 120),
          echipa_juniori: String(ct?.echipa_juniori ?? 150),
          cvd_echipa: String(ct?.cvd_echipa ?? 80),
          observatii: comp.observatii || '',
          status: comp.status,
        });
      } else {
        setForm({
          denumire: '', tip: 'tehnica',
          data_inceput: new Date().toISOString().split('T')[0],
          data_sfarsit: new Date().toISOString().split('T')[0],
          locatie: '', organizator: '', deadline_inscrieri: '',
          individual_tehnica: '80', individual_cvd: '80',
          echipa_seniori: '120', echipa_juniori: '150', cvd_echipa: '80',
          observatii: '',
          status: 'draft',
        });
        setSeedCategories(true);
      }
    }
  }, [isOpen, comp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const configTaxe = {
        individual_tehnica: parseFloat(form.individual_tehnica) || 80,
        individual_cvd: parseFloat(form.individual_cvd) || 80,
        echipa_seniori: parseFloat(form.echipa_seniori) || 120,
        echipa_juniori: parseFloat(form.echipa_juniori) || 150,
        cvd_echipa: parseFloat(form.cvd_echipa) || 80,
        currency: 'RON',
      };
      const payload = {
        denumire: form.denumire.trim(), tip: form.tip,
        data_inceput: form.data_inceput, data_sfarsit: form.data_sfarsit,
        locatie: form.locatie.trim() || null, organizator: form.organizator.trim() || null,
        deadline_inscrieri: form.deadline_inscrieri || null,
        taxa_individual: configTaxe.individual_tehnica,
        taxa_echipa: configTaxe.echipa_seniori,
        config_taxe: configTaxe,
        observatii: form.observatii.trim() || null,
        status: form.status,
      };

      let competitieId: string;

      if (comp) {
        const { data, error } = await supabase.from('competitii').update(payload).eq('id', comp.id).select().single();
        if (error) throw error;
        onSaved(data as Competitie);
        onClose();
        return;
      } else {
        const { data, error } = await supabase.from('competitii').insert(payload).select().single();
        if (error) throw error;
        competitieId = (data as Competitie).id;

        // Seed probe implicite
        const probeDefault = DEFAULT_PROBE_PER_TIP[form.tip] || [];
        if (probeDefault.length > 0) {
          const probePayload = probeDefault.map((p, i) => ({
            competitie_id: competitieId,
            tip_proba: p.tip_proba,
            denumire: p.denumire,
            ordine_afisare: i,
          }));
          const { data: probeData, error: probeErr } = await supabase
            .from('probe_competitie').insert(probePayload).select();
          if (probeErr) throw probeErr;

          // Seed categorii din template
          if (seedCategories && probeData) {
            const probeMap: Record<string, string> = {};
            for (const p of probeData as ProbaCompetitie[]) {
              probeMap[p.tip_proba] = p.id;
            }

            let templateCats: TemplateCategorieInput[] = [];
            if (form.tip === 'tehnica') templateCats = generateTemplateTehnnica();
            else if (form.tip === 'giao_dau') templateCats = generateTemplateGiaoDau();
            else if (form.tip === 'cvd') templateCats = generateTemplateCVD();

            if (templateCats.length > 0) {
              const catPayload = templateCats.map((cat, i) => ({
                competitie_id: competitieId,
                proba_id: probeMap[cat.tip_proba] || null,
                numar_categorie: cat.numar_categorie,
                denumire: buildCategorieDenumire(cat),
                varsta_min: cat.varsta_min,
                varsta_max: cat.varsta_max,
                gen: cat.gen,
                grad_min_ordine: cat.grad_min_ordine,
                grad_max_ordine: cat.grad_max_ordine,
                arma: cat.arma,
                tip_participare: cat.tip_participare,
                sportivi_per_echipa_min: cat.sportivi_per_echipa_min,
                sportivi_per_echipa_max: cat.sportivi_per_echipa_max,
                rezerve_max: cat.rezerve_max,
                max_echipe_per_club: cat.max_echipe_per_club,
                min_participanti_start: cat.min_participanti_start,
                ordine_afisare: i,
              }));
              const { error: catErr } = await supabase.from('categorii_competitie').insert(catPayload);
              if (catErr) throw catErr;
            }
          }
        }

        const { data: freshComp } = await supabase.from('competitii').select().eq('id', competitieId).single();
        onSaved(freshComp as Competitie);
        onClose();
      }
    } catch (err: any) {
      showError("Eroare", err.message || "Eroare la salvare competiție");
    } finally {
      setLoading(false);
    }
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={comp ? 'Editează Competiție' : 'Adaugă Competiție Nouă'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Denumire" value={form.denumire} onChange={f('denumire')} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Tip Competiție" value={form.tip} onChange={f('tip')}>
            {Array.from(tipuriLabelsCtx.entries()).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select label="Status" value={form.status} onChange={f('status')}>
            {Object.entries(statusLabel).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Data Început" type="date" value={form.data_inceput} onChange={f('data_inceput')} required />
          <Input label="Data Sfârșit" type="date" value={form.data_sfarsit} onChange={f('data_sfarsit')} required />
        </div>
        <Input label="Deadline Înscrieri" type="date" value={form.deadline_inscrieri} onChange={f('deadline_inscrieri')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Locație" value={form.locatie} onChange={f('locatie')} />
          <Input label="Organizator" value={form.organizator} onChange={f('organizator')} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Taxe înscriere (RON)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Input label="Individual Tehnică" type="number" min="0" value={form.individual_tehnica} onChange={f('individual_tehnica')} />
            <Input label="Individual CVD" type="number" min="0" value={form.individual_cvd} onChange={f('individual_cvd')} />
            <Input label="Echipă Seniori" type="number" min="0" value={form.echipa_seniori} onChange={f('echipa_seniori')} />
            <Input label="Echipă Juniori" type="number" min="0" value={form.echipa_juniori} onChange={f('echipa_juniori')} />
            <Input label="CVD Echipă" type="number" min="0" value={form.cvd_echipa} onChange={f('cvd_echipa')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Observații</label>
          <textarea
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white resize-none"
            rows={3}
            value={form.observatii}
            onChange={f('observatii')}
          />
        </div>
        {!comp && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={seedCategories} onChange={e => setSeedCategories(e.target.checked)}
              className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-300">
              Generează automat categoriile din template ({form.tip === 'tehnica' ? '~100' : form.tip === 'giao_dau' ? '20' : '~80'} categorii)
            </span>
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button type="submit" variant="success" disabled={loading}>
            {loading ? 'Se salvează...' : (comp ? 'Actualizează' : 'Creează Competiție')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
