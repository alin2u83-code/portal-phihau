/**
 * Quick 260926-b7z — Varianta 1 (semi-auto) notificări restanțieri.
 *
 * Funcții pure, fără React, fără Supabase, fără Date.now() — determinist
 * pentru teste. Generează, pur client-side din datele deja încărcate
 * (plati, sportivi, familii din filteredData), lista părinților cu taxa
 * lunară (Abonament) neachitată pentru o lună/an dat, cu mesaj personalizat
 * per destinatar și link wa.me pre-completat.
 *
 * Rulare teste: `npx tsx utils/notificariRestantieri.test.ts`
 */

import type { Plata, Sportiv, Familie, NotificareRestanta } from '../types';
import { esteDeIncasat } from './paymentStatus';
import { formatLuna } from './luniLipsa';
import { formatNume } from './formatareSportiv';

// ─── Telefon ────────────────────────────────────────────────────────────────

/**
 * Normalizează un număr de telefon la formatul internațional cerut de wa.me
 * (doar cifre, fără '+', fără zerouri de prefix internațional).
 *
 * Reguli: ia doar primul număr dacă câmpul conține mai multe (separate prin
 * , ; / | sau cuvântul ' sau '); prefix '00' se elimină (dacă nu are deja
 * '+'); un număr de 10 cifre care începe cu '0' devine '40' + restul;
 * un număr de 9 cifre care începe cu '7' devine '40' + cifrele. Rezultatul
 * e valid doar dacă are între 10 și 15 cifre (limita E.164).
 */
export function normalizeazaTelefonWa(telefon?: string | null): string | null {
  if (!telefon) return null;

  const segmente = telefon.split(/[,;/|]| sau /i);
  const segment = (segmente[0] ?? '').trim();
  if (!segment) return null;

  const arePlus = segment.startsWith('+');
  let cifre = segment.replace(/\D/g, '');
  if (!cifre) return null;

  if (!arePlus && cifre.startsWith('00')) {
    cifre = cifre.slice(2);
  }

  if (cifre.length === 10 && cifre.startsWith('0')) {
    cifre = '40' + cifre.slice(1);
  } else if (cifre.length === 9 && cifre.startsWith('7')) {
    cifre = '40' + cifre;
  }

  if (cifre.length < 10 || cifre.length > 15) return null;
  return cifre;
}

// ─── Format sumă ────────────────────────────────────────────────────────────

/** Formatează o sumă RON determinist (fără dependență de ICU): întreg -> "150", altfel "150,50". */
export function formateazaSumaLei(suma: number): string {
  if (Number.isInteger(suma)) return String(suma);
  return suma.toFixed(2).replace('.', ',');
}

// ─── Mesaj ──────────────────────────────────────────────────────────────────

function uneșteNume(nume: string[]): string {
  if (nume.length === 0) return '';
  if (nume.length === 1) return nume[0];
  if (nume.length === 2) return `${nume[0]} și ${nume[1]}`;
  return `${nume.slice(0, -1).join(', ')} și ${nume[nume.length - 1]}`;
}

/** Construiește mesajul WhatsApp/clipboard pentru unul sau mai mulți sportivi (același telefon). */
export function construiesteMesajRestanta(
  numeSportivi: string[],
  suma: number,
  luna: number,
  an: number
): string {
  const nume = uneșteNume(numeSportivi);
  const verb = numeSportivi.length > 1 ? 'au' : 'are';
  return `Bună ziua! ${nume} ${verb} de achitat taxa lunară ${formateazaSumaLei(suma)} lei pentru ${formatLuna(luna, an)}. Mulțumim!`;
}

/** Construiește linkul wa.me cu textul pre-completat (encodat). */
export function construiesteLinkWhatsApp(telefonWa: string, mesaj: string): string {
  return `https://wa.me/${telefonWa}?text=${encodeURIComponent(mesaj)}`;
}

// ─── Luna/anul unei facturi ─────────────────────────────────────────────────

/**
 * Determină luna/anul unei facturi: p.luna/p.an dacă există, altfel parsate
 * direct din șirul p.data (primele 10 caractere, format YYYY-MM-DD) — parsare
 * pe șir, NU new Date(), ca să nu apară decalaj de fus orar (același fallback
 * semantic ca PlatiScadente.tsx).
 */
function lunaAnFactura(p: Pick<Plata, 'luna' | 'an' | 'data'>): { luna: number | null; an: number | null } {
  if (p.luna != null && p.an != null) return { luna: p.luna, an: p.an };

  const str = (p.data ?? '').toString().slice(0, 10);
  if (str.length < 10) return { luna: null, an: null };

  const an = parseInt(str.slice(0, 4), 10);
  const luna = parseInt(str.slice(5, 7), 10);
  if (Number.isNaN(an) || Number.isNaN(luna)) return { luna: null, an: null };
  return { luna, an };
}

