function tilIso(v) {
  if (!v) return v ?? null;
  return v instanceof Date ? v.toISOString() : v;
}

/**
 * Konverterer en DB-rad (id, eier_id, [bygg_id], data jsonb, opprettet, oppdatert)
 * til det flate objektet frontend forventer: hele `data` spredt ut, med kanonisk
 * id og tidsstempler fra rad-kolonnene (overstyrer evt. gamle verdier i data).
 * Interne kolonner (eier_id, bygg_id) lekker ikke ut.
 */
export function radTilObjekt(rad) {
  if (!rad) return null;
  const data = rad.data && typeof rad.data === 'object' ? rad.data : {};
  return {
    ...data,
    id: rad.id,
    opprettet: tilIso(rad.opprettet),
    oppdatert: tilIso(rad.oppdatert),
  };
}
