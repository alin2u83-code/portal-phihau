import React, { useState, useEffect, useCallback } from 'react';
import { Permissions, Competitie, ProbaCompetitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, Sportiv, Grad } from '../../types';
import { supabase } from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { Button, Modal, Input, Select, Card } from '../ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from '../icons';
import { useError } from '../ErrorProvider';
import {
  generateTemplateTehnnica, generateTemplateGiaoDau, generateTemplateCVD,
  buildCategorieDenumire, ordineToLabel, TIP_PROBA_LABELS, TIP_COMPETITIE_LABELS,
  DEFAULT_PROBE_PER_TIP, TemplateCategorieInput
} from '../../utils/competitiiTemplates';
import { filtreazaSportiviEligibili, calculeazaVarstaLaData } from '../../utils/eligibilitateCompetitie';

interface CompetitiiProps {
  permissions: Permissions;
  onBack: () => void;
}

type View = 'list' | 'detail' | 'inscrieri';

// -----------------------------------------------
// HELPERS
// -----------------------------------------------
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('ro-RO') : '-';

const statusLabel: Record<string, { label: string; color: string }> = {
  draft: { label: 'Schiță', color: 'bg-slate-700 text-slate-300' },
  inscrieri_deschise: { label: 'Înscrieri deschise', color: 'bg-green-800 text-green-200' },
  inscrieri_inchise: { label: 'Înscrieri închise', color: 'bg-yellow-800 text-yellow-200' },
  finalizata: { label: 'Finalizată', color: 'bg-blue-900 text-blue-200' },
};

const tipBadge: Record<string, string> = {
  tehnica: 'bg-purple-800 text-purple-200',
  giao_dau: 'bg-red-800 text-red-200',
  cvd: 'bg-orange-800 text-orange-200',
};

// -----------------------------------------------
// CREATE / EDIT COMPETITION MODAL
// -----------------------------------------------
interface CompetitieFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (c: Competitie) => void;
  comp: Competitie | null;
}

