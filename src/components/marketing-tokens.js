// Delte farge-tokens for markedsføringssidene (forside, kalkulator, guider).
// Ligger i egen fil (ikke i Marketing.jsx) slik at komponentfilen kun eksporterer
// komponenter — det holder Vite/React Fast Refresh velfungerende.
//
// Redesign 2026 («Varmt & friskt»): samme eksport-NAVN som før, men verdiene peker
// nå på den nye teal/krem-paletten. Se DESIGNSYSTEM.md / src/index.css.
//   navy/navyHover → merkevare-teal (CTA-flater, lenker)
//   gull           → amber-aksent (etiketter)
//   gronn          → brand-ink (positivt/aktivt)
//   tekst/2/3      → ink / muted / muted-2
//   kant           → line
//   lerret         → canvas
export const M = {
  navy: '#0E9384', navyHover: '#0B7D6E', gull: '#B97D10', gronn: '#0A6B5F',
  tekst: '#212724', tekst2: '#66706B', tekst3: '#8A938D', kant: '#EAE6DD', lerret: '#F6F4EF',
  // Ekstra nye toner brukt av redesignet:
  brandDeep: '#0C7F72', brandInk: '#0A6B5F', surface: '#FFFFFF', mint: '#E3F3F0',
  font: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
};
