// Player profiling from observed actions. Pure logic.

export type ObservedAction =
  | 'pf_fold' // folded preflop
  | 'pf_call' // limped or called preflop (voluntary)
  | 'pf_raise' // opened/raised preflop
  | 'bet' // postflop bet or raise
  | 'call' // postflop call
  | 'check'
  | 'fold'; // postflop fold

export interface HandObservation {
  id: string;
  ts: number;
  actions: ObservedAction[];
}

export interface PlayerProfile {
  id: string;
  name: string;
  hands: HandObservation[];
  notes: string;
  /** Manual overrides. null = use observed value. Values are 0..1 except af. */
  override: { vpip: number | null; pfr: number | null; af: number | null; type: PlayerType | null };
}

export type PlayerType = 'Unknown' | 'Nit' | 'TAG' | 'LAG' | 'Calling station' | 'Maniac' | 'Loose-passive';

export interface ProfileStats {
  hands: number;
  vpip: number;
  pfr: number;
  af: number; // (bets+raises) / calls, postflop
  vpipCI: [number, number]; // 95% Wilson interval
  confidence: 'none' | 'low' | 'medium' | 'high';
  type: PlayerType;
  typeIsOverride: boolean;
}

/** Wilson score interval: honest uncertainty for small samples. */
export function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

export function confidenceFor(n: number): ProfileStats['confidence'] {
  if (n === 0) return 'none';
  if (n < 15) return 'low';
  if (n < 50) return 'medium';
  return 'high';
}

/** Classification cut-offs are common rules of thumb, not research-validated thresholds. */
export function classify(vpip: number, pfr: number, af: number, n: number): PlayerType {
  if (n < 5) return 'Unknown';
  const loose = vpip >= 0.3;
  const aggressiveness = vpip > 0 ? pfr / vpip : 0;
  if (vpip >= 0.5 && af >= 3) return 'Maniac';
  if (loose && aggressiveness < 0.35 && af < 1) return 'Calling station';
  if (loose && aggressiveness < 0.5) return 'Loose-passive';
  if (loose) return 'LAG';
  if (vpip < 0.14) return 'Nit';
  return 'TAG';
}

export function computeStats(p: PlayerProfile): ProfileStats {
  const n = p.hands.length;
  let vp = 0, pr = 0, aggr = 0, calls = 0;
  for (const h of p.hands) {
    if (h.actions.includes('pf_call') || h.actions.includes('pf_raise')) vp++;
    if (h.actions.includes('pf_raise')) pr++;
    for (const a of h.actions) {
      if (a === 'bet') aggr++;
      if (a === 'call') calls++;
    }
  }
  const vpip = p.override.vpip ?? (n ? vp / n : 0);
  const pfr = p.override.pfr ?? (n ? pr / n : 0);
  const af = p.override.af ?? (calls ? aggr / calls : aggr);
  const hasOverride = p.override.vpip !== null || p.override.pfr !== null || p.override.af !== null;
  const auto = classify(vpip, pfr, af, hasOverride ? Math.max(n, 5) : n);
  return {
    hands: n,
    vpip,
    pfr,
    af,
    vpipCI: wilson(vp, n),
    confidence: confidenceFor(n),
    type: p.override.type ?? auto,
    typeIsOverride: p.override.type !== null,
  };
}

export const EXPLOIT_TIPS: Record<PlayerType, string> = {
  Unknown: 'Not enough hands yet. Play your default strategy and keep logging.',
  Nit: 'Steal their blinds more; give their raises respect and fold marginal hands.',
  TAG: 'Solid opponent. Avoid marginal spots out of position; stick close to default.',
  LAG: 'Widen value hands and 3-bet/call down lighter; avoid bluffing into them.',
  'Calling station': 'Value-bet thinner and larger; cut most bluffs.',
  'Loose-passive': 'Isolate their limps with value hands; bet for value often.',
  Maniac: 'Tighten up and let them bluff; call down wider with strong made hands.',
};

export function newProfile(name: string, id = cryptoId()): PlayerProfile {
  if (!name.trim()) throw new Error('Name required');
  return { id, name: name.trim(), hands: [], notes: '', override: { vpip: null, pfr: null, af: null, type: null } };
}

export function cryptoId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
