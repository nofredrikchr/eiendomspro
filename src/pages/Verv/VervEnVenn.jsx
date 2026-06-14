import { useEffect, useState } from 'react';
import { Gift, Copy, Check, Mail, MessageSquare, Share2, Users } from 'lucide-react';
import { vervingApi } from '../../services/abonnementApi';
import { formaterKr } from '../../lib/planer';

const STATUS_TEKST = {
  registrert: { tekst: 'Registrert', farge: 'text-faint bg-line-soft' },
  betalende: { tekst: 'Betaler', farge: 'text-brand-ink bg-mint' },
  innfridd: { tekst: 'Belønning utløst', farge: 'text-brand-ink bg-mint' },
  annullert: { tekst: 'Annullert', farge: 'text-danger bg-danger/10' },
};

export default function VervEnVenn() {
  const [data, setData] = useState(null);
  const [feil, setFeil] = useState(null);
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    let aktiv = true;
    vervingApi.hent()
      .then((d) => { if (aktiv) setData(d); })
      .catch((e) => { if (aktiv) setFeil(e.message); });
    return () => { aktiv = false; };
  }, []);

  function kopier() {
    if (!data?.lenke) return;
    navigator.clipboard?.writeText(data.lenke).then(() => {
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1800);
    });
  }

  const lenke = data?.lenke || '';
  const delTekst = 'Jeg bruker EiendomsPRO for å holde oversikt over utleien min – prøv det gratis:';
  const epostUrl = `mailto:?subject=${encodeURIComponent('Prøv EiendomsPRO')}&body=${encodeURIComponent(`${delTekst} ${lenke}`)}`;
  const smsUrl = `sms:?&body=${encodeURIComponent(`${delTekst} ${lenke}`)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(lenke)}`;

  const antall = data?.vervinger?.length ?? 0;
  const innfridde = data?.antallInnfridde ?? 0;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-mint text-brand flex items-center justify-center"><Gift size={20} /></div>
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Verv en venn</h1>
          <p className="text-sm text-muted">Gi 1 måned gratis, få 2 måneder selv – uten øvre grense.</p>
        </div>
      </div>

      {feil && <div className="my-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-4 py-2.5 text-sm font-medium text-danger">{feil}</div>}

      {/* Belønningskort */}
      <div className="mt-5 rounded-2xl bg-brand text-white p-6">
        <div className="text-sm font-bold opacity-90">Slik fungerer det</div>
        <div className="mt-1 text-[15px] leading-relaxed">
          Når vennen din blir betalende kunde får <strong>du 2 måneder gratis</strong> og <strong>vennen 1 måned gratis</strong>.
          Verv 6 venner = 12 måneder gratis. Belønningen utløses når vennen har betalt sin første faktura.
        </div>
      </div>

      {/* Personlig lenke */}
      <div className="mt-5 rounded-2xl border border-line bg-surface p-5">
        <div className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-faint mb-2">Din personlige vervelenke</div>
        <div className="flex gap-2">
          <input readOnly value={lenke} aria-label="Vervelenke"
            className="flex-1 min-w-0 rounded-xl border border-line-input bg-canvas px-3.5 py-2.5 text-sm text-ink-2 font-medium" />
          <button onClick={kopier}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand text-white px-4 text-sm font-bold hover:bg-brand-hover cursor-pointer shrink-0">
            {kopiert ? <><Check size={15} /> Kopiert</> : <><Copy size={15} /> Kopier</>}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <a href={epostUrl} className="inline-flex items-center gap-1.5 rounded-lg border border-line-input px-3 py-2 text-[13px] font-bold text-ink-2 hover:border-brand hover:text-brand-ink"><Mail size={14} /> E-post</a>
          <a href={smsUrl} className="inline-flex items-center gap-1.5 rounded-lg border border-line-input px-3 py-2 text-[13px] font-bold text-ink-2 hover:border-brand hover:text-brand-ink"><MessageSquare size={14} /> SMS</a>
          <a href={fbUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line-input px-3 py-2 text-[13px] font-bold text-ink-2 hover:border-brand hover:text-brand-ink"><Share2 size={14} /> Facebook</a>
          <button onClick={kopier} className="inline-flex items-center gap-1.5 rounded-lg border border-line-input px-3 py-2 text-[13px] font-bold text-ink-2 hover:border-brand hover:text-brand-ink cursor-pointer"><Copy size={14} /> Kopier lenke</button>
        </div>
      </div>

      {/* Teller */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-surface p-4 text-center">
          <div className="text-2xl font-extrabold text-ink">{antall}</div>
          <div className="text-xs font-semibold text-faint mt-0.5">Vervet</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 text-center">
          <div className="text-2xl font-extrabold text-ink">{innfridde}</div>
          <div className="text-xs font-semibold text-faint mt-0.5">Belønning utløst</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 text-center">
          <div className="text-2xl font-extrabold text-brand-ink">{formaterKr(data?.kredittOre ?? 0)}</div>
          <div className="text-xs font-semibold text-faint mt-0.5">Opptjent kreditt</div>
        </div>
      </div>
      <p className="text-xs text-faint mt-2">Opptjent kreditt trekkes automatisk fra neste faktura, og forsvinner aldri – heller ikke om du nedgraderer eller sier opp.</p>

      {/* Status per verving */}
      {antall > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.08em] text-faint mb-2">
            <Users size={14} /> Dine vervinger
          </div>
          <div className="rounded-2xl border border-line bg-surface divide-y divide-line-soft">
            {data.vervinger.map((v) => {
              const s = STATUS_TEKST[v.status] || STATUS_TEKST.registrert;
              return (
                <div key={v.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-semibold text-ink-2">{v.navn || 'Vervet venn'}</span>
                  <span className={`text-[11px] font-extrabold rounded-full px-2.5 py-1 ${s.farge}`}>{s.tekst}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
