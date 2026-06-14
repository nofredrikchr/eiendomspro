import { useEffect, useState } from 'react';
import { Handshake, Copy, Check, Users, Wallet } from 'lucide-react';
import { partnerApi } from '../../services/abonnementApi';
import { formaterKr } from '../../lib/planer';

const LEDGER_STATUS = {
  opptjent: 'Opptjent',
  utbetalt: 'Utbetalt',
  reversert: 'Reversert',
};

export default function PartnerDashboard() {
  const [data, setData] = useState(null);
  const [lastet, setLastet] = useState(false);
  const [feil, setFeil] = useState(null);
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    let aktiv = true;
    partnerApi.hent()
      .then((d) => { if (aktiv) setData(d); })
      .catch((e) => { if (aktiv) setFeil(e.message); })
      .finally(() => { if (aktiv) setLastet(true); });
    return () => { aktiv = false; };
  }, []);

  if (!lastet) return <div className="text-sm text-muted">Laster…</div>;
  if (feil) return <div className="rounded-xl border border-danger/25 bg-danger/[0.07] px-4 py-2.5 text-sm font-medium text-danger">{feil}</div>;

  if (!data?.partner) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-extrabold text-ink mb-2">Partner</h1>
        <p className="text-sm text-muted">Kontoen din er ikke registrert som partner. Ta kontakt med EiendomsPRO hvis du ønsker å bli partner og tjene provisjon på kunder du henviser.</p>
      </div>
    );
  }

  const { partner } = data;
  const kode = partner.referralCode;
  function kopier() {
    navigator.clipboard?.writeText(kode).then(() => { setKopiert(true); setTimeout(() => setKopiert(false), 1800); });
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-mint text-brand flex items-center justify-center"><Handshake size={20} /></div>
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Partner-dashboard</h1>
          <p className="text-sm text-muted">{partner.navn} · {partner.provisjonPct}% provisjon · {partner.rabattPct}% kunderabatt i {partner.rabattMnd} mnd</p>
        </div>
      </div>

      {/* Partnerkode */}
      <div className="rounded-2xl border border-line bg-surface p-5 mb-5">
        <div className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-faint mb-2">Din partnerkode</div>
        <div className="flex gap-2">
          <code className="flex-1 rounded-xl border border-line-input bg-canvas px-3.5 py-2.5 text-sm font-bold text-ink">{kode}</code>
          <button onClick={kopier} className="inline-flex items-center gap-1.5 rounded-xl bg-brand text-white px-4 text-sm font-bold hover:bg-brand-hover cursor-pointer">
            {kopiert ? <><Check size={15} /> Kopiert</> : <><Copy size={15} /> Kopier</>}
          </button>
        </div>
        <p className="text-xs text-faint mt-2">Kunder som registrerer seg med denne koden får {partner.rabattPct}% rabatt i {partner.rabattMnd} måneder, og du tjener {partner.provisjonPct}% provisjon av det de betaler.</p>
      </div>

      {/* Nøkkeltall */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat icon={Users} verdi={data.vervede ?? 0} etikett="Vervede" />
        <Stat icon={Users} verdi={data.aktive_betalende ?? 0} etikett="Aktive betalende" />
        <Stat icon={Wallet} verdi={formaterKr(Number(data.opptjent_ore) || 0)} etikett="Opptjent" fremhev />
        <Stat icon={Wallet} verdi={formaterKr(Number(data.utbetalt_ore) || 0)} etikett="Utbetalt" />
      </div>

      {/* Ledger */}
      <div className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-faint mb-2">Provisjonshistorikk</div>
      {(!data.ledger || data.ledger.length === 0) ? (
        <p className="text-sm text-muted">Ingen provisjon registrert ennå.</p>
      ) : (
        <div className="rounded-2xl border border-line bg-surface divide-y divide-line-soft">
          {data.ledger.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-faint">{l.periode || '—'}</span>
              <span className="text-ink-2">{formaterKr(l.brutto_betalt_ore)} betalt</span>
              <span className="font-bold text-ink">{formaterKr(l.provisjon_ore)}</span>
              <span className="text-[11px] font-extrabold rounded-full px-2.5 py-1 bg-line-soft text-faint">{LEDGER_STATUS[l.status] || l.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, verdi, etikett, fremhev = false }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <Icon size={16} className="text-faint mb-1.5" />
      <div className={`text-xl font-extrabold ${fremhev ? 'text-brand-ink' : 'text-ink'}`}>{verdi}</div>
      <div className="text-xs font-semibold text-faint mt-0.5">{etikett}</div>
    </div>
  );
}
