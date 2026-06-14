import { useNavigate } from 'react-router-dom';
import { Lock, X, Check } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * Modal som vises når en bruker treffer en grense (objektgrense, låst analyse,
 * AS-modus osv.). Ingen hard feil — alltid en vei videre til /priser.
 */
export function OppgraderingsModal({ apen, lukk, tittel, beskrivelse, punkter = [], plan = 'Privat eller Pro' }) {
  const navigate = useNavigate();
  if (!apen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#141A17]/50" onClick={lukk} />
      <div className="relative w-full max-w-md rounded-2xl bg-surface shadow-soft p-6 animate-fade-up">
        <button onClick={lukk} aria-label="Lukk"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-line-soft cursor-pointer">
          <X size={16} />
        </button>
        <div className="w-11 h-11 rounded-xl bg-mint text-brand flex items-center justify-center mb-4">
          <Lock size={20} />
        </div>
        <h2 className="text-lg font-extrabold text-ink mb-1.5">{tittel}</h2>
        <p className="text-sm text-muted leading-relaxed mb-4">{beskrivelse}</p>
        {punkter.length > 0 && (
          <ul className="flex flex-col gap-2 mb-5">
            {punkter.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-ink-2">
                <Check size={16} className="text-brand shrink-0 mt-0.5" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2.5">
          <Button onClick={() => navigate('/priser')} size="lg" className="flex-1">
            Lås opp med {plan}
          </Button>
          <Button onClick={lukk} variant="secondary" size="lg">Ikke nå</Button>
        </div>
      </div>
    </div>
  );
}
