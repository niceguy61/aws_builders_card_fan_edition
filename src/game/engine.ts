// Pure rules engine — offline identical, serializable for future PVP (WebSocket-ready)
import { CARD_MAP, ONPREM_STARTER, COST_QUANTITY, FREE_CARD_IDS, isAWS, isOnPrem } from './cards';
import type { LogEntry } from '../i18n';

export interface CardInstance { uid: string; cardId: string; tone?: string; }
export interface ConsolePile { cardId: string; count: number; }
// 온프렘 4색 세트: 겨자 · 블루 · 청녹색 · 다크핑크 (플레이어별)
export const PLAYER_TONES = ['#D9A514', '#2F80ED', '#0E9F8A', '#C13572'];
export interface PlayerState {
  id: string; name: string; isBot: boolean; tone: string;
  resourceDeck: CardInstance[]; hand: CardInstance[]; played: CardInstance[];
  discard: CardInstance[]; retired: CardInstance[];
  credits: number; adoptsLeft: number; retiredThisTurn: boolean;
  draftPicks: number;
}
export interface ComboEvent { text: string; en?: string; credits?: number; draws?: number; adopts?: number; }
export interface BoardCalc {
  credits: number; adopts: number; draws: number;
  wa1Cost: number; wa3Cost: number;
  recoverTop: number; events: ComboEvent[];
}
export type Phase = 'DRAFT' | 'PLAY' | 'GAMEOVER';
export interface GameState {
  playerCount: number;
  freeDeck: string[]; costDeck: string[];
  consoleFree: ConsolePile[]; consoleCost: ConsolePile | null;
  waStack: string[]; // top = index 0, values 'WA_1VP' | 'WA_3VP'
  players: PlayerState[];
  current: number; phase: Phase; turnNumber: number;
  gameOver: boolean; winnerId: string | null;
  log: LogEntry[];
  lastEvents: ComboEvent[];
}

let uidC = 1;
export const mk = (cardId: string, tone?: string): CardInstance => ({ uid: `c${uidC++}_${Math.random().toString(36).slice(2, 7)}`, cardId, ...(tone ? { tone } : {}) });
const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  // 무조건 2패스 Fisher-Yates (일반·유료·리셔플 전 구간 동일 적용)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]]; }
  }
  return r;
};

export function waSetup(playerCount: number): string[] {
  let n1 = 4, n3 = 3;
  if (playerCount === 3) { n1 = 5; n3 = 4; }
  if (playerCount >= 4) { n1 = 7; n3 = 5; }
  return [...Array(n1).fill('WA_1VP'), ...Array(n3).fill('WA_3VP')];
}

export function newGame(playerCount = 2, names = ['You', 'BOT'], bots = [false, true]): GameState {
  const freeDeck = shuffle(FREE_CARD_IDS.flatMap((id) => {
    const q = (CARD_MAP[id].quantityInDeck ?? 1);
    return Array(q).fill(id);
  }));
  const costDeck = shuffle(Object.entries(COST_QUANTITY).flatMap(([id, q]) => Array(q as number).fill(id)));
  const consoleFree: ConsolePile[] = [];
  for (let i = 0; i < 4; i++) {
    const top = freeDeck.pop()!;
    const ex = consoleFree.find((p) => p.cardId === top);
    if (ex) ex.count++;
    else consoleFree.push({ cardId: top, count: 1 });
    // ensure 4 distinct slots: if stacked, draw again to fill visual slots
    if (consoleFree.length < i + 1) { const t2 = freeDeck.pop()!; consoleFree.push({ cardId: t2, count: 1 }); }
  }
  const consoleCost: ConsolePile = { cardId: costDeck.pop()!, count: 1 };
  const players: PlayerState[] = names.slice(0, playerCount).map((name, i) => ({
    id: `p${i}`, name, isBot: bots[i] ?? i !== 0, tone: PLAYER_TONES[i % PLAYER_TONES.length],
    resourceDeck: [], hand: [], played: [], discard: [], retired: [],
    credits: 0, adoptsLeft: 1, retiredThisTurn: false, draftPicks: 0,
  }));
  // starter goes to discard awaiting draft (12 = 10 + 2 picks) — 온프렘은 플레이어 색상 탑재
  players.forEach((p, i) => { p.discard = ONPREM_STARTER.map((c) => mk(c, PLAYER_TONES[i % PLAYER_TONES.length])); });
  const s: GameState = {
    playerCount, freeDeck, costDeck, consoleFree, consoleCost,
    waStack: waSetup(playerCount), players, current: 0, phase: 'DRAFT',
    turnNumber: 1, gameOver: false, winnerId: null, log: [{ key: 'gameStart', vars: { n: playerCount, w: waSetup(playerCount).length } }], lastEvents: [],
  };
  return s;
}

