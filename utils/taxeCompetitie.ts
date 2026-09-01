import { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie } from '../types';

export function calculeazaTaxaIndividuala(competitie: Competitie, cat?: CategorieCompetitie): number {
  const ct = competitie.config_taxe;
  if (ct) {
    return cat?.arma ? (ct.individual_cvd ?? 80) : (ct.individual_tehnica ?? 80);
  }
  return competitie.taxa_individual ?? 80;
}

export function calculeazaTaxaEchipa(cat: CategorieCompetitie, competitie: Competitie): number {
  const ct = competitie.config_taxe;
  if (ct) {
    if (cat.arma) return ct.cvd_echipa ?? 80;
    const esteJuniori = cat.varsta_max !== null && cat.varsta_max <= 17;
    return esteJuniori ? (ct.echipa_juniori ?? 150) : (ct.echipa_seniori ?? 120);
  }
  const esteJuniori = cat.varsta_max !== null && cat.varsta_max <= 17;
  if (esteJuniori) {
    return competitie.taxa_echipa ?? 150;
  }
  return competitie.taxa_echipa ?? 120;
}

export interface RandPlataCompetitie {
  id: string;
  tip: 'individual' | 'echipa';
  numeParticipant: string;
  clubId: string;
  clubNume: string;
  categorieDenumire: string;
  probaDenumire: string;
  tipProba: string;
  taxa: number;
  taxaAchitata: boolean;
}

export interface SituatiePlataCompetitie {
  randuri: RandPlataCompetitie[];
  totalCalculat: number;
  totalAchitat: number;
  totalRestant: number;
  nrIndividuale: number;
  nrEchipe: number;
}

// Fiecare echipă produce EXACT UN rând de plată — nu unul per membru de echipă.
// Taxa de echipă se plătește o singură dată per echipă, indiferent câți sportivi
// are (2-5 membri); iterarea pe echipa_sportivi ar multiplica taxa incorect.
export function construiesteRanduriPlata(
  competitie: Competitie,
  categorii: CategorieCompetitie[],
  probe: ProbaCompetitie[],
  inscrieri: InscriereCompetitie[],
  echipe: EchipaCompetitie[]
): SituatiePlataCompetitie {
  const randuri: RandPlataCompetitie[] = [];
  let totalCalculat = 0;
  let totalAchitat = 0;
  let nrIndividuale = 0;
  let nrEchipe = 0;

  for (const ins of inscrieri) {
    if (ins.status?.toLowerCase() === 'retras') continue;
    const cat = categorii.find(c => c.id === ins.categorie_id);
    const proba = probe.find(p => p.id === cat?.proba_id);
    const sp = ins.sportiv as any;
    const taxa = calculeazaTaxaIndividuala(competitie, cat);
    const taxaAchitata = ins.taxa_achitata ?? false;

    randuri.push({
      id: ins.id,
      tip: 'individual',
      numeParticipant: sp ? `${sp.nume} ${sp.prenume}` : ins.sportiv_id,
      clubId: ins.club_id,
      clubNume: sp?.cluburi?.nume ?? '',
      categorieDenumire: cat?.denumire ?? 'Categorie',
      probaDenumire: proba?.denumire ?? cat?.denumire ?? 'Probă',
      tipProba: proba?.tip_proba ?? '',
      taxa,
      taxaAchitata,
    });

    totalCalculat += taxa;
    if (taxaAchitata) totalAchitat += taxa;
    nrIndividuale++;
  }

  for (const ec of echipe) {
    if (ec.status?.toLowerCase() === 'retrasa') continue;
    const cat = categorii.find(c => c.id === ec.categorie_id);
    const proba = probe.find(p => p.id === cat?.proba_id);
    const taxa = cat
      ? calculeazaTaxaEchipa(cat, competitie)
      : (competitie.config_taxe?.echipa_seniori ?? competitie.taxa_echipa ?? 120);
    const taxaAchitata = ec.taxa_achitata ?? false;

    randuri.push({
      id: ec.id,
      tip: 'echipa',
      numeParticipant: ec.denumire_echipa ?? 'Echipă',
      clubId: ec.club_id,
      clubNume: (ec as any).club?.nume ?? '',
      categorieDenumire: cat?.denumire ?? 'Categorie',
      probaDenumire: proba?.denumire ?? cat?.denumire ?? 'Probă',
      tipProba: proba?.tip_proba ?? '',
      taxa,
      taxaAchitata,
    });

    totalCalculat += taxa;
    if (taxaAchitata) totalAchitat += taxa;
    nrEchipe++;
  }

  randuri.sort((a, b) =>
    a.probaDenumire.localeCompare(b.probaDenumire, 'ro-RO') ||
    a.categorieDenumire.localeCompare(b.categorieDenumire, 'ro-RO') ||
    a.numeParticipant.localeCompare(b.numeParticipant, 'ro-RO')
  );

  return {
    randuri,
    totalCalculat,
    totalAchitat,
    totalRestant: totalCalculat - totalAchitat,
    nrIndividuale,
    nrEchipe,
  };
}
