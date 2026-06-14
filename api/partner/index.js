/**
 * GET /api/partner — selvbetjent partner-dashboard for en innlogget bruker som er
 * koblet til en partner (Eiendomsmalen o.l.): antall vervede, aktive betalende og
 * opptjent provisjon. Ikke-partnere får { partner: null }.
 */
import { medBruker } from '../_http.js';
import { hentPartnerForBruker, hentPartnerDashboard } from '../_partner/db.js';

export default medBruker({
  GET: async (req, res, okt) => {
    const partner = await hentPartnerForBruker(okt.bruker.id);
    if (!partner) return res.status(200).json({ partner: null });
    const dashbord = await hentPartnerDashboard(partner.id);
    return res.status(200).json({
      partner: {
        navn: partner.navn,
        referralCode: partner.referral_code,
        provisjonPct: Number(partner.provisjon_pct),
        rabattPct: Number(partner.rabatt_pct),
        rabattMnd: partner.rabatt_mnd,
      },
      ...dashbord,
    });
  },
});