/** Perechile distincte {luna, an} ale facturilor Abonament de încasat, sortate descrescător (cea mai recentă prima). */
export function luniCuAbonamenteRestante(plati: Plata[]): { luna: number; an: number }[] {
  const gasite = new Map<string, { luna: number; an: number }>();

  for (const p of plati || []) {
    if (p.tip !== 'Abonament' || !esteDeIncasat(p)) continue;
    const { luna, an } = lunaAnFactura(p);
    if (luna == null || an == null) continue;
    const cheie = `${an}-${luna}`;
    if (!gasite.has(cheie)) gasite.set(cheie, { luna, an });
  }

  return Array.from(gasite.values()).sort((a, b) => (b.an - a.an) || (b.luna - a.luna));
}

// ─── Rezolvare club factură ─────────────────────────────────────────────────

function clubFactura(
  p: Plata,
  sportivById: Map<string, Sportiv>,
  familiiById: Map<string, Familie>,
  membriByFamilieId: Map<string, Sportiv[]>
): string | null {
  if (p.club_id) return p.club_id;

  if (p.sportiv_id) {
    const s = sportivById.get(p.sportiv_id);
    if (s?.club_id) return s.club_id;
  }

  if (p.familie_id) {
    const f = familiiById.get(p.familie_id);
    if (f?.club_id) return f.club_id;
    const membri = membriByFamilieId.get(p.familie_id) || [];
    const primulCuClub = membri.find(m => m.club_id);
    if (primulCuClub) return primulCuClub.club_id ?? null;
  }

  return null;
}

// ─── Generare notificări ────────────────────────────────────────────────────

interface FacturaRezolvata {
  telefonWa: string | null;
  telefonAfisat: string | null;
  sursaTelefon: NotificareRestanta['sursaTelefon'];
  numeSportivi: string[];
  sportivIds: string[];
  plataId: string;
  suma: number;
  areAchitariPartiale: boolean;
}

