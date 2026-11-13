import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import type { Grad, PrevizualizareSchimbareGrad, Sportiv } from '../../../types';
import { Badge, Button, Modal } from '../../ui';
import { useError } from '../../ErrorProvider';
import { formatNume } from '../../../utils/formatareSportiv';

interface Props {
  sportiv: Sportiv | null;
  competitieId: string;
  grade: Grad[];
  onClose: () => void;
  onSaved: (sportivId: string, gradId: string) => void;
}

// Faza 40: schimbare de grad din zona externa (reprezentant de club). Gradul nou il decide SERVERUL (+1 sau echivalare la 13 ani);
// aici doar previzualizam, confirmam si anulam prin RPC. Nu exista selector de grad (D-01).
const SchimbaGradCompetitieModal: React.FC<Props> = ({ sportiv, competitieId, grade, onClose, onSaved }) => {
  const { showError, showSuccess } = useError();
  const [prev, setPrev] = useState<PrevizualizareSchimbareGrad | null>(null);
  const [loading, setLoading] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [motiv, setMotiv] = useState('');

  const sportivId = sportiv?.id;
  useEffect(() => {
    if (!sportivId) return;
    let anulat = false; // ignora raspunsuri vechi daca modalul se inchide / se schimba sportivul
    setPrev(null); setEroare(null); setMotiv(''); setLoading(true);
    supabase.rpc('previzualizeaza_schimbare_grad', { p_sportiv: sportivId, p_competitie: competitieId }).then(({ data, error }) => {
      if (anulat) return;
      if (error) setEroare(error.message);
      else setPrev(data as PrevizualizareSchimbareGrad);
      setLoading(false);
    });
    return () => { anulat = true; };
  }, [sportivId, competitieId]);

  if (!sportiv) return null;

  const numeGrad = (id: string | null | undefined) => grade.find(g => g.id === id)?.nume ?? 'fără grad';

  // grad_actual_id e derivat de trigger in DB: folosim valoarea reala, nu pe cea calculata local
  const finalizeaza = async (mesaj: string) => {
    const { data: real, error } = await supabase.from('sportivi').select('grad_actual_id').eq('id', sportiv.id).single();
    if (error || !real) { setEroare('Modificarea a fost salvată, dar nu s-a putut confirma. Reîncarcă pagina.'); return; }
    onSaved(sportiv.id, real.grad_actual_id);
    showSuccess('Schimbare grad', mesaj);
    onClose();
  };

  const confirma = async () => {
    if (busy || !prev?.grad_nou_id) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('schimba_grad_competitie', {
        p_sportiv: sportiv.id, p_competitie: competitieId, p_grad_nou: prev.grad_nou_id,
      });
      if (error) throw error;
      await finalizeaza('Gradul a fost actualizat.');
    } catch (err) {
      showError('Schimbare grad', err);
    } finally {
      setBusy(false);
    }
  };

  const anuleaza = async () => {
    const sch = prev?.schimbare_anulabila;
    if (busy || !sch) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('anuleaza_schimbare_grad_competitie', { p_schimbare: sch.id, p_motiv: motiv.trim() || null });
      if (error) throw error;
      await finalizeaza('Schimbarea a fost anulată.');
    } catch (err) {
      showError('Schimbare grad', err);
    } finally {
      setBusy(false);
    }
  };

  const sch = prev?.schimbare_anulabila ?? null;
  const motivNecesar = !!sch && !sch.in_fereastra;
  const echivalare = prev?.tip === 'echivalare';

  return (
    <Modal isOpen onClose={onClose} title={`Schimbă grad — ${formatNume(sportiv)}`}>
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          Grad actual: <span className="text-white">{numeGrad(sportiv.grad_actual_id)}</span>.
        </p>

        {loading && <p className="text-xs text-slate-400 animate-pulse">Se verifică gradul…</p>}
        {eroare && <p className="text-xs text-red-400" role="alert">{eroare}</p>}

        {prev && prev.blocat && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300" role="alert">{prev.blocat}</div>
        )}

        {prev && !prev.blocat && prev.grad_nou_id && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={echivalare ? 'blue' : 'amber'}>{echivalare ? 'Echivalare' : 'Promovare'}</Badge>
              <p className="text-sm text-white">
                {echivalare
                  ? `Echivalare la 13 ani: ${numeGrad(prev.grad_vechi_id)} → ${numeGrad(prev.grad_nou_id)}, fără cost.`
                  : `Promovare: ${numeGrad(prev.grad_vechi_id)} → ${numeGrad(prev.grad_nou_id)}.`}
              </p>
            </div>
            {!echivalare && (
              <p className="text-xs text-slate-300">
                {prev.taxa === null ? 'Taxă necunoscută; o completează federația.' : `Taxă examen: ${prev.taxa} RON (de achitat la federație).`}
              </p>
            )}
            <p className="text-xs text-slate-400">Devine gradul oficial al sportivului, în toate competițiile.</p>
            {prev.alte_competitii.length > 0 && (
              <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
                Sportivul este înscris și la: {prev.alte_competitii.join(', ')}. Verifică acolo categoria după schimbare.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose} disabled={busy} className="w-full sm:w-auto">Închide</Button>
              <Button variant="success" onClick={confirma} disabled={busy} className="w-full sm:w-auto min-h-10">
                {busy ? 'Se salvează…' : echivalare ? 'Confirmă echivalarea' : 'Confirmă promovarea'}
              </Button>
            </div>
          </div>
        )}

        {sch && (
          <div className="space-y-2 border-t border-slate-700 pt-3">
            <p className="text-xs text-slate-300">
              Schimbare făcută din această competiție: {numeGrad(sch.grad_vechi_id)} → {numeGrad(sch.grad_nou_id)}
            </p>
            {sch.achitat ? (
              <p className="text-xs text-slate-400">Marcată achitată de federație; nu se mai poate anula de aici.</p>
            ) : (
              <>
                {motivNecesar && (
                  <div>
                    <label htmlFor="motiv-anulare-grad" className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                      Motivul anulării (obligatoriu după termenul de înscriere)
                    </label>
                    <textarea
                      id="motiv-anulare-grad"
                      value={motiv}
                      onChange={e => setMotiv(e.target.value)}
                      rows={2}
                      maxLength={500}
                      disabled={busy}
                      className="w-full rounded-lg border border-[var(--t-border)] bg-[var(--t-input-bg)] px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--t-input-focus-ring)]"
                    />
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    onClick={anuleaza}
                    disabled={busy || (motivNecesar && motiv.trim().length < 5)}
                    className="w-full sm:w-auto min-h-10"
                  >
                    Anulează schimbarea
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {!loading && !prev?.grad_nou_id && !prev?.blocat && !eroare && !sch && (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Închide</Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SchimbaGradCompetitieModal;
