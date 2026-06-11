import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Wrench, Search, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState } from '../../components/ui/Card';
import { Avatar, Pill, PageHeader } from '../../components/ui/kit';

function datoFmt(iso) {
  const d = new Date(iso);
  const nå = new Date();
  const diffMs = nå - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'Nå nettopp';
  if (diffMin < 60) return `${diffMin}m siden`;
  if (diffH < 24) return `${diffH}t siden`;
  if (diffD < 7) return `${diffD}d siden`;
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' });
}

function TypeIkon({ type }) {
  if (type === 'vedlikehold') return <Wrench size={12} className="text-amber" />;
  return <MessageSquare size={12} className="text-brand" />;
}

export default function Innboks() {
  const navigate = useNavigate();
  const { kontrakter, leieobjekter, bygg, meldinger } = useApp();
  const [søk, setSøk] = useState('');

  // Grupper meldinger per kontrakt — vis nyeste melding per tråd
  const tråder = kontrakter
    .map((k) => {
      const meld = meldinger
        .filter((m) => m.kontraktId === k.id)
        .sort((a, b) => new Date(b.opprettet) - new Date(a.opprettet));
      const siste = meld[0] || null;
      const ulisteTall = meld.filter((m) => !m.lest && m.avsender === 'leietaker').length;
      const obj = leieobjekter.find((l) => l.id === k.leieobjektId);
      const b = obj ? bygg.find((b) => b.id === obj.byggId) : null;
      const adresse = b ? `${b.gatenavn} ${b.gatenummer}${obj?.betegnelse ? ' · ' + obj.betegnelse : ''}` : '—';
      return { kontrakt: k, siste, ulisteTall, meldAntall: meld.length, adresse };
    })
    .filter((t) => {
      if (!søk) return true;
      const q = søk.toLowerCase();
      return t.kontrakt.leietakerNavn?.toLowerCase().includes(q) ||
             t.adresse.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      // Uleste først, deretter nyeste
      if (b.ulisteTall !== a.ulisteTall) return b.ulisteTall - a.ulisteTall;
      if (!a.siste) return 1;
      if (!b.siste) return -1;
      return new Date(b.siste.opprettet) - new Date(a.siste.opprettet);
    });

  const totaltUlest = meldinger.filter((m) => !m.lest && m.avsender === 'leietaker').length;

  return (
    <div className="animate-fade-up">
      <PageHeader
        tittel="Innboks"
        undertittel={totaltUlest > 0
          ? `${totaltUlest} ulest${totaltUlest > 1 ? 'e' : ''} melding${totaltUlest > 1 ? 'er' : ''}`
          : 'Meldinger med dine leietakere'}
      />

      {/* Søk */}
      {kontrakter.length > 4 && (
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={søk}
            onChange={(e) => setSøk(e.target.value)}
            placeholder="Søk etter leietaker eller adresse..."
            className="w-full bg-surface-2 border-[1.5px] border-line-input rounded-xl pl-10 pr-4 py-[11px] text-sm font-bold text-ink placeholder:font-medium placeholder:text-faint outline-none focus:border-brand focus:bg-surface transition-all"
          />
        </div>
      )}

      {kontrakter.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={26} />}
          title="Ingen leietakere ennå"
          description="Opprett en leiekontrakt for å starte en samtale med leietaker."
        />
      ) : tråder.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm font-medium">Ingen treff på søket</div>
      ) : (
        <div className="bg-surface border border-line rounded-[20px] overflow-hidden">
          {tråder.map(({ kontrakt: k, siste, ulisteTall, adresse }, i) => (
            <button
              key={k.id}
              type="button"
              onClick={() => navigate(`/meldinger/${k.id}`)}
              className={`w-full flex items-center gap-4 px-[18px] py-4 hover:bg-surface-2 transition-colors text-left group ${i === 0 ? '' : 'border-t border-line-soft'}`}
            >
              <Avatar navn={k.leietakerNavn || '?'} tone={ulisteTall > 0 ? 'mint' : 'sand'} size={42} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-0.5">
                  <span className={`text-[14.5px] truncate ${ulisteTall > 0 ? 'font-extrabold text-ink' : 'font-bold text-ink-2'}`}>
                    {k.leietakerNavn || '—'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {siste && (
                      <span className="text-xs font-semibold text-faint">{datoFmt(siste.opprettet)}</span>
                    )}
                    {ulisteTall > 0 && <Pill tone="dark">{ulisteTall}</Pill>}
                  </div>
                </div>
                <div className="text-[12.5px] font-semibold text-muted-2 truncate mb-1">{adresse}</div>
                {siste ? (
                  <div className="flex items-center gap-1.5 text-[12.5px] truncate">
                    <TypeIkon type={siste.type} />
                    <span className={`truncate ${ulisteTall > 0 ? 'font-semibold text-ink-2' : 'font-medium text-muted-2'}`}>
                      {siste.avsender === 'utleier' ? 'Du: ' : ''}{siste.tekst}
                    </span>
                  </div>
                ) : (
                  <div className="text-[12.5px] font-medium text-faint italic">Ingen meldinger ennå — start samtalen</div>
                )}
              </div>

              <ChevronRight size={16} className="text-faint-2 group-hover:text-muted-2 shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
