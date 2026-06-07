/**
 * POST /api/ai — server-side proxy mot Anthropic. Plattform-nøkkel (ANTHROPIC_API_KEY
 * i Vercel) brukes — nøkkelen forlater aldri serveren. Krever innlogging + rate-limit.
 * Dormant til ANTHROPIC_API_KEY er satt.
 */
import { dbKonfigurert } from '../_db.js';
import { krevBruker } from '../_auth/index.js';
import { sjekkRate } from '../_auth/ratelimit.js';

const MODELL = process.env.AI_MODELL || 'claude-sonnet-4-6';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ feil: 'Metode ikke tillatt.' }); }
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevBruker(req);
  if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ feil: 'AI er ikke aktivert ennå.' });
  if (!(await sjekkRate(`ai:${okt.bruker.id}`, 20, 3600))) {
    return res.status(429).json({ feil: 'For mange AI-forespørsler. Prøv igjen om en stund.' });
  }

  const { prompt } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ feil: 'Mangler prompt.' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODELL, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      return res.status(502).json({ feil: e?.error?.message || `AI-feil: ${r.status}` });
    }
    const data = await r.json();
    return res.status(200).json({ tekst: data.content?.[0]?.text || '' });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
