// Heuristic PVE bot — respects identical rules, no cheating (sees only own hand + public console)
import { CARD_MAP } from './cards';
import type { GameState } from './engine';
import { calcBoard, canRetire } from './engine';

export function cardPower(cardId: string): number {
  const d = CARD_MAP[cardId];
  if (!d) return 0;
  if (cardId === 'WA_3VP') return 100;
  if (cardId === 'WA_1VP') return 60;
  // value = base + combo potential + cost efficiency
  let v = d.baseCredits * 10;
  v += d.combos.length * 6;
  if (cardId === 'AMAZON_EC2') v += 12;
  if (cardId === 'AWS_LAMBDA') v += 6;
  if (cardId === 'AMAZON_DYNAMODB' || cardId === 'AMAZON_AURORA') v += 8;
  if (cardId === 'ELASTIC_LOAD_BALANCING') v += 8;
  if (cardId.includes('CLOUDFORMATION') || cardId.includes('FINANCIAL')) v += 10;
  if (d.cost > 0) v -= d.cost * 2;
  if (d.frameType === 'ON_PREM') v = -5;
  return v;
}

export function botDraftPick(s: GameState, _pi?: number): string | null {
  void _pi;
  // pick highest power free console card
  let best: string | null = null; let bv = -Infinity;
  for (const pile of s.consoleFree) {
    const v = cardPower(pile.cardId);
    if (v > bv) { bv = v; best = pile.cardId; }
  }
  return best;
}

export function botChooseRetire(s: GameState, _pi: number): string | null {
  const p = s.players[s.current ?? _pi];
  // Official: retire ONLY from starting hand
  const cands = p.hand.filter((c) => CARD_MAP[c.cardId]?.frameType === 'ON_PREM');
  if (!cands.length) return null;
  // keep VM if BareMetal present (draw combo), else retire first non-synergy
  const hasBM = p.hand.some((c) => c.cardId === 'ONPREM_BARE_METAL');
  const hasVM = cands.find((c) => c.cardId === 'ONPREM_VM');
  if (hasBM && hasVM && cands.length > 1) {
    return cands.find((c) => c.cardId !== 'ONPREM_VM' && c.cardId !== 'ONPREM_BARE_METAL')?.uid ?? cands[0].uid;
  }
  return cands[0].uid;
}

export function botChooseBuy(s: GameState, pi: number): { kind: 'wa' | 'free' | 'cost' | 'blind'; cardId?: string } | null {
  const p = s.players[pi];
  const b = calcBoard(p.played);
  const topWA = s.waStack[0];
  const waCost = topWA === 'WA_1VP' ? b.wa1Cost : b.wa3Cost;
  if (topWA && p.credits >= waCost && p.adoptsLeft > 0) {
    // rush 3VP late, else take if affordable and credits > 5 or game end near
    if (topWA === 'WA_3VP' || p.credits >= waCost + 2 || s.waStack.length <= 3) return { kind: 'wa' };
  }
  // best affordable console free
  let best: { cardId: string; v: number } | null = null;
  for (const pile of s.consoleFree) {
    const d = CARD_MAP[pile.cardId];
    if (p.credits >= d.cost && p.adoptsLeft > 0) {
      const v = cardPower(pile.cardId);
      if (!best || v > best.v) best = { cardId: pile.cardId, v };
    }
  }
  if (s.consoleCost && p.credits >= CARD_MAP[s.consoleCost.cardId].cost && p.adoptsLeft > 0) {
    const v = cardPower(s.consoleCost.cardId) + 4;
    if (!best || v > best.v) return { kind: 'cost' };
  }
  if (best) return { kind: 'free', cardId: best.cardId };
  // blind if adopts left and nothing good
  if (p.adoptsLeft > 0) return { kind: 'blind' };
  return null;
}

export function botShouldPlayAll(): boolean { return true; }
export { canRetire };
