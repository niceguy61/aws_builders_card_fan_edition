// Zustand store — UI controller over pure engine. PVP-ready: all mutations are serializable actions.
import { create } from 'zustand';
import { CARD_MAP } from '../game/cards';
import {
  newGame, refillConsole, calcBoard, drawCards, checkGameOver, mk, canRetire,
  type GameState,
} from '../game/engine';
import { botChooseRetire, botChooseBuy } from '../game/bot';
import { sfx } from '../fx/sound';

interface Store {
  g: GameState;
  selectedHand: string[];
  cdkMode: boolean;
  start: (bots?: boolean[], names?: [string, string]) => void;
  draftPick: (cardId: string) => void;
  playCard: (uid: string) => void;
  playAll: () => void;
  retire: (uid: string) => void;
  skipRetire: () => void;
  buyFree: (cardId: string) => void;
  buyCost: () => void;
  buyWA: () => void;
  buyBlind: () => void;
  cdkRecover: (uid: string) => void;
  endTurn: () => void;
  botStep: () => void;
}

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

function takeConsoleFree(g: GameState, cardId: string): boolean {
  const pile = g.consoleFree.find((p) => p.cardId === cardId);
  if (!pile || pile.count <= 0) return false;
  pile.count--;
  if (pile.count === 0) g.consoleFree = g.consoleFree.filter((p) => p.cardId !== cardId);
  return true;
}

