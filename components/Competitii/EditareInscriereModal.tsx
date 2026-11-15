// Faza 42 D-08: editare dupa inscriere = quyen + categorie compatibila (individual) sau mutare de categorie (echipa);
// membrii/arma echipei raman in "Editeaza componenta". D-07: drepturile le decide apelantul si le impune RLS;
// D-09: taxa nu se recalculeaza si nu se refactureaza (diferentele apar in «De rezolvat», tab Financiar).
import React, { useEffect, useMemo, useState } from 'react';
import type { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie, Grad, Inlantuire } from '../../types';
import { supabase } from '../../supabaseClient';
import { Modal, Button, Select } from '../ui';
import { useError } from '../ErrorProvider';
import { categorieActiva } from './constants';
import { compatibile, participanti, verificaTinta } from '../../utils/categoriiAdmin';
import { gradEfectivLaData } from '../../utils/eligibilitateCompetitie';
import { taxaParticipare } from '../../utils/editareCompetitie';

export interface EditareInscriereModalProps {
  competitie: Competitie;
  probe: ProbaCompetitie[];
  categorii: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  grade: Grad[];
  tinta: { tip: 'inscriere' | 'echipa'; id: string };
  onClose: () => void;
  onSaved: () => void;
}

const etichetaCat = (c: CategorieCompetitie) => `${c.numar_categorie ?? ''}. ${c.denumire ?? ''}`.trim();

