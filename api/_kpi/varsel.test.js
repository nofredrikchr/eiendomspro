import { describe, it, expect } from 'vitest';
import { byggVarselTekst } from './varsel.js';

describe('byggVarselTekst', () => {
  const tekst = byggVarselTekst({
    utleierNavn: 'Ola Eier',
    leietakerNavn: 'Kari Leier',
    adresse: 'Storgata 1',
    gjeldendeLeieOre: 1500000, // 15 000 kr
    nyLeieOre: 1546000, // 15 460 kr
    kpiRef: 'KPI mai 2025 → mai 2026: +3,1 %',
    ikrafttredelse: '2026-09-01',
  });

  it('viser dagens leie, ny leie og økning', () => {
    expect(tekst).toContain('15 000 kr');
    expect(tekst).toContain('15 460 kr');
    expect(tekst).toContain('460 kr'); // økning
  });
  it('henviser til husleieloven § 4-2', () => {
    expect(tekst).toContain('§ 4-2');
  });
  it('har KPI-referanse og ikrafttredelsesdato', () => {
    expect(tekst).toContain('KPI mai 2025');
    expect(tekst.toLowerCase()).toContain('september 2026');
  });
});