export const useGame = create<Store>((set, get) => ({
  g: newGame(),
  selectedHand: [],
  cdkMode: false,

  start: (bots = [false, true], names: [string, string] = ['You', 'CPU-Bedrock']) => {
    const g = newGame(2, names, bots);
    set({ g, selectedHand: [], cdkMode: false });
    // bot draft auto after human? handled by UI loop calling botStep
  },

  draftPick: (cardId) => {
    const { g } = get();
    const ng = clone(g);
    const p = ng.players[ng.current];
    // human draft
    if (!takeConsoleFree(ng, cardId)) return;
    refillConsole(ng);
    p.discard.push(mk(cardId));
    p.draftPicks++;
    ng.log.push({ key: 'draft', vars: { p: p.name, c: `card:${cardId}` } });
    sfx.deal();
    // advance draft turn
    if (p.draftPicks >= 2) {
      // shuffle 12 -> deck, draw 5
      p.resourceDeck = [...p.discard].sort(() => Math.random() - 0.5);
      // Fisher shuffle proper
      for (let i = p.resourceDeck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[p.resourceDeck[i], p.resourceDeck[j]] = [p.resourceDeck[j], p.resourceDeck[i]]; }
      p.discard = [];
      drawCards(ng, ng.current, 5);
      const b = calcBoard(p.played);
      p.credits = b.credits; p.adoptsLeft = b.adopts;
    }
    // next drafter who still needs picks
    const need = ng.players.findIndex((pl) => pl.draftPicks < 2);
    if (need === -1) {
      ng.phase = 'PLAY'; ng.current = 0;
      ng.log.push({ key: 'draftDone' });
    } else {
      ng.current = need;
    }
    set({ g: ng });
  },

  playCard: (uid) => {
    const { g } = get();
    if (g.phase !== 'PLAY' || g.gameOver) return;
    const ng = clone(g);
    const p = ng.players[ng.current];
    if (p.isBot) return;
    const i = p.hand.findIndex((c) => c.uid === uid);
    if (i < 0) return;
    const [c] = p.hand.splice(i, 1);
    p.played.push(c);
    (p as any)._retireDone = true; // official: retire window closes once you start building
    const b = calcBoard(p.played);
    p.credits = b.credits - (p as any)._spent! >= 0 ? b.credits - ((p as any)._spent ?? 0) : b.credits;
    // handle instant draws from new combos (diff draws)
    const prevDraws = (p as any)._drawn ?? 0;
    if (b.draws > prevDraws) {
      const nd = b.draws - prevDraws;
      (p as any)._drawn = b.draws;
      drawCards(ng, ng.current, nd);
      sfx.combo();
    } else {
      sfx.flip();
    }
    // CDK recover prompt
    if (b.recoverTop > ((p as any)._recovered ?? 0) && p.discard.length > 0) {
      set({ cdkMode: true });
    }
    p.adoptsLeft = Math.max(p.adoptsLeft, 1) + (b.adopts - 1) - ((p as any)._adoptUsed ?? 0) + ((p as any)._adoptBonusApplied ?? 0) * 0;
    // simpler: adopts = b.adopts - used
    p.adoptsLeft = b.adopts - ((p as any)._adoptUsed ?? 0);
    ng.lastEvents = b.events;
    set({ g: ng });
  },

  playAll: () => {
    const { g } = get();
    if (g.phase !== 'PLAY' || g.gameOver) return;
    const ng = clone(g);
    const p = ng.players[ng.current];
    if (p.isBot) return;
    p.played.push(...p.hand); p.hand = [];
    (p as any)._retireDone = true;
    // 구매 후 전체 내기를 눌러도 쓴 크레딧·도입·뽑기는 유지 (환불 금지)
    const prevSpent = (p as any)._spent ?? 0;
    const prevAdopt = (p as any)._adoptUsed ?? 0;
    const prevDrawn = (p as any)._drawn ?? 0;
    const b = calcBoard(p.played);
    const newDraws = Math.max(0, b.draws - prevDrawn);
    (p as any)._drawn = prevDrawn + newDraws;
    (p as any)._spent = prevSpent; (p as any)._adoptUsed = prevAdopt;
    p.credits = b.credits - prevSpent; p.adoptsLeft = b.adopts - prevAdopt;
    if (newDraws > 0) drawCards(ng, ng.current, newDraws);
    if (b.recoverTop > 0 && p.discard.length > 0) set({ cdkMode: true });
    ng.lastEvents = b.events;
    sfx.flip();
    if (b.events.length) sfx.combo();
    set({ g: ng });
  },

  retire: (uid) => {
    const { g } = get();
    const ng = clone(g);
    const p = ng.players[ng.current];
    // Official: only from HAND, only at turn start (played must be empty)
    if (!canRetire(p)) return;
    const i = p.hand.findIndex((c) => c.uid === uid);
    if (i < 0) return;
    const def = CARD_MAP[p.hand[i].cardId];
    if (def.frameType !== 'ON_PREM') return;
    const [c] = p.hand.splice(i, 1);
    p.retired.push(c);
    p.retiredThisTurn = true;
    (p as any)._retireDone = true;
    ng.log.push({ key: 'retire', vars: { p: p.name } });
    sfx.retire();
    set({ g: ng });
  },
  skipRetire: () => {
    const { g } = get();
    const ng = clone(g);
    (ng.players[ng.current] as any)._retireDone = true;
    set({ g: ng });
  },

  buyFree: (cardId) => {
    const { g } = get();
    const ng = clone(g);
    const p = ng.players[ng.current];
    const def = CARD_MAP[cardId];
    if (p.adoptsLeft <= 0 || p.credits < def.cost) return;
    if (!takeConsoleFree(ng, cardId)) return;
    refillConsole(ng);
    p.discard.push(mk(cardId));
    p.credits -= def.cost;
    (p as any)._spent = ((p as any)._spent ?? 0) + def.cost;
    (p as any)._adoptUsed = ((p as any)._adoptUsed ?? 0) + 1;
    p.adoptsLeft--;
    ng.log.push({ key: 'adoptFree', vars: { p: p.name, c: `card:${cardId}` } });
    sfx.adopt();
    set({ g: ng });
  },
  buyCost: () => {
    const { g } = get();
    const ng = clone(g);
    const p = ng.players[ng.current];
    const pile = ng.consoleCost;
    if (!pile) return;
    const def = CARD_MAP[pile.cardId];
    if (p.adoptsLeft <= 0 || p.credits < def.cost) return;
    p.discard.push(mk(pile.cardId));
    ng.consoleCost = ng.costDeck.length ? { cardId: ng.costDeck.pop()!, count: 1 } : null;
    p.credits -= def.cost;
    (p as any)._spent = ((p as any)._spent ?? 0) + def.cost;
    (p as any)._adoptUsed = ((p as any)._adoptUsed ?? 0) + 1;
    p.adoptsLeft--;
    ng.log.push({ key: 'adoptPaid', vars: { p: p.name, c: `card:${pile.cardId}` } });
    sfx.adopt();
    set({ g: ng });
  },
  buyWA: () => {
    const { g } = get();
    const ng = clone(g);
    const p = ng.players[ng.current];
    const top = ng.waStack[0];
    if (!top) return;
    const b = calcBoard(p.played);
    const cost = top === 'WA_1VP' ? b.wa1Cost : b.wa3Cost;
    if (p.adoptsLeft <= 0 || p.credits < cost) return;
    ng.waStack.shift();
    p.discard.push(mk(top));
    p.credits -= cost;
    (p as any)._spent = ((p as any)._spent ?? 0) + cost;
    (p as any)._adoptUsed = ((p as any)._adoptUsed ?? 0) + 1;
    p.adoptsLeft--;
    ng.log.push({ key: 'adoptWA', vars: { p: p.name, v: top === 'WA_1VP' ? '1VP' : '3VP' } });
    sfx.win();
    if (checkGameOver(ng)) { set({ g: ng }); return; }
    set({ g: ng });
  },
  buyBlind: () => {
    const { g } = get();
    const ng = clone(g);
    const p = ng.players[ng.current];
    if (p.adoptsLeft <= 0 || ng.freeDeck.length === 0) return;
    const cid = ng.freeDeck.pop()!;
    p.discard.push(mk(cid));
    (p as any)._adoptUsed = ((p as any)._adoptUsed ?? 0) + 1;
    p.adoptsLeft--;
    ng.log.push({ key: 'blind', vars: { p: p.name, c: `card:${cid}` } });
    sfx.deal();
    set({ g: ng });
  },

  cdkRecover: (uid) => {
    const { g } = get();
    const ng = clone(g);
    const p = ng.players[ng.current];
    const i = p.discard.findIndex((c) => c.uid === uid);
    if (i < 0) return;
    const [c] = p.discard.splice(i, 1);
    p.resourceDeck.push(c);
    (p as any)._recovered = ((p as any)._recovered ?? 0) + 1;
    set({ g: ng, cdkMode: false });
  },

  endTurn: () => {
    const { g } = get();
    const ng = clone(g);
    const p = ng.players[ng.current];
    // Official: if you retired, you MUST adopt at least one card this turn
    if (p.retiredThisTurn && ((p as any)._adoptUsed ?? 0) === 0) {
      ng.log.push({ key: 'blocked', vars: { p: p.name } });
      set({ g: ng });
      return;
    }
    // cleanup: played+hand -> discard except CFM exile
    const all = [...p.played, ...p.hand];
    for (const c of all) {
      if (c.cardId === 'AWS_CLOUD_FINANCIAL_MANAGEMENT') p.retired.push(c);
      else p.discard.push(c);
    }
    p.played = []; p.hand = [];
    delete (p as any)._spent; delete (p as any)._drawn; delete (p as any)._adoptUsed; delete (p as any)._recovered; delete (p as any)._retireDone;
    p.retiredThisTurn = false;
    drawCards(ng, ng.current, 5);
    ng.log.push({ key: 'end', vars: { p: p.name, d: p.resourceDeck.length, x: p.discard.length } });
    // next player
    ng.current = (ng.current + 1) % ng.players.length;
    if (ng.current === 0) ng.turnNumber++;
    const np = ng.players[ng.current];
    const b0 = calcBoard(np.played);
    np.credits = b0.credits; np.adoptsLeft = b0.adopts;
    sfx.turn();
    set({ g: ng, cdkMode: false });
  },

  botStep: () => {
    const { g } = get();
    if (g.gameOver || g.phase !== 'PLAY') return;
    const p = g.players[g.current];
    if (!p.isBot) return;
    const ng = clone(g);
    const me = ng.players[ng.current];
    // 0. Official first: retire check on STARTING hand (before building anything)
    if (canRetire(me)) {
      const uid = botChooseRetire(ng, ng.current);
      if (uid) {
        const i = me.hand.findIndex((c) => c.uid === uid);
        if (i >= 0) {
          me.retired.push(...me.hand.splice(i, 1));
          me.retiredThisTurn = true;
          ng.log.push({ key: 'retire', vars: { p: me.name } });
        }
      }
      (me as any)._retireDone = true;
    }
    // 1. play all
    me.played.push(...me.hand); me.hand = [];
    let b = calcBoard(me.played);
    (me as any)._spent = 0; (me as any)._adoptUsed = 0;
    me.credits = b.credits; me.adoptsLeft = b.adopts;
    if (b.draws > 0) { drawCards(ng, ng.current, b.draws); /* drawn cards also auto-play? poker speed: yes once */ me.played.push(...me.hand); me.hand = []; b = calcBoard(me.played); me.credits = b.credits; me.adoptsLeft = b.adopts; }
    // CDK auto recover best discard
    if (b.recoverTop > 0 && me.discard.length > 0) {
      me.discard.sort((a, c) => (CARD_MAP[a.cardId]?.baseCredits ?? 0) - (CARD_MAP[c.cardId]?.baseCredits ?? 0));
      const best = me.discard.pop()!;
      me.resourceDeck.push(best);
    }
    // 2. (retire already handled at turn start per official rules — no mid-turn retire)
    // 3. buy loop
    let guard = 0;
    while (me.adoptsLeft > 0 && guard++ < 4) {
      // refresh costs since credits change
      b = calcBoard(me.played);
      const top = ng.waStack[0];
      const waCost = top === 'WA_1VP' ? b.wa1Cost : b.wa3Cost;
      const choice = botChooseBuy({ ...ng, players: ng.players.map((pl, i) => i === ng.current ? { ...pl, credits: me.credits, adoptsLeft: me.adoptsLeft } : pl) } as any, ng.current);
      if (!choice) break;
      if (choice.kind === 'wa' && top && me.credits >= waCost) {
        ng.waStack.shift(); me.discard.push(mk(top)); me.credits -= waCost;
        (me as any)._adoptUsed = ((me as any)._adoptUsed ?? 0) + 1; me.adoptsLeft--;
        ng.log.push({ key: 'adoptWA', vars: { p: me.name, v: top === 'WA_1VP' ? '1VP' : '3VP' } });
      } else if (choice.kind === 'free' && choice.cardId) {
        const pile = ng.consoleFree.find((x) => x.cardId === choice.cardId);
        const def = CARD_MAP[choice.cardId];
        if (!pile || me.credits < def.cost) break;
        pile.count--; if (pile.count <= 0) ng.consoleFree = ng.consoleFree.filter((x) => x.cardId !== choice.cardId);
        refillConsole(ng);
        me.discard.push(mk(choice.cardId)); me.credits -= def.cost;
        (me as any)._adoptUsed = ((me as any)._adoptUsed ?? 0) + 1; me.adoptsLeft--;
        ng.log.push({ key: 'adoptFree', vars: { p: me.name, c: `card:${choice.cardId}` } });
      } else if (choice.kind === 'cost' && ng.consoleCost) {
        const def = CARD_MAP[ng.consoleCost.cardId];
        if (me.credits < def.cost) break;
        me.discard.push(mk(ng.consoleCost.cardId));
        ng.consoleCost = ng.costDeck.length ? { cardId: ng.costDeck.pop()!, count: 1 } : null;
        me.credits -= def.cost;
        (me as any)._adoptUsed = ((me as any)._adoptUsed ?? 0) + 1; me.adoptsLeft--;
      } else if (choice.kind === 'blind' && ng.freeDeck.length) {
        const cid = ng.freeDeck.pop()!;
        me.discard.push(mk(cid));
        (me as any)._adoptUsed = ((me as any)._adoptUsed ?? 0) + 1; me.adoptsLeft--;
      } else break;
      if (checkGameOver(ng)) { set({ g: ng }); return; }
    }
    ng.lastEvents = calcBoard(me.played).events;
    // 4. cleanup + pass
    const all = [...me.played, ...me.hand];
    for (const c of all) {
      if (c.cardId === 'AWS_CLOUD_FINANCIAL_MANAGEMENT') me.retired.push(c);
      else me.discard.push(c);
    }
    me.played = []; me.hand = [];
    drawCards(ng, ng.current, 5);
    ng.current = (ng.current + 1) % ng.players.length;
    if (ng.current === 0) ng.turnNumber++;
    const np = ng.players[ng.current];
    const nb = calcBoard(np.played);
    np.credits = nb.credits; np.adoptsLeft = nb.adopts;
    ng.log.push({ key: 'end', vars: { p: me.name, d: me.resourceDeck.length, x: me.discard.length } });
    set({ g: ng });
  },
}));