export function refillConsole(s: GameState) {
  // keep 4 free slots filled (stack duplicates)
  while (s.consoleFree.length < 4 && s.freeDeck.length > 0) {
    const top = s.freeDeck.pop()!;
    const ex = s.consoleFree.find((p) => p.cardId === top);
    if (ex) ex.count++; else s.consoleFree.push({ cardId: top, count: 1 });
  }
  if (!s.consoleCost && s.costDeck.length > 0) s.consoleCost = { cardId: s.costDeck.pop()!, count: 1 };
}

// ---------- Board calculation (Phase 1) ----------
function countById(played: CardInstance[], id: string) {
  return played.filter((c) => c.cardId === id).length;
}
function hasAny(played: CardInstance[], ids: string[]) {
  return played.some((c) => ids.includes(c.cardId));
}
function countCategory(played: CardInstance[], cats: string[], excludeFargateAlone: boolean, playedAll: CardInstance[]) {
  // Fargate alone doesn't count as container unless ECS/EKS present
  const fargateOk = hasAny(playedAll, ['AMAZON_ECS', 'AMAZON_EKS']);
  const autoscaleOk = (cid: string) => {
    if (cid !== 'AWS_EC2_AUTO_SCALING') return true;
    return hasAny(playedAll, ['AMAZON_EC2']);
  };
  return played.filter((c) => {
    const def = CARD_MAP[c.cardId];
    const inCat = cats.some((k) => def.category.toLowerCase().includes(k));
    if (!inCat) return false;
    if (c.cardId === 'AWS_FARGATE' && excludeFargateAlone && !fargateOk) return false;
    if (c.cardId === 'AWS_EC2_AUTO_SCALING' && !autoscaleOk(c.cardId)) return false;
    return true;
  }).length;
}