export const EditareInscriereModal: React.FC<EditareInscriereModalProps> = ({
  competitie, probe, categorii, inscrieri, echipe, grade, tinta, onClose, onSaved,
}) => {
  const { showError, showSuccess } = useError();
  const ctx = useMemo(() => ({ categorii, inscrieri, echipe, grade, competitie }), [categorii, inscrieri, echipe, grade, competitie]);

  const randSursa = tinta.tip === 'inscriere' ? inscrieri.find(i => i.id === tinta.id) : echipe.find(e => e.id === tinta.id);
  const rand = useMemo(
    () => (randSursa ? participanti([randSursa.categorie_id], ctx).find(r => r.tip === tinta.tip && r.id === tinta.id) : undefined),
    [randSursa, ctx, tinta.tip, tinta.id],
  );
  const curenta = rand ? categorii.find(c => c.id === rand.categorieId) : undefined;
  const ins = tinta.tip === 'inscriere' ? (randSursa as InscriereCompetitie | undefined) : undefined;

  const [catTintaId, setCatTintaId] = useState('');
  const [q1, setQ1] = useState(ins?.inlantuire_id ?? '');
  const [q2, setQ2] = useState(ins?.inlantuire_id_2 ?? '');
  const [optiuni, setOptiuni] = useState<Inlantuire[]>([]);
  const [saving, setSaving] = useState(false);

  // quyen-urile se aleg doar la individual fara arma (formele pe arme CVD raman in pasul "Forme pe arme" al wizardului)
  const tipProba = probe.find(p => p.id === curenta?.proba_id)?.tip_proba ?? 'thao_quyen_individual';
  // doar Thao Quyen individual: Giao Dau (arma null) nu are quyen, altfel modalul arata un camp Quyen gol pe categoriile de lupte
  const arataQuyen = tinta.tip === 'inscriere' && !!curenta && !curenta.arma && tipProba === 'thao_quyen_individual';
  const grad = useMemo(() => (rand?.sportiv ? gradEfectivLaData(rand.sportiv, grade, competitie.data_inceput) : null), [rand, grade, competitie.data_inceput]);

  useEffect(() => {
    if (!arataQuyen || !grad) return;
    let anulat = false;
    (async () => {
      const { data, error } = await supabase
        .from('inlantuiri_grade')
        .select('inlantuiri!inlantuire_id(id, denumire, ordine, activ)')
        .eq('tip_proba', tipProba)
        .eq('grade_id', grad.id);
      if (anulat) return;
      if (error) { showError('Încărcare quyen', error.message); return; }
      const lista = ((data ?? []) as unknown as { inlantuiri: Inlantuire | null }[])
        .map(r => r.inlantuiri).filter((x): x is Inlantuire => !!x && x.activ)
        .sort((a, b) => a.ordine - b.ordine);
      // quyen-ul curent ramane vizibil chiar daca nu mai e in programa gradului
      for (const [id, den] of [[ins?.inlantuire_id, ins?.inlantuire?.denumire], [ins?.inlantuire_id_2, ins?.inlantuire_2?.denumire]] as const) {
        if (id && !lista.some(x => x.id === id)) lista.push({ id, denumire: `${den ?? id} (actual, nu mai e în programa gradului)`, ordine: 999, activ: true });
      }
      setOptiuni(lista);
    })();
    return () => { anulat = true; };
  }, [arataQuyen, grad?.id, tipProba, ins?.inlantuire_id, ins?.inlantuire_id_2, showError]); // eslint-disable-line react-hooks/exhaustive-deps

  const tinte = useMemo(() => {
    if (!rand || !curenta) return [];
    return categorii
      .filter(c => categorieActiva(c) && c.id !== curenta.id && compatibile(curenta, c))
      .sort((a, b) => (a.ordine_afisare - b.ordine_afisare) || ((a.numar_categorie ?? 0) - (b.numar_categorie ?? 0)))
      .map(c => ({ cat: c, ...verificaTinta(rand, c, ctx, 'mutare') }));
  }, [rand, curenta, categorii, ctx]);

  if (!rand || !curenta || !randSursa) {
    return (
      <Modal isOpen onClose={onClose} title="Modificare înscriere">
        <p className="text-sm text-slate-300">Înscrierea nu mai există sau a fost retrasă.</p>
        <div className="flex justify-end mt-4"><Button variant="secondary" onClick={onClose}>Închide</Button></div>
      </Modal>
    );
  }

  const alesa = tinte.find(t => t.cat.id === catTintaId);
  const catFinala = alesa?.cat ?? curenta;
  const arataQ2 = arataQuyen && !!catFinala.doua_quyenuri;
  const q2Identic = arataQ2 && !!q1 && q1 === q2;
  const taxaVeche = taxaParticipare(competitie, tinta.tip, curenta);
  const taxaNoua = alesa ? taxaParticipare(competitie, tinta.tip, alesa.cat) : taxaVeche;

  const patchIns: Record<string, string | null> = {};
  if (alesa) patchIns.categorie_id = alesa.cat.id;
  if (arataQuyen) {
    if (q1 !== (ins?.inlantuire_id ?? '')) patchIns.inlantuire_id = q1 || null;
    const q2Final = arataQ2 ? q2 : '';
    if (q2Final !== (ins?.inlantuire_id_2 ?? '')) patchIns.inlantuire_id_2 = q2Final || null;
  }
  const patch = tinta.tip === 'inscriere' ? patchIns : (alesa ? { categorie_id: alesa.cat.id } : {});
  const schimbat = Object.keys(patch).length > 0;
  const poateSalva = schimbat && !saving && !q2Identic && !alesa?.blocaj;

  const salveaza = async () => {
    setSaving(true);
    try {
      const tabel = tinta.tip === 'inscriere' ? 'inscrieri_competitie' : 'echipe_competitie';
      const { data, error } = await supabase.from(tabel).update(patch).eq('id', tinta.id).eq('categorie_id', curenta.id).select('id'); // garda: randul a fost mutat intre timp => 0 randuri
      if (error) { showError('Modificare înscriere', error.message); return; }
      if (!data?.length) { showError('Modificare înscriere', 'Înscrierile s-au închis; doar federația poate modifica.'); return; }
      showSuccess('Modificare salvată', alesa ? `Mutat în «${etichetaCat(alesa.cat)}».` : 'Quyen actualizat.');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const optQuyen = (cuGol: boolean) => (
    <>
      {cuGol && <option value="">— nealeasă —</option>}
      {optiuni.map(o => <option key={o.id} value={o.id}>{o.denumire}</option>)}
    </>
  );

  return (
    <Modal isOpen onClose={onClose} title={tinta.tip === 'inscriere' ? 'Editează înscrierea' : 'Mută echipa în altă categorie'}>
      <div className="space-y-4">
        <div className="text-sm">
          <div className="font-semibold text-white">{rand.nume}</div>
          <div className="text-xs text-slate-400">Categoria curentă: {etichetaCat(curenta)}</div>
        </div>

        {arataQuyen && !grad && (
          <p className="text-xs text-amber-300">Fără grad la data competiției: quyen-urile nu se pot alege.</p>
        )}
        {arataQuyen && grad && (
          <div className="space-y-3">
            <Select label={arataQ2 ? 'Quyen 1' : 'Quyen'} value={q1} onChange={e => setQ1(e.target.value)}>{optQuyen(!ins?.inlantuire_id)}</Select>
            {arataQ2 && (
              <Select label="Quyen 2" value={q2} onChange={e => setQ2(e.target.value)}>{optQuyen(true)}</Select>
            )}
            {q2Identic && <p className="text-xs text-red-400">Quyen 2 trebuie să fie diferit de Quyen 1.</p>}
          </div>
        )}

        <div className="space-y-2">
          {tinte.length === 0 ? (
            <p className="text-xs text-slate-400">Nu există altă categorie compatibilă (aceeași probă, tip de participare și armă).</p>
          ) : (
            <Select label="Categorie" value={catTintaId} onChange={e => setCatTintaId(e.target.value)}>
              <option value="">Rămâne în {curenta.denumire}</option>
              {tinte.map(t => (
                <option key={t.cat.id} value={t.cat.id} disabled={!!t.blocaj}>
                  {etichetaCat(t.cat)}{t.blocaj ? ` — ${t.blocaj}` : ''}
                </option>
              ))}
            </Select>
          )}
          {alesa && alesa.avertismente.length > 0 && (
            <ul className="text-xs text-amber-300 list-disc pl-4 space-y-0.5">
              {alesa.avertismente.map(a => <li key={a}>{a}</li>)}
            </ul>
          )}
          {alesa && taxaVeche !== taxaNoua && (
            <p className="text-xs text-amber-300">
              Taxa calculată: {taxaVeche} lei → {taxaNoua} lei. Taxa nu se recalculează și nu se refacturează automat; mutarea apare la federație în «De rezolvat» (Financiar).
            </p>
          )}
        </div>

        {tinta.tip === 'echipa' && (
          <p className="text-xs text-slate-400">Membrii și arma echipei se modifică din «Editează componența».</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Anulează</Button>
          <Button onClick={salveaza} disabled={!poateSalva} isLoading={saving} className="w-full sm:w-auto">Salvează</Button>
        </div>
      </div>
    </Modal>
  );
};
