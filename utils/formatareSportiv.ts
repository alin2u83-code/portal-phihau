type SportivNume = { nume?: string | null; prenume?: string | null } | null | undefined;

export function formatNume(s: SportivNume): string {
  if (!s) return '—';
  const nume = s.nume?.trim() ?? '';
  const prenume = s.prenume?.trim() ?? '';
  return [nume, prenume].filter(Boolean).join(' ') || '—';
}

export function initialeNume(s: SportivNume): string {
  if (!s) return '?';
  return [(s.nume?.[0] ?? ''), (s.prenume?.[0] ?? '')].join('').toUpperCase() || '?';
}

export function sortBySportivNume(a: SportivNume, b: SportivNume): number {
  return formatNume(a).localeCompare(formatNume(b), 'ro');
}