export function calcBoard(played: CardInstance[]): BoardCalc {
  const events: ComboEvent[] = [];
  let draws = 0, adopts = 1, wa1 = 4, wa3 = 8, recoverTop = 0;
  let credits = 0;

  // EC2 stacking
  const ec2n = countById(played, 'AMAZON_EC2');
  if (ec2n === 1) credits += 2;
  else if (ec2n === 2) { credits += 5; events.push({ text: 'EC2 x2 스택 +5⚡', en: 'EC2 x2 stack +5⚡', credits: 5 }); }
  else if (ec2n >= 3) { credits += 10 + (ec2n - 3) * 2; adopts += 1; events.push({ text: `EC2 x${ec2n} 메가 스택 +${10 + (ec2n - 3) * 2}⚡ +도입 1`, en: `EC2 x${ec2n} mega stack +${10 + (ec2n - 3) * 2}⚡ +1 adoption`, credits: 10, adopts: 1 }); }

  const hasEC2 = ec2n > 0;
  const has = (id: string | string[]) => Array.isArray(id) ? hasAny(played, id) : countById(played, id) > 0;
  const ncat = (cats: string[]) => countCategory(played, cats, true, played);
  const anyAWSother = (selfId: string) => played.some((c) => c.cardId !== selfId && CARD_MAP[c.cardId].frameType === 'AWS_SERVICE');

  for (const c of played) {
    const def = CARD_MAP[c.cardId];
    if (!def) continue;
    let base = def.baseCredits;
    // AutoScaling stacked on EC2 = 4
    if (c.cardId === 'AWS_EC2_AUTO_SCALING' && hasEC2) base = 4;
    if (c.cardId !== 'AMAZON_EC2') credits += base; // EC2 already counted
    // Fargate base 0 already

    for (const combo of def.combos) {
      switch (combo.bonusType) {
        case 'DRAW_CARD': {
          if (combo.targetCardId && has(combo.targetCardId as any)) {
            const n = Array.isArray(combo.targetCardId)
              ? Math.min(1, combo.targetCardId.filter((t) => countById(played, t) > 0).length)
              : 1;
            // SNS+SQS: per SQS
            let times = 1;
            if (c.cardId === 'AMAZON_SNS' && (combo.targetCardId === 'AMAZON_SQS')) times = countById(played, 'AMAZON_SQS');
            draws += (combo.bonusValue ?? 1) * times * n;
            events.push({ text: `${def.name} 콤보! 뽑기 +${(combo.bonusValue ?? 1) * times}`, en: `${def.name} combo! +${(combo.bonusValue ?? 1) * times} draw`, draws: (combo.bonusValue ?? 1) * times });
          } else if (!combo.targetCardId && !combo.targetCategory) {
            draws += combo.bonusValue ?? 1; // CloudFormation unconditional
            events.push({ text: `${def.name} 뽑기 +${combo.bonusValue}`, en: `${def.name} +${combo.bonusValue} draw`, draws: combo.bonusValue });
          }
          break;
        }
        case 'CREDIT': {
          if (combo.targetCardId && has(combo.targetCardId as any)) { credits += combo.bonusValue ?? 0; events.push({ text: `${def.name} +${combo.bonusValue}⚡`, en: `${def.name} +${combo.bonusValue}⚡`, credits: combo.bonusValue }); }
          else if (combo.targetCategory && ncat(combo.targetCategory) > 0) { credits += combo.bonusValue ?? 0; events.push({ text: `${def.name} +${combo.bonusValue}⚡`, en: `${def.name} +${combo.bonusValue}⚡`, credits: combo.bonusValue }); }
          else if (combo.targetAnyOtherService && anyAWSother(c.cardId)) { credits += combo.bonusValue ?? 0; events.push({ text: `${def.name} +${combo.bonusValue}⚡`, en: `${def.name} +${combo.bonusValue}⚡`, credits: combo.bonusValue }); }
          break;
        }
        case 'CLOUD_ADOPT': {
          let ok = false;
          if (combo.targetCardId && has(combo.targetCardId as any)) ok = true;
          else if (!combo.targetCardId && !combo.targetCategory) ok = true; // CFM unconditional
          else if (combo.targetCategory) {
            const need = combo.condition === 'REQUIRES_TWO_CARDS' ? 2 : 1;
            // count effective compute/containers excluding self if self is compute? include all
            if (ncat(combo.targetCategory) >= need) {
              // SQS requires two compute — self SQS is integration so fine
              ok = true;
            }
          }
          if (ok) { adopts += combo.bonusValue ?? 1; events.push({ text: `${def.name} 도입 +${combo.bonusValue ?? 1}`, en: `${def.name} +${combo.bonusValue ?? 1} adoption`, adopts: combo.bonusValue ?? 1 }); }
          break;
        }
        case 'CREDIT_PER_COMBINATION': {
          if (combo.targetCardId) {
            const t = countById(played, combo.targetCardId as string);
            // StepFunctions per Lambda, Dynamo per compute handled below
            credits += (combo.bonusValue ?? 1) * t;
            if (t > 0) events.push({ text: `${def.name} +${(combo.bonusValue ?? 1) * t}⚡`, en: `${def.name} +${(combo.bonusValue ?? 1) * t}⚡`, credits: (combo.bonusValue ?? 1) * t });
          } else if (combo.targetCategory) {
            const t = ncat(combo.targetCategory);
            // exclude self-count? Dynamo is database so fine; APIGW is networking so fine; Kinesis analytics fine; StepFunctions uses cardId branch
            credits += (combo.bonusValue ?? 1) * t;
            if (t > 0) events.push({ text: `${def.name} +${(combo.bonusValue ?? 1) * t}⚡`, en: `${def.name} +${(combo.bonusValue ?? 1) * t}⚡`, credits: (combo.bonusValue ?? 1) * t });
          }
          break;
        }
        case 'CREDIT_PER_COMPUTE_CONTAINER_CARD':
        case 'CREDIT_PER_OTHER_CARD': {
          const t = combo.bonusType === 'CREDIT_PER_OTHER_CARD'
            ? played.length - 1
            : ncat(['compute', 'containers']);
          credits += (combo.bonusValue ?? 1) * t;
          if (t > 0) events.push({ text: `${def.name} +${(combo.bonusValue ?? 1) * t}⚡`, en: `${def.name} +${(combo.bonusValue ?? 1) * t}⚡`, credits: (combo.bonusValue ?? 1) * t });
          break;
        }
        case 'CREDIT_AND_ADOPT': {
          if (combo.targetCardId && has(combo.targetCardId as any)) {
            credits += combo.creditValue ?? 0; adopts += combo.adoptValue ?? 0;
            events.push({ text: `${def.name} +${combo.creditValue}⚡ +도입 ${combo.adoptValue}`, en: `${def.name} +${combo.creditValue}⚡ +${combo.adoptValue} adoption`, credits: combo.creditValue, adopts: combo.adoptValue });
          }
          break;
        }
        case 'DRAW_AND_ADOPT': {
          if (combo.targetCardId && has(combo.targetCardId as any)) {
            draws += combo.drawValue ?? 0; adopts += combo.adoptValue ?? 0;
            events.push({ text: `${def.name} 뽑기 +${combo.drawValue}·도입 +${combo.adoptValue}`, en: `${def.name} +${combo.drawValue} draw · +${combo.adoptValue} adoption`, draws: combo.drawValue, adopts: combo.adoptValue });
          }
          break;
        }
        case 'WA_COST_DISCOUNT': {
          if (combo.discountRules) { wa1 = combo.discountRules.vp_1_cost_override; wa3 = combo.discountRules.vp_3_cost_override; events.push({ text: `WA 할인! 1VP=2⚡ 3VP=6⚡`, en: `WA discount! 1VP=2⚡ 3VP=6⚡` }); }
          break;
        }
        case 'RECOVER_TO_DECK_TOP': {
          recoverTop += 1;
          events.push({ text: `${def.name}: 버린 더미 1장 → 덱 맨 위`, en: `${def.name}: 1 discard → deck top` });
          break;
        }
      }
    }
  }
  // CloudFormation unconditional draw already handled (no target) — but defined with bonusType DRAW_CARD no target → handled.
  return { credits, adopts, draws, wa1Cost: wa1, wa3Cost: wa3, recoverTop, events };
}

