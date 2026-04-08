export interface TourStep {
  target: string        // CSS selector, ex: '[data-tour="sportivi-adauga"]'
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /**
   * Controlează comportamentul scrollIntoView pe axa verticală.
   * 'center' (implicit) — încearcă să centreze elementul în viewport.
   * 'start'   — aduce elementul la marginea de sus a viewport-ului (util pentru elemente înalte).
   * 'end'     — aduce elementul la marginea de jos (util pentru elemente la baza paginii).
   * 'nearest' — face scroll minim necesar pentru a face elementul vizibil.
   */
  scrollBlock?: ScrollLogicalPosition
}
