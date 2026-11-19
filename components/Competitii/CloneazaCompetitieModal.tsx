import React, { useState, useEffect, useMemo } from 'react';
import { Competitie, ProbaCompetitie, CategorieCompetitie, TipCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal, Input, Select } from '../ui';
import { useError } from '../ErrorProvider';
import { TIP_COMPETITIE_LABELS } from '../../utils/competitiiTemplates';
import { TipuriLabelsContext, statusLabel, fmtDate } from './constants';
import { anFramCompetitie } from '../../utils/editareCompetitie';
import { TIPURI_CLONARE, structuraInitiala, avertismenteTip, numeImplicit, valideazaClonare } from '../../utils/clonareCompetitie';
import { cloneazaCompetitie } from '../../services/clonareCompetitieService';

// Faza 45: asistent de clonare competiție (doar super admin), un singur ecran: casete, câmpuri, previzualizare.
export interface CloneazaCompetitieModalProps {
  sursa: Competitie | null;
  numeExistente: string[];
  onClose: () => void;
  onCloned: (c: Competitie) => void;
}

const checkLabel = 'flex items-center gap-2 min-h-10 touch-manipulation';

export const CloneazaCompetitieModal: React.FC<CloneazaCompetitieModalProps> = ({ sursa, numeExistente, onClose, onCloned }) => {
  const tipuriLabelsCtx = React.useContext(TipuriLabelsContext);
  const { showError } = useError();
  const [denumire, setDenumire] = useState('');
  const [tip, setTip] = useState<TipCompetitie>('tehnica');
  const [dataInceput, setDataInceput] = useState('');
  const [dataSfarsit, setDataSfarsit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [setari, setSetari] = useState(true);
  const [probe, setProbe] = useState(true);
  const [categorii, setCategorii] = useState(true);
  const [probeSursa, setProbeSursa] = useState<ProbaCompetitie[]>([]);
  const [categoriiSursa, setCategoriiSursa] = useState<CategorieCompetitie[]>([]);
  const [incarcat, setIncarcat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eroareSursa, setEroareSursa] = useState<string | null>(null);
  const [reincearca, setReincearca] = useState(0);

  useEffect(() => {
    if (!sursa) return;
    setDenumire(numeImplicit(sursa.denumire));
    setTip(TIPURI_CLONARE.includes(sursa.tip) ? sursa.tip : 'tehnica');
    setDataInceput(''); setDataSfarsit(''); setDeadline('');
    setSetari(true); setProbe(true); setCategorii(true);
    setProbeSursa([]); setCategoriiSursa([]); setIncarcat(false); setEroareSursa(null);
    let anulat = false;
    (async () => {
      const [p, c] = await Promise.all([
        supabase.from('probe_competitie').select().eq('competitie_id', sursa.id).order('ordine_afisare'),
        supabase.from('categorii_competitie').select().eq('competitie_id', sursa.id).order('ordine_afisare'),
      ]);
      if (anulat) return;
      const err = p.error || c.error;
      if (err) { setEroareSursa(err.message); showError('Eroare', err.message); return; }
      setProbeSursa((p.data ?? []) as ProbaCompetitie[]);
      setCategoriiSursa((c.data ?? []) as CategorieCompetitie[]);
      setIncarcat(true);
    })();
    return () => { anulat = true; };
  }, [sursa?.id, reincearca]);

  const st = useMemo(() => structuraInitiala(categoriiSursa), [categoriiSursa]);
  const tipAv = useMemo(
    () => sursa ? avertismenteTip(sursa.tip, tip, probeSursa, categoriiSursa, st.ids) : { probe: [], categorii: 0 },
    [sursa, tip, probeSursa, categoriiSursa, st]
  );
  const erori = valideazaClonare({ denumire, tip, dataInceput, dataSfarsit, deadline }, numeExistente);

  if (!sursa) return <Modal isOpen={false} onClose={onClose} title="Clonează competiția">{null}</Modal>;

  const eticheta = (t: string) => tipuriLabelsCtx.get(t) ?? (TIP_COMPETITIE_LABELS as Record<string, string>)[t] ?? t;
  const incompatibile = tip !== sursa.tip && tipAv.probe.length > 0;

  const handleCreeaza = async () => {
    setLoading(true);
    try {
      const { data, error } = await cloneazaCompetitie({
        sursaId: sursa.id, denumire: denumire.trim(), tip, dataInceput, dataSfarsit, deadline,
        setari, probe: probe || categorii, categorii: categorii ? st.ids : [],
      });
      if (error || !data) {
        showError('Clonare eșuată', error?.message ?? String(error));
        return;
      }
      const { data: nou, error: errNou } = await supabase.from('competitii').select().eq('id', data.id).single();
      if (errNou || !nou) {
        showError('Eroare', errNou?.message ?? 'Competiția a fost creată, dar nu a putut fi deschisă.');
        onClose();
        return;
      }
      onCloned(nou as Competitie);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Clonează competiția" persistent={loading}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Sursă: {sursa.denumire} ({statusLabel[sursa.status]?.label ?? sursa.status}, {fmtDate(sursa.data_inceput)})
        </p>
        {eroareSursa && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            <span>Nu s-au putut încărca probele/categoriile sursei: {eroareSursa}</span>
            <Button type="button" variant="secondary" size="sm" onClick={() => setReincearca(n => n + 1)}>Reîncearcă</Button>
          </div>
        )}
        <Input label="Denumire" value={denumire} onChange={e => setDenumire(e.target.value)} required />
        <Select label="Tip competiție" value={tip} onChange={e => setTip(e.target.value as TipCompetitie)}>
          {TIPURI_CLONARE.map(t => <option key={t} value={t}>{eticheta(t)}</option>)}
        </Select>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Data început" type="date" value={dataInceput} onChange={e => setDataInceput(e.target.value)} required />
          <Input label="Data sfârșit" type="date" value={dataSfarsit} onChange={e => setDataSfarsit(e.target.value)} required />
        </div>
        <Input label="Deadline înscrieri" type="date" value={deadline} max={dataInceput || undefined} onChange={e => setDeadline(e.target.value)} required />

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Ce se copiază</p>
          <label className={`${checkLabel} cursor-pointer`}>
            <input type="checkbox" className="w-4 h-4 rounded" checked={setari} onChange={e => setSetari(e.target.checked)} />
            <span className="text-sm text-slate-300">Setări: locație, organizator, taxe, regula FRAM</span>
          </label>
          <label className={`${checkLabel} ${categorii ? 'opacity-70' : 'cursor-pointer'}`}>
            <input type="checkbox" className="w-4 h-4 rounded" checked={probe || categorii} disabled={categorii} onChange={e => setProbe(e.target.checked)} />
            <span className="text-sm text-slate-300">Probe ({probeSursa.length})</span>
            {categorii && <span className="text-xs text-slate-500">Categoriile cer probele.</span>}
          </label>
          <label className={`${checkLabel} cursor-pointer`}>
            <input type="checkbox" className="w-4 h-4 rounded" checked={categorii} onChange={e => setCategorii(e.target.checked)} />
            <span className="text-sm text-slate-300">Categorii ({st.ids.length})</span>
          </label>
        </div>

        <div className="border border-slate-700 rounded p-3 space-y-1 text-sm text-slate-300">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Previzualizare</p>
          <p>Se creează „{denumire.trim()}” în Schiță, fără înscrieri și echipe.</p>
          <p>{probe || categorii ? `${probeSursa.length} probe` : 'fără probe'}</p>
          {categorii && (
            <>
              <p>{st.ids.length} categorii (numerotate 1..{st.ids.length})</p>
              {st.anulate > 0 && <p>{st.anulate} anulate incluse, devin active</p>}
              {st.excluse.length > 0 && <p>{st.excluse.length} categorii rezultate din fuziuni/împărțiri omise (se copiază structura inițială)</p>}
            </>
          )}
          {((categorii && st.avertismente.length > 0) || incompatibile) && (
            <div className="max-h-60 overflow-y-auto space-y-1 text-amber-300">
              {categorii && st.avertismente.map(a => (
                <p key={a.categorieId}>Categoria {a.numar ?? '?'}: {a.mesaj}</p>
              ))}
              {incompatibile && (
                <p>
                  Probe incompatibile cu tipul {eticheta(tip)}: {tipAv.probe.map(p => p.denumire).join(', ')}; {tipAv.categorii} categorii pe ele. Se copiază oricum; corectează în schiță.
                </p>
              )}
            </div>
          )}
          {setari ? (
            <>
              <p>Taxele și regula FRAM se copiază ca atare; verifică-le înainte de a deschide înscrierile.</p>
              {sursa.fram_obligatoriu && dataInceput && (
                <p>Regula FRAM: doar sportivi cu viza FRAM {anFramCompetitie({ data_inceput: dataInceput })}</p>
              )}
            </>
          ) : (
            <p>Taxe implicite, fără locație/organizator, fără regula FRAM.</p>
          )}
          <p className="text-slate-500">Nu se copiază: înscrieri, echipe, program, personal, acces extern, rezultate.</p>
        </div>

        {erori.length > 0 && (
          <ul className="text-sm text-red-400 list-disc pl-5">
            {erori.map(e => <li key={e}>{e}</li>)}
          </ul>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button type="button" variant="success" onClick={handleCreeaza} disabled={loading || !incarcat || erori.length > 0}>
            {loading ? 'Se creează...' : 'Creează'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