const CompetitieForm: React.FC<CompetitieFormProps> = ({ isOpen, onClose, onSaved, comp }) => {
  const [form, setForm] = useState({
    denumire: '', tip: 'tehnica' as Competitie['tip'],
    data_inceput: new Date().toISOString().split('T')[0],
    data_sfarsit: new Date().toISOString().split('T')[0],
    locatie: '', organizator: '', deadline_inscrieri: '',
    taxa_individual: '100', taxa_echipa: '150', observatii: '',
    status: 'draft' as Competitie['status'],
  });
  const [loading, setLoading] = useState(false);
  const [seedCategories, setSeedCategories] = useState(true);
  const { showError } = useError();

  useEffect(() => {
    if (isOpen) {
      if (comp) {
        setForm({
          denumire: comp.denumire, tip: comp.tip,
          data_inceput: comp.data_inceput, data_sfarsit: comp.data_sfarsit,
          locatie: comp.locatie || '', organizator: comp.organizator || '',
          deadline_inscrieri: comp.deadline_inscrieri || '',
          taxa_individual: String(comp.taxa_individual),
          taxa_echipa: String(comp.taxa_echipa),
          observatii: comp.observatii || '',
          status: comp.status,
        });
      } else {
        setForm({
          denumire: '', tip: 'tehnica',
          data_inceput: new Date().toISOString().split('T')[0],
          data_sfarsit: new Date().toISOString().split('T')[0],
          locatie: '', organizator: '', deadline_inscrieri: '',
          taxa_individual: '100', taxa_echipa: '150', observatii: '',
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
      const payload = {
        denumire: form.denumire.trim(), tip: form.tip,
        data_inceput: form.data_inceput, data_sfarsit: form.data_sfarsit,
        locatie: form.locatie.trim() || null, organizator: form.organizator.trim() || null,
        deadline_inscrieri: form.deadline_inscrieri || null,
        taxa_individual: parseFloat(form.taxa_individual) || 0,
        taxa_echipa: parseFloat(form.taxa_echipa) || 0,
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
        <div className="grid grid-cols-2 gap-4">
          <Select label="Tip Competiție" value={form.tip} onChange={f('tip')}>
            {Object.entries(TIP_COMPETITIE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select label="Status" value={form.status} onChange={f('status')}>
            {Object.entries(statusLabel).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Data Început" type="date" value={form.data_inceput} onChange={f('data_inceput')} required />
          <Input label="Data Sfârșit" type="date" value={form.data_sfarsit} onChange={f('data_sfarsit')} required />
        </div>
        <Input label="Deadline Înscrieri" type="date" value={form.deadline_inscrieri} onChange={f('deadline_inscrieri')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Locație" value={form.locatie} onChange={f('locatie')} />
          <Input label="Organizator" value={form.organizator} onChange={f('organizator')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Taxă Individual (lei)" type="number" value={form.taxa_individual} onChange={f('taxa_individual')} />
          <Input label="Taxă Echipă (lei)" type="number" value={form.taxa_echipa} onChange={f('taxa_echipa')} />
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

// -----------------------------------------------
// COMPETITION DETAIL (categories + registrations view)
// -----------------------------------------------
interface CompetitieDetailProps {
  competitie: Competitie;
  permissions: Permissions;
  onBack: () => void;
  onUpdated: (c: Competitie) => void;
}

const CompetitieDetail: React.FC<CompetitieDetailProps> = ({ competitie, permissions, onBack, onUpdated }) => {
  const { filteredData, grade, currentUser } = useData();
  const { showError } = useError();
  const [probe, setProbe] = useState<ProbaCompetitie[]>([]);
  const [categorii, setCategorii] = useState<CategorieCompetitie[]>([]);
  const [inscrieri, setInscrieri] = useState<InscriereCompetitie[]>([]);
  const [echipe, setEchipe] = useState<EchipaCompetitie[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categorii' | 'inscrieri'>('categorii');
  const [selectedProbaId, setSelectedProbaId] = useState<string>('');
  const [inscriereModal, setInscriereModal] = useState<CategorieCompetitie | null>(null);

  const isAdmin = permissions.isSuperAdmin || permissions.isFederationAdmin;
  const isClubAdmin = permissions.isAdminClub;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [probeRes, catRes, inRes, echRes] = await Promise.all([
      supabase.from('probe_competitie').select().eq('competitie_id', competitie.id).order('ordine_afisare'),
      supabase.from('categorii_competitie').select().eq('competitie_id', competitie.id).order('ordine_afisare'),
      supabase.from('inscrieri_competitie').select('*, sportiv:sportivi(id, nume, prenume, grad_actual_id, data_nasterii)').eq('competitie_id', competitie.id),
      supabase.from('echipe_competitie').select('*, echipa_sportivi(sportiv_id, rol, sportiv:sportivi(id, nume, prenume))').eq('competitie_id', competitie.id),
    ]);
    setProbe((probeRes.data || []) as ProbaCompetitie[]);
    setCategorii((catRes.data || []) as CategorieCompetitie[]);
    setInscrieri((inRes.data || []) as InscriereCompetitie[]);
    setEchipe((echRes.data || []) as EchipaCompetitie[]);
    setLoading(false);
  }, [competitie.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredCategorii = selectedProbaId
    ? categorii.filter(c => c.proba_id === selectedProbaId)
    : categorii;

  const inscrieriCount = (catId: string) =>
    inscrieri.filter(i => i.categorie_id === catId).length +
    echipe.filter(e => e.categorie_id === catId).length;

  const canRegister = competitie.status === 'inscrieri_deschise';
  const myClubId = currentUser?.club_id;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2">
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{competitie.denumire}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipBadge[competitie.tip]}`}>
              {TIP_COMPETITIE_LABELS[competitie.tip]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusLabel[competitie.status]?.color}`}>
              {statusLabel[competitie.status]?.label}
            </span>
            <span className="text-xs text-slate-400">{fmtDate(competitie.data_inceput)} – {fmtDate(competitie.data_sfarsit)}</span>
            {competitie.locatie && <span className="text-xs text-slate-400">{competitie.locatie}</span>}
          </div>
        </div>
        {isAdmin && (
          <Button
            size="sm" variant="secondary"
            onClick={async () => {
              const newStatus = competitie.status === 'draft' ? 'inscrieri_deschise'
                : competitie.status === 'inscrieri_deschise' ? 'inscrieri_inchise'
                  : competitie.status === 'inscrieri_inchise' ? 'finalizata' : 'draft';
              const { data, error } = await supabase.from('competitii')
                .update({ status: newStatus }).eq('id', competitie.id).select().single();
              if (!error && data) onUpdated(data as Competitie);
            }}
          >
            {competitie.status === 'draft' ? 'Deschide Înscrierile' :
              competitie.status === 'inscrieri_deschise' ? 'Închide Înscrierile' :
                competitie.status === 'inscrieri_inchise' ? 'Finalizează' : 'Redeschide'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-0">
        {(['categorii', 'inscrieri'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            {tab === 'categorii' ? `Categorii (${categorii.length})` : `Înscrieri (${inscrieri.length + echipe.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Se încarcă...</div>
      ) : (
        <>
          {/* CATEGORII TAB */}
          {activeTab === 'categorii' && (
            <div className="space-y-3">
              {/* Filter by proba */}
              {probe.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedProbaId('')}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${!selectedProbaId ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
                  >
                    Toate ({categorii.length})
                  </button>
                  {probe.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProbaId(p.id)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedProbaId === p.id ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
                    >
                      {p.denumire} ({categorii.filter(c => c.proba_id === p.id).length})
                    </button>
                  ))}
                </div>
              )}

              {/* Category list */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="p-2 text-left w-10">#</th>
                      <th className="p-2 text-left">Categorie</th>
                      <th className="p-2 text-left hidden md:table-cell">Probă</th>
                      <th className="p-2 text-left hidden md:table-cell">Participare</th>
                      <th className="p-2 text-center">Înscriși</th>
                      {canRegister && isClubAdmin && <th className="p-2 text-right">Acțiuni</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCategorii.map(cat => {
                      const proba = probe.find(p => p.id === cat.proba_id);
                      const count = inscrieriCount(cat.id);
                      const isTeam = cat.tip_participare !== 'individual';
                      return (
                        <tr key={cat.id} className="hover:bg-slate-800/50">
                          <td className="p-2 text-slate-500">{cat.numar_categorie}</td>
                          <td className="p-2">
                            <div className="font-medium text-white">{cat.denumire}</div>
                            {cat.arma && <div className="text-xs text-orange-400">{cat.arma}</div>}
                          </td>
                          <td className="p-2 hidden md:table-cell text-xs text-slate-400">
                            {proba ? TIP_PROBA_LABELS[proba.tip_proba] : '-'}
                          </td>
                          <td className="p-2 hidden md:table-cell text-xs">
                            {isTeam ? (
                              <span className="text-purple-300">
                                {cat.tip_participare === 'pereche' ? 'Pereche' : 'Echipă'} ({cat.sportivi_per_echipa_max} sp.)
                              </span>
                            ) : 'Individual'}
                          </td>
                          <td className="p-2 text-center">
                            <span className={`text-xs font-bold ${count >= cat.min_participanti_start ? 'text-green-400' : 'text-slate-500'}`}>
                              {count}/{cat.min_participanti_start}
                            </span>
                          </td>
                          {canRegister && isClubAdmin && (
                            <td className="p-2 text-right">
                              <Button size="sm" variant="info" onClick={() => setInscriereModal(cat)}>
                                Înscrie
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredCategorii.length === 0 && (
                <div className="text-center text-slate-500 py-8">Nicio categorie definită.</div>
              )}
            </div>
          )}

          {/* INSCRIERI TAB */}
          {activeTab === 'inscrieri' && (
            <InscrieriView
              competitie={competitie}
              categorii={categorii}
              probe={probe}
              inscrieri={inscrieri}
              echipe={echipe}
              grade={grade}
              isAdmin={isAdmin}
              myClubId={myClubId || null}
              onRefresh={fetchData}
            />
          )}
        </>
      )}

      {/* Inscriere modal */}
      {inscriereModal && (
        <InscriereModal
          competitie={competitie}
          categorie={inscriereModal}
          sportivi={filteredData.sportivi.filter(s => s.club_id === myClubId)}
          grade={grade}
          inscrieri={inscrieri}
          echipe={echipe}
          clubId={myClubId || ''}
          onClose={() => setInscriereModal(null)}
          onSaved={() => { setInscriereModal(null); fetchData(); }}
        />
      )}
    </div>
  );
};

// -----------------------------------------------
// INSCRIERI VIEW
// -----------------------------------------------
interface InscrieriViewProps {
  competitie: Competitie;
  categorii: CategorieCompetitie[];
  probe: ProbaCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  grade: Grad[];
  isAdmin: boolean;
  myClubId: string | null;
  onRefresh: () => void;
}

const InscrieriView: React.FC<InscrieriViewProps> = ({
  competitie, categorii, probe, inscrieri, echipe, grade, isAdmin, myClubId, onRefresh
}) => {
  const { showError } = useError();

  const filteredInscrieri = isAdmin ? inscrieri : inscrieri.filter(i => i.club_id === myClubId);
  const filteredEchipe = isAdmin ? echipe : echipe.filter(e => e.club_id === myClubId);

  const handleRetrage = async (id: string, type: 'inscris' | 'echipa') => {
    const table = type === 'inscris' ? 'inscrieri_competitie' : 'echipe_competitie';
    const { error } = await supabase.from(table).update({ status: 'retras' }).eq('id', id);
    if (error) { showError("Eroare", error.message); return; }
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Individual */}
      {filteredInscrieri.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
            Înregistrări Individuale ({filteredInscrieri.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="p-2 text-left">Sportiv</th>
                  <th className="p-2 text-left hidden md:table-cell">Categorie</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2 text-center hidden md:table-cell">Taxă</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredInscrieri.map(ins => {
                  const cat = categorii.find(c => c.id === ins.categorie_id);
                  const sportiv = ins.sportiv as any;
                  return (
                    <tr key={ins.id}>
                      <td className="p-2">
                        <span className="font-medium text-white">
                          {sportiv?.nume} {sportiv?.prenume}
                        </span>
                      </td>
                      <td className="p-2 hidden md:table-cell text-xs text-slate-400">
                        {cat?.denumire || '-'}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          ins.status === 'confirmat' ? 'bg-green-800 text-green-200' :
                          ins.status === 'retras' ? 'bg-red-800 text-red-200' :
                          'bg-slate-700 text-slate-300'
                        }`}>{ins.status}</span>
                      </td>
                      <td className="p-2 text-center hidden md:table-cell">
                        {ins.taxa_achitata
                          ? <span className="text-green-400 text-xs">Achitată</span>
                          : <span className="text-red-400 text-xs">Neachitată</span>}
                      </td>
                      <td className="p-2 text-right">
                        {ins.status === 'inscris' && (
                          <Button size="sm" variant="danger" onClick={() => handleRetrage(ins.id, 'inscris')}
                            className="text-xs !py-1">Retrage</Button>
                        )}
                        {isAdmin && ins.status !== 'confirmat' && ins.status !== 'retras' && (
                          <Button size="sm" variant="success" className="text-xs !py-1 ml-1"
                            onClick={async () => {
                              await supabase.from('inscrieri_competitie').update({ status: 'confirmat' }).eq('id', ins.id);
                              onRefresh();
                            }}>
                            Confirmă
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Echipe */}
      {filteredEchipe.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
            Echipe ({filteredEchipe.length})
          </h3>
          <div className="space-y-2">
            {filteredEchipe.map(ec => {
              const cat = categorii.find(c => c.id === ec.categorie_id);
              const sportivi = (ec as any).echipa_sportivi || [];
              return (
                <Card key={ec.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-white">
                        {ec.denumire_echipa || 'Echipă fără denumire'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{cat?.denumire}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sportivi.map((ms: any) => (
                          <span key={ms.sportiv_id} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                            {ms.sportiv?.nume} {ms.sportiv?.prenume}
                            {ms.rol === 'rezerva' && <span className="text-slate-500 ml-1">(R)</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ec.status === 'confirmata' ? 'bg-green-800 text-green-200' :
                        ec.status === 'retrasa' ? 'bg-red-800 text-red-200' :
                        'bg-slate-700 text-slate-300'
                      }`}>{ec.status}</span>
                      {ec.status === 'inscrisa' && (
                        <Button size="sm" variant="danger" className="text-xs !py-1"
                          onClick={() => handleRetrage(ec.id, 'echipa')}>Retrage</Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {filteredInscrieri.length === 0 && filteredEchipe.length === 0 && (
        <div className="text-center text-slate-500 py-12 italic">
          {isAdmin ? 'Nicio înscriere înregistrată.' : 'Clubul tău nu are sportivi înscriși la această competiție.'}
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------
// INSCRIERE MODAL
// -----------------------------------------------
interface InscriereModalProps {
  competitie: Competitie;
  categorie: CategorieCompetitie;
  sportivi: Sportiv[];
  grade: Grad[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  clubId: string;
  onClose: () => void;
  onSaved: () => void;
}

const InscriereModal: React.FC<InscriereModalProps> = ({
  competitie, categorie, sportivi, grade, inscrieri, echipe, clubId, onClose, onSaved
}) => {
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  const isTeam = categorie.tip_participare !== 'individual';

  // For individual
  const [selectedSportivId, setSelectedSportivId] = useState('');
  // For echipa/pereche
  const [selectedTitulari, setSelectedTitulari] = useState<string[]>([]);
  const [selectedRezerve, setSelectedRezerve] = useState<string[]>([]);
  const [denEchipa, setDenEchipa] = useState('');

  // Eligibility check
  const eligibilitati = filtreazaSportiviEligibili(
    sportivi, categorie, grade, competitie.data_inceput
  );

  const eligibili = eligibilitati.filter(e => e.eligibilitate.eligibil);
  const neeligibili = eligibilitati.filter(e => !e.eligibilitate.eligibil);

  // Check already inscribed
  const inscrisPrev = new Set(inscrieri.filter(i => i.categorie_id === categorie.id).map(i => i.sportiv_id));
  const inscrisInEchipa = new Set(
    (echipe.filter(e => e.categorie_id === categorie.id) as any[])
      .flatMap(e => (e.echipa_sportivi || []).map((ms: any) => ms.sportiv_id))
  );

  const alreadyInscris = (id: string) => inscrisPrev.has(id) || inscrisInEchipa.has(id);

  const toggleTitular = (id: string) => {
    setSelectedTitulari(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= categorie.sportivi_per_echipa_max) return prev;
      return [...prev, id];
    });
  };

  const toggleRezerva = (id: string) => {
    setSelectedRezerve(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= categorie.rezerve_max) return prev;
      return [...prev, id];
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!isTeam) {
        if (!selectedSportivId) throw new Error('Selectează un sportiv');
        const { error } = await supabase.from('inscrieri_competitie').insert({
          competitie_id: competitie.id,
          categorie_id: categorie.id,
          club_id: clubId,
          sportiv_id: selectedSportivId,
        });
        if (error) throw error;
      } else {
        if (selectedTitulari.length < categorie.sportivi_per_echipa_min) {
          throw new Error(`Selectează minim ${categorie.sportivi_per_echipa_min} titulari`);
        }
        const { data: ec, error: ecErr } = await supabase.from('echipe_competitie').insert({
          competitie_id: competitie.id,
          categorie_id: categorie.id,
          club_id: clubId,
          denumire_echipa: denEchipa.trim() || null,
        }).select().single();
        if (ecErr) throw ecErr;

        const members = [
          ...selectedTitulari.map(id => ({ echipa_id: ec.id, sportiv_id: id, rol: 'titular' })),
          ...selectedRezerve.map(id => ({ echipa_id: ec.id, sportiv_id: id, rol: 'rezerva' })),
        ];
        const { error: mErr } = await supabase.from('echipa_sportivi').insert(members);
        if (mErr) throw mErr;
      }
      onSaved();
    } catch (err: any) {
      showError("Eroare", err.message || "Eroare la înscriere");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Înscrie la: ${categorie.denumire}`}>
      <div className="space-y-4">
        <div className="bg-slate-800 rounded-lg p-3 text-sm">
          <div className="text-slate-300">{categorie.denumire}</div>
          {categorie.arma && <div className="text-orange-400 text-xs mt-0.5">Armă: {categorie.arma}</div>}
          <div className="text-xs text-slate-500 mt-1">
            Participare: <strong className="text-slate-300">{categorie.tip_participare}</strong>
            {isTeam && ` · ${categorie.sportivi_per_echipa_max} sportivi/echipă`}
            {categorie.rezerve_max > 0 && ` · max ${categorie.rezerve_max} rezerve`}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Taxă: <strong className="text-green-400">{isTeam ? competitie.taxa_echipa : competitie.taxa_individual} lei</strong>
          </div>
        </div>

        {!isTeam ? (
          /* Individual */
          <div>
            <div className="text-sm text-slate-300 font-medium mb-2">
              Sportivi eligibili ({eligibili.length})
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {eligibili.map(({ sportiv }) => {
                const varsta = sportiv.data_nasterii
                  ? calculeazaVarstaLaData(sportiv.data_nasterii, competitie.data_inceput)
                  : null;
                const grad = grade.find(g => g.id === sportiv.grad_actual_id);
                const deja = alreadyInscris(sportiv.id);
                return (
                  <label
                    key={sportiv.id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-colors ${
                      deja ? 'opacity-50 cursor-not-allowed border-transparent' :
                      selectedSportivId === sportiv.id ? 'border-brand-primary bg-brand-primary/10' :
                      'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sportiv"
                      value={sportiv.id}
                      disabled={deja}
                      checked={selectedSportivId === sportiv.id}
                      onChange={() => !deja && setSelectedSportivId(sportiv.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">{sportiv.nume} {sportiv.prenume}</div>
                      <div className="text-xs text-slate-400">
                        {varsta !== null ? `${varsta} ani` : ''} · {grad?.nume || 'Fără grad'}
                        {deja && <span className="text-yellow-400 ml-2">· Deja înscris</span>}
                      </div>
                    </div>
                  </label>
                );
              })}
              {eligibili.length === 0 && (
                <div className="text-center text-slate-500 py-4 italic text-sm">
                  Niciun sportiv eligibil din club pentru această categorie.
                </div>
              )}
            </div>
            {neeligibili.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">
                  {neeligibili.length} sportivi neeligibili
                </summary>
                <div className="mt-1 space-y-1">
                  {neeligibili.map(({ sportiv, eligibilitate }) => (
                    <div key={sportiv.id} className="text-xs text-slate-600 pl-2">
                      {sportiv.nume} {sportiv.prenume}: {eligibilitate.motive.join(', ')}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : (
          /* Echipă / Pereche */
          <div className="space-y-3">
            <Input label="Denumire Echipă (opțional)" value={denEchipa} onChange={e => setDenEchipa(e.target.value)} />
            <div>
              <div className="text-sm text-slate-300 font-medium mb-1">
                Titulari ({selectedTitulari.length}/{categorie.sportivi_per_echipa_max})
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {eligibili.map(({ sportiv }) => {
                  const varsta = sportiv.data_nasterii
                    ? calculeazaVarstaLaData(sportiv.data_nasterii, competitie.data_inceput) : null;
                  const grad = grade.find(g => g.id === sportiv.grad_actual_id);
                  const deja = alreadyInscris(sportiv.id);
                  const isRezerva = selectedRezerve.includes(sportiv.id);
                  return (
                    <label key={sportiv.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-colors ${
                      deja || isRezerva ? 'opacity-40 cursor-not-allowed border-transparent' :
                      selectedTitulari.includes(sportiv.id) ? 'border-brand-primary bg-brand-primary/10' :
                      'border-slate-700 hover:border-slate-500'
                    }`}>
                      <input type="checkbox" checked={selectedTitulari.includes(sportiv.id)}
                        disabled={deja || isRezerva}
                        onChange={() => toggleTitular(sportiv.id)}
                        className="w-4 h-4" />
                      <div className="flex-1">
                        <div className="text-sm text-white">{sportiv.nume} {sportiv.prenume}</div>
                        <div className="text-xs text-slate-400">{varsta !== null ? `${varsta} ani` : ''} · {grad?.nume || '-'}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            {categorie.rezerve_max > 0 && (
              <div>
                <div className="text-sm text-slate-300 font-medium mb-1">
                  Rezerve ({selectedRezerve.length}/{categorie.rezerve_max})
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {eligibili.map(({ sportiv }) => {
                    const isTitular = selectedTitulari.includes(sportiv.id);
                    return (
                      <label key={sportiv.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer border text-xs ${
                        isTitular ? 'opacity-40 cursor-not-allowed border-transparent' :
                        selectedRezerve.includes(sportiv.id) ? 'border-purple-500 bg-purple-900/20' :
                        'border-slate-700 hover:border-slate-500'
                      }`}>
                        <input type="checkbox" checked={selectedRezerve.includes(sportiv.id)}
                          disabled={isTitular}
                          onChange={() => toggleRezerva(sportiv.id)}
                          className="w-3 h-3" />
                        <span className="text-slate-300">{sportiv.nume} {sportiv.prenume}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button variant="success" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Se înscrie...' : 'Confirmă Înscrierea'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// -----------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------
export const CompetitiiManagement: React.FC<CompetitiiProps> = ({ permissions, onBack }) => {
  const { showError } = useError();
  const [competitii, setCompetitii] = useState<Competitie[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedComp, setSelectedComp] = useState<Competitie | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editComp, setEditComp] = useState<Competitie | null>(null);
  const [search, setSearch] = useState('');

  const isAdmin = permissions.isSuperAdmin || permissions.isFederationAdmin;

  const fetchCompetitii = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('competitii')
      .select()
      .order('data_inceput', { ascending: false });
    if (error) { showError("Eroare", error.message); }
    else setCompetitii((data || []) as Competitie[]);
    setLoading(false);
  }, [showError]);

  useEffect(() => { fetchCompetitii(); }, [fetchCompetitii]);

  const filteredCompetitii = competitii.filter(c =>
    c.denumire.toLowerCase().includes(search.toLowerCase()) ||
    (c.locatie || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('Ștergi această competiție și toate datele aferente?')) return;
    const { error } = await supabase.from('competitii').delete().eq('id', id);
    if (error) showError("Eroare", error.message);
    else setCompetitii(prev => prev.filter(c => c.id !== id));
  };

  if (view === 'detail' && selectedComp) {
    return (
      <CompetitieDetail
        competitie={selectedComp}
        permissions={permissions}
        onBack={() => { setView('list'); setSelectedComp(null); }}
        onUpdated={(updated) => {
          setSelectedComp(updated);
          setCompetitii(prev => prev.map(c => c.id === updated.id ? updated : c));
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} className="!p-2">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold text-white">Competiții Qwan Ki Do</h2>
        </div>
        {isAdmin && (
          <Button variant="success" onClick={() => { setEditComp(null); setFormOpen(true); }}>
            <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Competiție
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută competiție..."
          className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(statusLabel).map(([k, { label, color }]) => (
          <div key={k} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="text-xl font-bold text-white">{competitii.filter(c => c.status === k).length}</div>
            <div className={`text-xs mt-0.5 px-1.5 py-0.5 rounded-full inline-block ${color}`}>{label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Se încarcă...</div>
      ) : (
        <div className="space-y-2">
          {filteredCompetitii.map(comp => (
            <Card
              key={comp.id}
              className="p-4 cursor-pointer hover:border-brand-primary/50 transition-colors"
              onClick={() => { setSelectedComp(comp); setView('detail'); }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white">{comp.denumire}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tipBadge[comp.tip]}`}>
                      {TIP_COMPETITIE_LABELS[comp.tip]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel[comp.status]?.color}`}>
                      {statusLabel[comp.status]?.label}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    {fmtDate(comp.data_inceput)} – {fmtDate(comp.data_sfarsit)}
                    {comp.locatie && ` · ${comp.locatie}`}
                    {comp.deadline_inscrieri && ` · Deadline: ${fmtDate(comp.deadline_inscrieri)}`}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="secondary" className="!p-2"
                      onClick={() => { setEditComp(comp); setFormOpen(true); }}>
                      <EditIcon className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="danger" className="!p-2"
                      onClick={() => handleDelete(comp.id)}>
                      <TrashIcon className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              {comp.observatii && (
                <div className="text-xs text-slate-500 mt-2">{comp.observatii}</div>
              )}
            </Card>
          ))}
          {filteredCompetitii.length === 0 && !loading && (
            <div className="text-center text-slate-500 py-16 italic">
              {isAdmin
                ? 'Nicio competiție creată. Apasă "Adaugă Competiție" pentru a începe.'
                : 'Nu există competiții disponibile momentan.'}
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      <CompetitieForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        comp={editComp}
        onSaved={(comp) => {
          if (editComp) {
            setCompetitii(prev => prev.map(c => c.id === comp.id ? comp : c));
          } else {
            setCompetitii(prev => [comp, ...prev]);
          }
        }}
      />
    </div>
  );
};