export function genereazaNotificariRestantieri(params: {
  plati: Plata[];
  sportivi: Sportiv[];
  familii: Familie[];
  luna: number;
  an: number;
  clubId?: string | null;
}): NotificareRestanta[] {
  const { plati, sportivi, familii, luna, an, clubId } = params;

  const sportivById = new Map<string, Sportiv>((sportivi || []).map(s => [s.id, s]));
  const familiiById = new Map<string, Familie>((familii || []).map(f => [f.id, f]));
  const membriByFamilieId = new Map<string, Sportiv[]>();
  for (const s of sportivi || []) {
    if (!s.familie_id) continue;
    const arr = membriByFamilieId.get(s.familie_id) || [];
    arr.push(s);
    membriByFamilieId.set(s.familie_id, arr);
  }

  const facturiFiltrate = (plati || []).filter(p => {
    if (p.tip !== 'Abonament' || !esteDeIncasat(p)) return false;
    const { luna: lunaFactura, an: anFactura } = lunaAnFactura(p);
    if (lunaFactura !== luna || anFactura !== an) return false;
    if (clubId) {
      const club = clubFactura(p, sportivById, familiiById, membriByFamilieId);
      if (club !== clubId) return false;
    }
    return true;
  });

  const rezolvate: FacturaRezolvata[] = facturiFiltrate.map(p => {
    const areAchitariPartiale = p.status === 'Achitat Parțial';

    if (p.sportiv_id) {
      const sportiv = sportivById.get(p.sportiv_id);
      const nume = sportiv
        ? formatNume(sportiv)
        : formatNume({ nume: p.sportiv_nume, prenume: p.sportiv_prenume });
      const telefonAfisat = sportiv?.telefon ?? null;
      const telefonWa = normalizeazaTelefonWa(telefonAfisat);

      return {
        telefonWa,
        telefonAfisat,
        sursaTelefon: 'sportiv',
        numeSportivi: [nume],
        sportivIds: sportiv ? [sportiv.id] : [p.sportiv_id],
        plataId: p.id,
        suma: p.suma,
        areAchitariPartiale,
      };
    }

    // Factură de familie
    const familie = p.familie_id ? familiiById.get(p.familie_id) : undefined;
    const membriSportivi = p.familie_id ? (membriByFamilieId.get(p.familie_id) || []) : [];
    const membriActivi = membriSportivi.filter(s => s.status === 'Activ');
    const membriPentruNume = membriActivi.length > 0 ? membriActivi : membriSportivi;

    let numeSportivi: string[];
    let sportivIds: string[];
    if (membriPentruNume.length > 0) {
      numeSportivi = membriPentruNume.map(s => formatNume(s));
      sportivIds = membriPentruNume.map(s => s.id);
    } else {
      numeSportivi = [`Familia ${familie?.nume ?? ''}`.trim()];
      sportivIds = [];
    }

    let telefonWa: string | null = null;
    let telefonAfisat: string | null = null;
    let sursaTelefon: NotificareRestanta['sursaTelefon'] = null;

    const reprezentant = familie?.reprezentant_id ? sportivById.get(familie.reprezentant_id) : undefined;
    const telWaReprezentant = reprezentant ? normalizeazaTelefonWa(reprezentant.telefon) : null;
    if (telWaReprezentant) {
      telefonWa = telWaReprezentant;
      telefonAfisat = reprezentant!.telefon ?? null;
      sursaTelefon = 'reprezentant_familie';
    } else {
      const membruCuTel = membriSportivi.find(s => normalizeazaTelefonWa(s.telefon));
      if (membruCuTel) {
        telefonWa = normalizeazaTelefonWa(membruCuTel.telefon);
        telefonAfisat = membruCuTel.telefon ?? null;
        sursaTelefon = 'membru_familie';
      }
    }

    return {
      telefonWa,
      telefonAfisat,
      sursaTelefon,
      numeSportivi,
      sportivIds,
      plataId: p.id,
      suma: p.suma,
      areAchitariPartiale,
    };
  });

  // Grupare "per părinte": facturile cu același telefonWa non-null se unesc
  // într-o singură notificare. Facturile fără telefon valid NU se grupează.
  const grupuriCuTelefon = new Map<string, {
    telefonAfisat: string | null;
    sursaTelefon: NotificareRestanta['sursaTelefon'];
    numeSportivi: string[];
    sportivIds: string[];
    plataIds: string[];
    suma: number;
    areAchitariPartiale: boolean;
  }>();
  const notificariFaraTelefon: NotificareRestanta[] = [];

  for (const r of rezolvate) {
    if (r.telefonWa) {
      const existent = grupuriCuTelefon.get(r.telefonWa);
      if (existent) {
        for (const n of r.numeSportivi) {
          if (!existent.numeSportivi.includes(n)) existent.numeSportivi.push(n);
        }
        existent.sportivIds.push(...r.sportivIds);
        existent.plataIds.push(r.plataId);
        existent.suma += r.suma;
        existent.areAchitariPartiale = existent.areAchitariPartiale || r.areAchitariPartiale;
      } else {
        grupuriCuTelefon.set(r.telefonWa, {
          telefonAfisat: r.telefonAfisat,
          sursaTelefon: r.sursaTelefon,
          numeSportivi: [...r.numeSportivi],
          sportivIds: [...r.sportivIds],
          plataIds: [r.plataId],
          suma: r.suma,
          areAchitariPartiale: r.areAchitariPartiale,
        });
      }
    } else {
      notificariFaraTelefon.push({
        cheie: `fara-telefon:${r.plataId}`,
        telefonAfisat: r.telefonAfisat,
        telefonWa: null,
        sursaTelefon: r.sursaTelefon,
        numeSportivi: r.numeSportivi,
        sportivIds: r.sportivIds,
        plataIds: [r.plataId],
        suma: r.suma,
        areAchitariPartiale: r.areAchitariPartiale,
        luna,
        an,
        mesaj: construiesteMesajRestanta(r.numeSportivi, r.suma, luna, an),
      });
    }
  }

  const notificariCuTelefon: NotificareRestanta[] = Array.from(grupuriCuTelefon.entries()).map(
    ([telefonWa, g]) => ({
      cheie: telefonWa,
      telefonAfisat: g.telefonAfisat,
      telefonWa,
      sursaTelefon: g.sursaTelefon,
      numeSportivi: g.numeSportivi,
      sportivIds: g.sportivIds,
      plataIds: g.plataIds,
      suma: g.suma,
      areAchitariPartiale: g.areAchitariPartiale,
      luna,
      an,
      mesaj: construiesteMesajRestanta(g.numeSportivi, g.suma, luna, an),
    })
  );

  const sorteazaDupaNume = (a: NotificareRestanta, b: NotificareRestanta) =>
    (a.numeSportivi[0] ?? '').localeCompare(b.numeSportivi[0] ?? '', 'ro');

  notificariCuTelefon.sort(sorteazaDupaNume);
  notificariFaraTelefon.sort(sorteazaDupaNume);

  return [...notificariCuTelefon, ...notificariFaraTelefon];
}
