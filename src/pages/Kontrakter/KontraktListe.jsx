import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Pencil, Trash2, ChevronRight, Download, Search, MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { EmptyState, Badge } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { BekreftModal } from '../../components/ui/BekreftModal';
import { formatKr } from '../../utils/format';
import { genererKontraktPDF } from '../../utils/kontraktPDF';

function datoFmt(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function kontraktStatus(k) {
  if (k.kontraktstype === 'tidsubestemt') return { label: 'Aktiv', color: 'green' };
  if (!k.sluttdato) return { label: 'Aktiv', color: 'green' };
  const slutt = new Date(k.sluttdato);
  const now = new Date();
  if (slutt < now) return { label: 'Utløpt', color: 'red' };
  const dager = Math.round((slutt - now) / 86400000);
  if (dager < 30) return { label: `${dager}d igjen`, color: 'red' };
  if (dager < 90) return { label: `${dager}d igjen`, color: 'yellow' };
  return { label: 'Aktiv', color: 'green' };
}

export default function KontraktListe() {
  const navigate = useNavigate();
  const { kontrakter, leieobjekter, bygg, utleiere, meldinger = [], deleteKontrakt } = useApp();
  const [filterStatus, setFilterStatus] = useState('');
  const [søk, setSøk] = useState('');
  const [slettId, setSlettId] = useState(null);

  const getInfo = (leieobjektId) => {
    const obj = leieobjekter.find((l) => l.id === leieobjektId);
    if (!obj) return null;
    const b = bygg.find((b) => b.id === obj.byggId);
    return { obj, b };
  };

  const filtered = kontrakter.filter((k) => {
    const s = kontraktStatus(k);
    if (filterStatus === 'aktiv' && s.color !== 'green') return false;
    if (filterStatus === 'utloeper' && s.color !== 'yellow') return false;
    if (filterStatus === 'utlopt' && s.color !== 'red') return false;
    if (søk) {
      const q = søk.toLowerCase();
      const info = getInfo(k.leieobjektId);
      const adresse = info?.b ? `${info.b.gatenavn} ${info.b.gatenummer}` : '';
      if (
        !k.leietakerNavn?.toLowerCase().includes(q) &&
        !adresse.toLowerCase().includes(q) &&
        !k.leietakerEpost?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const slettKontrakt = kontrakter.find((k) => k.id === slettId);

  return (
    <>
      <BekreftModal
        åpen={!!slettId}
        tittel="Slette leiekontrakt?"
        tekst={`Kontrakten med ${slettKontrakt?.leietakerNavn || 'leietaker'} vil bli permanent slettet. Dette kan ikke angres.`}
        bekreftLabel="Slett kontrakt"
        onBekreft={() => { deleteKontrakt(slettId); setSlettId(null); }}
        onAvbryt={() => setSlettId(null)}
      />

      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1B1E]">Leiekontrakter</h1>
            <p className="text-sm text-[#65696F] mt-1">{kontrakter.length} kontrakter totalt</p>
          </div>
          <Button onClick={() => navigate('/kontrakter/ny')} variant="primary">
            <Plus size={14} /> Ny leiekontrakt
          </Button>
        </div>

        {kontrakter.length > 0 && (
          <div className="flex gap-3 mb-5">
            {/* Søk */}
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7D83]" />
              <input
                value={søk}
                onChange={(e) => setSøk(e.target.value)}
                placeholder="Søk leietaker, adresse..."
                className="w-full bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl pl-9 pr-4 py-2 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] transition-colors"
              />
            </div>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'aktiv', label: 'Aktive' },
                { value: 'utloeper', label: 'Utløper snart' },
                { value: 'utlopt', label: 'Utløpt' },
              ]}
              placeholder="Alle kontrakter"
              className="w-44"
            />
          </div>
        )}

        {kontrakter.length === 0 ? (
          <EmptyState
            icon="📄"
            title="Ingen leiekontrakter ennå"
            description="Registrer en leiekontrakt for å holde oversikt over leieforhold og leietakere."
            action={
              <Button onClick={() => navigate('/kontrakter/ny')} variant="primary">
                <Plus size={14} /> Ny leiekontrakt
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#7A7D83] text-sm">Ingen kontrakter matcher søket.</div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((k) => {
              const info = getInfo(k.leieobjektId);
              const status = kontraktStatus(k);
              const uleste = meldinger.filter((m) => m.kontraktId === k.id && !m.lest && m.avsender === 'leietaker').length;

              return (
                <div key={k.id} onClick={() => navigate(`/kontrakter/${k.id}`)}
                  className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-5 hover:border-[#DCDAD2] hover:bg-[#FAF9F6] transition-all duration-150 cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#E9E8E2] rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={16} className="text-[#AEB0B4]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                          <span className="font-medium text-[#1A1B1E] text-sm truncate">{k.leietakerNavn || '—'}</span>
                          <Badge color={status.color}>{status.label}</Badge>
                          <span className="text-xs text-[#7A7D83]">
                            {k.kontraktstype === 'tidsubestemt' ? 'Tidsubestemt' : 'Tidsbestemt'}
                          </span>
                          {uleste > 0 && (
                            <span className="flex items-center gap-1 text-xs text-[#2563EB]">
                              <MessageSquare size={11} />
                              {uleste} ulest{uleste > 1 ? 'e' : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/meldinger/${k.id}`);
                            }}
                              title="Meldinger"
                              className="p-1.5 text-[#7A7D83] hover:text-[#2563EB] hover:bg-[#2563EB]/8 rounded-md transition-all cursor-pointer">
                              <MessageSquare size={13} />
                            </button>
                            <button onClick={(e) => {
                              e.stopPropagation();
                              const utleier = utleiere.find((u) => u.id === k.utleierNavn);
                              genererKontraktPDF({ kontrakt: k, leieobjekt: info?.obj, bygg: info?.b, utleier });
                            }}
                              title="Last ned PDF"
                              className="p-1.5 text-[#7A7D83] hover:text-[#9A7A24] hover:bg-[#9A7A24]/8 rounded-md transition-all cursor-pointer">
                              <Download size={13} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/kontrakter/${k.id}/rediger`); }}
                              className="p-1.5 text-[#7A7D83] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-md transition-all cursor-pointer">
                              <Pencil size={13} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setSlettId(k.id); }}
                              className="p-1.5 text-[#7A7D83] hover:text-[#DC2626] hover:bg-[#DC2626]/8 rounded-md transition-all cursor-pointer">
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <ChevronRight size={15} className="text-[#AEB0B4] group-hover:text-[#65696F]" />
                        </div>
                      </div>

                      {info && (
                        <p className="text-xs text-[#7A7D83] mt-0.5">
                          {info.b ? `${info.b.gatenavn} ${info.b.gatenummer}` : ''}
                          {info.obj.betegnelse ? ` · ${info.obj.betegnelse}` : ''}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 pt-3 border-t border-[#E9E8E2] text-xs">
                        <div>
                          <span className="text-[#7A7D83]">Leie </span>
                          <span className="text-[#15803D] font-medium num">{formatKr(k.maanedligLeie)}/mnd</span>
                        </div>
                        <div>
                          <span className="text-[#7A7D83]">Fra </span>
                          <span className="text-[#1A1B1E] num">{datoFmt(k.startdato) || '—'}</span>
                        </div>
                        {k.sluttdato && (
                          <div>
                            <span className="text-[#7A7D83]">Til </span>
                            <span className="text-[#1A1B1E] num">{datoFmt(k.sluttdato)}</span>
                          </div>
                        )}
                        {!k.sluttdato && k.kontraktstype === 'tidsubestemt' && (
                          <div><span className="text-[#7A7D83]">Løpende</span></div>
                        )}
                        {k.depositum && k.sikkerhetsType !== 'ingen' && (
                          <div>
                            <span className="text-[#7A7D83]">Depositum </span>
                            <span className="text-[#1A1B1E] num">{formatKr(k.depositum)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
