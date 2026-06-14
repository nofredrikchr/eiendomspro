/**
 * GET  /api/admin/partnere — liste partnere.
 * POST /api/admin/partnere — opprett partner (genererer unik referral_code).
 * Kun admin (niva=3) via medAdmin.
 */
import { medAdmin } from '../../_http.js';
import { listPartnere, opprettPartner } from '../../_partner/db.js';

export default medAdmin({
  GET: async (req, res) => {
    const partnere = await listPartnere();
    return res.status(200).json({ partnere });
  },
  POST: async (req, res) => {
    const { navn, epost, provisjonPct, rabattPct, rabattMnd } = req.body ?? {};
    if (!navn || typeof navn !== 'string') return res.status(400).json({ feil: 'Navn kreves.' });
    const partner = await opprettPartner({ navn: navn.trim(), epost, provisjonPct, rabattPct, rabattMnd });
    return res.status(201).json({ partner });
  },
});