export function handCounts(p: PlayerState): { builder: number; onprem: number } {
  const builder = p.hand.filter((c) => isAWS(c.cardId)).length;
  const onprem = p.hand.filter((c) => isOnPrem(c.cardId)).length;
  return { builder, onprem };
}

// Official rule (rules_2024 PDF + Quick Reference A5):
// - ONLY at the beginning of your turn, with your starting hand of 5 cards
// - If you have MORE Builder cards than On-Premises cards in hand (e.g. 3 vs 2, 4 vs 1),
//   you may retire ONE On-Premises card FROM YOUR HAND (show hand to verify)
// - Retired card is removed from the game (not to discard)
// - If you retire, you MUST adopt at least one card from the console this turn
export function canRetire(p: PlayerState): boolean {
  if (p.played.length > 0) return false; // window closed once you start building
  if ((p as any)._retireDone) return false;
  if (p.retiredThisTurn) return false;
  const { builder, onprem } = handCounts(p);
  return builder > onprem && p.hand.some((c) => isOnPrem(c.cardId));
}

export function drawCards(s: GameState, pi: number, n: number) {
  const p = s.players[pi];
  for (let i = 0; i < n; i++) {
    if (p.resourceDeck.length === 0) {
      if (p.discard.length === 0) break;
      p.resourceDeck = shuffle(p.discard);
      p.discard = [];
      s.log.push({ key: 'reshuffle', vars: { p: p.name } });
    }
    const c = p.resourceDeck.pop();
    if (c) p.hand.push(c);
  }
}

export function syncCredits(s: GameState, pi: number) {
  const p = s.players[pi];
  const b = calcBoard(p.played);
  // credits are generated value minus spent? We store spend separately: simplest — credits = generated - spentThisTurn.
  // Store spent on player as (generated - credits)? Instead recompute: keep p.credits as spendable; refresh only base when cards played.
  // This function returns calc; caller manages.
  return b;
}

export function scorePlayer(p: PlayerState): { vp: number; awsCount: number } {
  const all = [...p.resourceDeck, ...p.hand, ...p.played, ...p.discard];
  let vp = 0, aws = 0;
  for (const c of all) {
    if (c.cardId === 'WA_1VP') vp += 1;
    if (c.cardId === 'WA_3VP') vp += 3;
    if (isAWS(c.cardId)) aws++;
  }
  return { vp, awsCount: aws };
}

export function checkGameOver(s: GameState): boolean {
  if (s.waStack.length === 0) {
    s.gameOver = true; s.phase = 'GAMEOVER';
    let best = -1, win = '';
    s.players.forEach((p) => {
      const { vp, awsCount } = scorePlayer(p);
      const score = vp * 1000 + awsCount;
      if (score > best) { best = score; win = p.id; }
    });
    s.winnerId = win;
    s.log.push({ key: 'gameOver', vars: { w: s.players.find((p) => p.id === win)?.name ?? '' } });
    return true;
  }
  return false;
}
