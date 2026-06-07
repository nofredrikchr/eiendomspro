import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Wrench, Search, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

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
  if (type === 'vedlikehold') return <Wrench size={12} className="text-[#B45309]" />;
  return <MessageSquare size={12} className="text-[#2563EB]" />;
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1B1E]">Innboks</h1>
          <p className="text-sm text-[#65696F] mt-1">
            {totaltUlest > 0
              ? `${totaltUlest} ulest${totaltUlest > 1 ? 'e' : ''} melding${totaltUlest > 1 ? 'er' : ''}`
              : 'Meldinger med dine leietakere'}
          </p>
        </div>
      </div>

      {/* Søk */}
      {kontrakter.length > 4 && (
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7D83]" />
          <input
            value={søk}
            onChange={(e) => setSøk(e.target.value)}
            placeholder="Søk etter leietaker eller adresse..."
            className="w-full bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] transition-colors"
          />
        </div>
      )}

      {kontrakter.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare size={32} className="text-[#AEB0B4] mx-auto mb-3" />
          <div className="text-sm font-medium text-[#1A1B1E] mb-1">Ingen leietakere ennå</div>
          <div className="text-xs text-[#7A7D83]">Opprett en leiekontrakt for å starte en samtale med leietaker</div>
        </div>
      ) : tråder.length === 0 ? (
        <div className="text-center py-12 text-[#7A7D83] text-sm">Ingen treff på søket</div>
      ) : (
        <div className="space-y-1">
          {tråder.map(({ kontrakt: k, siste, ulisteTall, meldAntall, adresse }) => (
            <button
              key={k.id}
              type="button"
              onClick={() => navigate(`/meldinger/${k.id}`)}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-[#E9E8E2] bg-[#FFFFFF] hover:border-[#DCDAD2] hover:bg-[#FAF9F6] transition-all text-left group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#E9E8E2] flex items-center justify-center shrink-0 text-sm font-semibold text-[#65696F]">
                {(k.leietakerNavn || '?')[0].toUpperCase()}
              </div>

              {/* Innhold */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-sm font-medium ${ulisteTall > 0 ? 'text-[#1A1B1E]' : 'text-[#4B4E54]'}`}>
                    {k.leietakerNavn || '—'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {siste && (
                      <span className="text-xs text-[#AEB0B4]">{datoFmt(siste.opprettet)}</span>
                    )}
                    {ulisteTall > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#2563EB] text-[#F6F6F4] text-xs font-bold flex items-center justify-center">
                        {ulisteTall}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-[#7A7D83] truncate mb-1">{adresse}</div>
                {siste ? (
                  <div className="flex items-center gap-1.5 text-xs text-[#7A7D83] truncate">
                    <TypeIkon type={siste.type} />
                    <span className={ulisteTall > 0 ? 'text-[#4B4E54]' : ''}>
                      {siste.avsender === 'utleier' ? 'Du: ' : ''}{siste.tekst}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-[#AEB0B4] italic">Ingen meldinger ennå — start samtalen</div>
                )}
              </div>

              <ChevronRight size={14} className="text-[#AEB0B4] group-hover:text-[#65696F] shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
