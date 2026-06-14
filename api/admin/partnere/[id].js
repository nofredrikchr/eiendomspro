/** GET /api/admin/partnere/:id — partner-dashboard + provisjons-ledger (admin). */
import { medAdmin } from '../../_http.js';
import { hentPartner, hentPartnerDashboard } from '../../_partner/db.js';

export default medAdmin({
  GET: async (req, res) => {
    const id = req.query?.id;
    const partner = await hentPartner(id);
    if (!partner) return res.status(404).json({ feil: 'Fant ikke partner.' });
    const dashbord = await hentPartnerDashboard(id);
    return res.status(200).json({ partner, ...dashbord });
  },
});
