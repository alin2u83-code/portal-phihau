export interface TourStep {
  target: string        // CSS selector, ex: '[data-tour="sportivi-adauga"]'
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}
