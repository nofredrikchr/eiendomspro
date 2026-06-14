import { useAuth } from '../context/AuthContext';
import { canUse as canUseRen, objectLimit, PLAN_PRO } from '../lib/planer';

/**
 * Klientside plan-tilstand, avledet fra den innloggede brukeren (/api/auth/me).
 * Server er fortsatt sannheten for gating — dette styrer kun UX (gråtoning/modaler).
 *
 * I demo-modus (lokal uten DATABASE_URL) gis full Pro-tilgang så lokal utvikling
 * ikke møter betalingsvegger.
 */
export function usePlan() {
  const { bruker, erDemo } = useAuth();
  const plan = erDemo ? PLAN_PRO : (bruker?.plan ?? 'gratis');
  return {
    plan,
    abonnement: bruker?.abonnement ?? null,
    trialDagerIgjen: bruker?.trialDagerIgjen ?? 0,
    objektgrense: erDemo ? Infinity : (bruker?.objektgrense ?? objectLimit(plan)),
    kredittOre: bruker?.kredittOre ?? 0,
    skrivebeskyttet: !erDemo && (bruker?.skrivebeskyttet ?? false),
    erBetalende: plan === 'privat' || plan === PLAN_PRO,
    canUse: (feature) => (erDemo ? true : canUseRen(feature, plan)),
  };
}
