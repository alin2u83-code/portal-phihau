import React, { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { useData } from '../../contexts/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Modal, Button, Input, Select } from '../ui';
import { CheckCircleIcon, ExclamationTriangleIcon, EditIcon, ChevronDownIcon, ChevronUpIcon } from '../icons';
import { getDisplayStatus, STATUS_DISPLAY_CONFIG, esteDeIncasat } from '../../utils/paymentStatus';
import { formatLuna } from '../../utils/luniLipsa';
import { formatNume } from '../../utils/formatareSportiv';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../../constants';
import {
  calculeazaSumarFactura,
  construiesteIstoricTranzactii,
  planificaAchitareRapida,
  construiestePayloadEditareFactura,
  type FormEditareFactura,
} from '../../utils/facturaDetaliu';
import type { Plata } from '../../types';

export interface FacturaDetaliuProps {
  plataId: string | null;
  onClose: () => void;
}

const METODE_PLATA = ['Cash', 'Transfer Bancar', 'Revolut'] as const;
const STATUSURI_CORECTIE = ['Neachitat', 'Achitat Parțial', 'Achitat'] as const;

export const FacturaDetaliu: React.FC<FacturaDetaliuProps> = ({ plataId, onClose }) => {
  const { filteredData, setPlati, setTranzactii, setVizualizarePlati, clubs, reduceri, activeRoleContext } = useData();
  const permissions = usePermissions(activeRoleContext);
  const { showError, showSuccess } = useError();
  const queryClient = useQueryClient();

  const [sumaIncasare, setSumaIncasare] = useState('');
  const [metodaPlata, setMetodaPlata] = useState<typeof METODE_PLATA[number]>('Cash');
  const [seProceseaza, setSeProceseaza] = useState(false);
  const [corectieExtinsa, setCorectieExtinsa] = useState(false);
  const [formCorectie, setFormCorectie] = useState<FormEditareFactura>({
    descriere: '', data: '', suma_initiala: '', suma: '', status: 'Neachitat',
  });
  const [seSalveazaCorectie, setSeSalveazaCorectie] = useState(false);

  const plata = plataId ? filteredData.plati.find(p => p.id === plataId) : undefined;

  useEffect(() => {
    if (plata) {
      setSumaIncasare(plata.suma.toFixed(2));
      setMetodaPlata('Cash');
      setFormCorectie({
        descriere: plata.descriere,
        data: (plata.data || '').toString().slice(0, 10),
        suma_initiala: plata.suma_initiala ?? plata.suma,
        suma: plata.suma,
        status: plata.status,
      });
      setCorectieExtinsa(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plata?.id]);

  const istoric = useMemo(
    () => (plata ? construiesteIstoricTranzactii(plata.id, filteredData.tranzactii || [], filteredData.vizualizarePlati || []) : []),
    [plata, filteredData.tranzactii, filteredData.vizualizarePlati]
  );

  const sumar = useMemo(() => (plata ? calculeazaSumarFactura(plata, istoric.length) : null), [plata, istoric]);

  const planAchitare = useMemo(() => {
    if (!plata) return null;
    const valoare = parseFloat(String(sumaIncasare).replace(',', '.'));
    return planificaAchitareRapida(plata, valoare);
  }, [plata, sumaIncasare]);

  if (!plataId) return null;

  if (!plata) {
    return (
      <Modal isOpen={!!plataId} onClose={onClose} title="Factură negăsită">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Factura nu a fost găsită (posibil ștearsă sau în afara clubului activ).</p>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>Închide</Button>
          </div>
        </div>
      </Modal>
    );
  }

  const poateCorecta = permissions.isAdminClub || permissions.isInstructor || permissions.isFederationAdmin;

  const platitor = (() => {
    const sportiv = plata.sportiv_id ? filteredData.sportivi.find(s => s.id === plata.sportiv_id) : null;
    if (sportiv) return formatNume(sportiv);
    const familie = plata.familie_id ? filteredData.familii.find(f => f.id === plata.familie_id) : null;
    if (familie) return `Familia ${familie.nume}`;
    if (plata.sportiv_nume || plata.sportiv_prenume) return formatNume({ nume: plata.sportiv_nume, prenume: plata.sportiv_prenume });
    return '—';
  })();

  const club = plata.club_id === FEDERATIE_ID
    ? FEDERATIE_NAME
    : (clubs.find(c => c.id === plata.club_id)?.nume ?? (plata as any).club_nume ?? '—');

  const perioada = plata.luna && plata.an ? formatLuna(plata.luna, plata.an) : '—';
  const reducere = plata.reducereDetalii || reduceri.find(r => r.id === plata.reducere_id)?.nume || null;
  const displayStatus = getDisplayStatus(plata);
  const statusConfig = STATUS_DISPLAY_CONFIG[displayStatus];

  const refetchDupaScriere = async (tranzactieId?: string | null) => {
    const { data: proaspata } = await supabase.from('plati').select('*').eq('id', plata.id).maybeSingle();
    if (proaspata) {
      setPlati(prev => prev.map(p => (p.id === plata.id ? { ...p, ...proaspata } : p)));
      setVizualizarePlati(prev => prev.map(v => (v.plata_id === plata.id ? { ...v, status: (proaspata as any).status } : v)));
    }
    if (tranzactieId) {
      const { data: t } = await supabase.from('tranzactii').select('*').eq('id', tranzactieId).maybeSingle();
      if (t) {
        setTranzactii(prev => [t as any, ...prev.filter(x => x.id !== (t as any).id)]);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['plati'] });
    queryClient.invalidateQueries({ queryKey: ['facturi-abonament-luna'] });
    return proaspata;
  };

  const handleAchitareRapida = async () => {
    if (seProceseaza || !planAchitare) return;
    if (planAchitare.tip === 'invalid') {
      showError('Sumă invalidă', planAchitare.motiv);
      return;
    }
    setSeProceseaza(true);
    try {
      if (planAchitare.tip === 'cu_corectie') {
        const { data, error } = await supabase
          .from('plati')
          .update({ suma_initiala: planAchitare.sumaInitialaNoua, suma: planAchitare.sumaIncasata })
          .eq('id', plata.id)
          .select()
          .maybeSingle();
        if (error) {
          showError('Corecție eșuată', error.message);
          return;
        }
        if (!data) {
          showError('Corecție eșuată', 'Nu s-a putut actualiza factura. Verificați permisiunile.');
          return;
        }
        setPlati(prev => prev.map(p => (p.id === data.id ? { ...p, ...data } : p)));
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc('proceseaza_plata_factura', {
        p_plata_id: plata.id,
        p_suma_incasata: planAchitare.sumaIncasata,
        p_metoda_plata: metodaPlata,
        p_data_plata: new Date().toISOString().split('T')[0],
      });

      const rezultat = rpcData as any;
      if (rpcError || !rezultat?.success) {
        const mesajBaza = rpcError?.message || rezultat?.error || 'A apărut o eroare necunoscută.';
        const mesaj = planAchitare.tip === 'cu_corectie'
          ? `Suma facturată a fost deja corectată la ${planAchitare.sumaInitialaNoua.toFixed(2)} RON; încasarea NU a fost înregistrată — reîncercați. (${mesajBaza})`
          : mesajBaza;
        showError('Încasare eșuată', mesaj);
        await refetchDupaScriere();
        return;
      }

      const proaspata = await refetchDupaScriere(rezultat.tranzactie_id);
      if ((proaspata as any)?.status === 'Achitat') {
        showSuccess('Factură achitată', `Încasare de ${planAchitare.sumaIncasata.toFixed(2)} RON înregistrată cu succes.`);
      } else {
        showError('Atenție', `Încasarea s-a înregistrat, dar statusul facturii este «${(proaspata as any)?.status ?? 'necunoscut'}» cu rest ${(proaspata as any)?.suma ?? '?'} RON. Verificați istoricul.`);
      }
    } finally {
      setSeProceseaza(false);
    }
  };

  const handleSalveazaCorectie = async () => {
    const { payload, eroare } = construiestePayloadEditareFactura(formCorectie);
    if (eroare || !payload) {
      showError('Date invalide', eroare || 'Date invalide.');
      return;
    }
    setSeSalveazaCorectie(true);
    try {
      const { data, error } = await supabase.from('plati').update(payload).eq('id', plata.id).select().maybeSingle();
      if (error) {
        showError('Corecție eșuată', error.message);
        return;
      }
      if (!data) {
        showError('Corecție eșuată', 'Nu s-a putut actualiza factura. Verificați permisiunile.');
        return;
      }
      setPlati(prev => prev.map(p => (p.id === data.id ? { ...p, ...data } : p)));
      setVizualizarePlati(prev => prev.map(v => (v.plata_id === data.id ? { ...v, status: (data as any).status } : v)));
      queryClient.invalidateQueries({ queryKey: ['plati'] });
      queryClient.invalidateQueries({ queryKey: ['facturi-abonament-luna'] });
      showSuccess('Succes', 'Factura a fost corectată.');
      setCorectieExtinsa(false);
    } finally {
      setSeSalveazaCorectie(false);
    }
  };

  const valoareIncasare = parseFloat(String(sumaIncasare).replace(',', '.'));

  return (
    <Modal isOpen={!!plataId} onClose={onClose} title={`Detalii factură — ${plata.descriere}`}>
      <div className="space-y-5">

        {/* Context */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider border-b border-[var(--t-border)] pb-1.5">Context</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mt-3 text-sm">
            <div><span className="text-slate-500">Plătitor: </span><span className="text-white font-medium">{platitor}</span></div>
            <div><span className="text-slate-500">Club: </span><span className="text-white font-medium">{club}</span></div>
            <div><span className="text-slate-500">Tip taxă: </span><span className="text-white font-medium">{plata.tip}</span></div>
            <div><span className="text-slate-500">Perioadă: </span><span className="text-white font-medium">{perioada}</span></div>
            <div><span className="text-slate-500">Data emiterii: </span><span className="text-white font-medium">{new Date((plata.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</span></div>
            <div>
              <span className="text-slate-500">Status: </span>
              <span className={`inline-block px-2 py-0.5 rounded-lg border text-xs font-semibold ${statusConfig.cls}`}>{statusConfig.label}</span>
            </div>
            <div className="sm:col-span-2"><span className="text-slate-500">Descriere: </span><span className="text-white font-medium">{plata.descriere}</span></div>
            {reducere && (
              <div className="sm:col-span-2"><span className="text-slate-500">Reducere: </span><span className="text-white font-medium">{reducere}</span></div>
            )}
          </div>
        </div>

        {/* Sume */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider border-b border-[var(--t-border)] pb-1.5">Sume</h3>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="flex flex-col items-center p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Sumă facturată</span>
              <span className="text-base font-black text-white mt-0.5">{sumar!.sumaFacturata.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500">RON</span>
            </div>
            <div className="flex flex-col items-center p-2.5 bg-emerald-950/20 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total încasat</span>
              <span className="text-base font-black text-emerald-400 mt-0.5">{sumar!.totalIncasat.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500">RON</span>
            </div>
            <div className={`flex flex-col items-center p-2.5 rounded-xl border ${sumar!.restDePlata > 0 ? 'bg-red-950/20 border-red-500/20' : 'bg-slate-800/50 border-slate-700/40'}`}>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Rest de plată</span>
              <span className={`text-base font-black mt-0.5 ${sumar!.restDePlata > 0 ? 'text-red-400' : 'text-white'}`}>{sumar!.restDePlata.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500">RON</span>
            </div>
          </div>
          {sumar!.avertizare && (
            <div className="mt-2 p-2.5 bg-amber-950/20 border border-amber-500/20 rounded-xl flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">{sumar!.avertizare}</p>
            </div>
          )}
        </div>

        {/* Istoric tranzacții */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider border-b border-[var(--t-border)] pb-1.5">Istoric tranzacții</h3>
          {istoric.length === 0 ? (
            <p className="text-sm text-slate-500 italic mt-2">Nicio încasare înregistrată pentru această factură.</p>
          ) : (
            <div className="space-y-1.5 mt-3">
              {istoric.map(rand => (
                <div key={rand.tranzactieId} className="flex justify-between items-center p-2 bg-slate-800/40 rounded-lg border border-slate-700/30 text-sm">
                  <div className="text-slate-300">
                    <span>{rand.data ? new Date(rand.data.toString().slice(0, 10)).toLocaleDateString('ro-RO') : '—'}</span>
                    <span className="text-slate-500"> · {rand.metoda || '—'}</span>
                    {rand.nrFacturiAcoperite > 1 && (
                      <span className="text-slate-500 italic"> (tranzacție comună pentru {rand.nrFacturiAcoperite} facturi)</span>
                    )}
                  </div>
                  <span className="font-bold text-emerald-400">{rand.suma.toFixed(2)} RON</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {!poateCorecta && (
          <p className="text-xs text-slate-500 italic">Doar vizualizare — corecțiile sunt disponibile pentru admin club și instructori.</p>
        )}

        {/* Acțiune rapidă */}
        {poateCorecta && esteDeIncasat(plata) && (
          <div>
            <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider border-b border-[var(--t-border)] pb-1.5">Acțiune rapidă</h3>
            <div className="space-y-3 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Sumă încasată (RON)"
                  type="number"
                  step="0.01"
                  value={sumaIncasare}
                  onChange={e => setSumaIncasare(e.target.value)}
                />
                <Select label="Metodă plată" value={metodaPlata} onChange={e => setMetodaPlata(e.target.value as any)}>
                  {METODE_PLATA.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
              </div>

              {planAchitare?.tip === 'direct' && (
                <p className="text-xs text-slate-400">
                  Se înregistrează o încasare de {planAchitare.sumaIncasata.toFixed(2)} RON; factura devine Achitat.
                </p>
              )}
              {planAchitare?.tip === 'cu_corectie' && (
                <div className="p-2.5 bg-amber-950/20 border border-amber-500/20 rounded-xl flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Suma facturată se corectează de la {planAchitare.sumaInitialaVeche.toFixed(2)} la {planAchitare.sumaInitialaNoua.toFixed(2)} RON, apoi se înregistrează încasarea de {planAchitare.sumaIncasata.toFixed(2)} RON; factura devine Achitat.
                  </p>
                </div>
              )}
              {planAchitare?.tip === 'invalid' && (
                <p className="text-xs text-red-400">{planAchitare.motiv}</p>
              )}

              <Button
                variant="success"
                className="w-full"
                onClick={handleAchitareRapida}
                isLoading={seProceseaza}
                disabled={seProceseaza || planAchitare?.tip === 'invalid'}
              >
                <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                Marchează Achitat cu {Number.isFinite(valoareIncasare) ? valoareIncasare.toFixed(2) : '0.00'} RON
              </Button>
            </div>
          </div>
        )}

        {/* Corectează manual */}
        {poateCorecta && (
          <div>
            <button
              type="button"
              onClick={() => setCorectieExtinsa(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-[var(--t-border)] pb-1.5 w-full hover:text-white transition-colors"
            >
              <EditIcon className="w-3.5 h-3.5" />
              Corectează manual
              {corectieExtinsa ? <ChevronUpIcon className="w-3.5 h-3.5 ml-auto" /> : <ChevronDownIcon className="w-3.5 h-3.5 ml-auto" />}
            </button>
            {corectieExtinsa && (
              <div className="space-y-3 mt-3">
                <Input
                  label="Descriere"
                  value={formCorectie.descriere}
                  onChange={e => setFormCorectie(prev => ({ ...prev, descriere: e.target.value }))}
                />
                <Input
                  label="Data"
                  type="date"
                  value={String(formCorectie.data).slice(0, 10)}
                  onChange={e => setFormCorectie(prev => ({ ...prev, data: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Sumă facturată (RON)"
                    type="number"
                    step="0.01"
                    value={formCorectie.suma_initiala}
                    onChange={e => setFormCorectie(prev => ({ ...prev, suma_initiala: e.target.value }))}
                  />
                  <Input
                    label="Rest de plată (RON)"
                    type="number"
                    step="0.01"
                    value={formCorectie.suma}
                    onChange={e => setFormCorectie(prev => ({ ...prev, suma: e.target.value }))}
                  />
                </div>
                <Select
                  label="Status"
                  value={formCorectie.status}
                  onChange={e => setFormCorectie(prev => ({ ...prev, status: e.target.value }))}
                >
                  {STATUSURI_CORECTIE.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Button variant="primary" className="w-full" onClick={handleSalveazaCorectie} isLoading={seSalveazaCorectie}>
                  Salvează corecția
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[var(--t-border)]">
          <Button variant="secondary" onClick={onClose}>
            Închide
          </Button>
        </div>
      </div>
    </Modal>
  );
};
