// Locale infrastructure: default EN, KO selectable, persisted. Covers UI chrome,
// card text (via cards.ts helpers + cards.en.ts), structured logs, combo events.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'ko';
type Vars = Record<string, string | number>;

interface LocaleStore {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}

export const useLocale = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
      toggle: () => set((s) => ({ locale: s.locale === 'en' ? 'ko' : 'en' })),
    }),
    { name: 'buildercards-locale', partialize: (s) => ({ locale: s.locale }) as LocaleStore }
  )
);

export function fmt(tpl: string, vars?: Vars): string {
  if (!vars) return tpl;
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), tpl);
}

// ---------- UI strings ----------
const en = {
  nav_rules: '📖 Key rules',
  nav_guide_hide: 'Hide guide',
  nav_guide_show: 'Show guide',
  nav_restart: 'Restart',
  nav_observer: '👁 Spectate',
  nav_intro: '🏠 Intro',
  nav_locale: '🌐 한국어',
  draftTitle: '☁️ Cloud Adoption — pick 2 free cards',
  draftHuman: 'Pick 2 free AWS cards into your discard',
  draftPicked: 'picked',
  draftBot: '(bot thinking…)',
  drafting: '🤖 drafting…',
  consoleSub: '— official: 4 free + 1 paid (+1 expansion slot empty)',
  free: 'FREE',
  paidFmt: '${c}⚡ paid',
  blindCap: '🎲 Blind (1 adoption)',
  waPile: 'WA pile {n}',
  waCost: '{c}⚡ (base {b})',
  waSoldOut: 'Sold out',
  expSlot: 'Expansion slot',
  expSub: 'Empty in base rules',
  archOf: '🏗️ {name} Architecture',
  adoptsU: 'adopts',
  drawsU: 'draws',
  waDisc: '· WA discount!',
  archEmpty: 'Retire (if eligible) → play cards to build ⬇ (or PLAY ALL for max combo)',
  handOf: '🃏 My hand ({n})',
  bvb: 'Builder {a} vs On-Prem {b}',
  playAll: '▶ PLAY ALL (combo!)',
  retireBtn: '♻ Retire On-Prem (hand Builder {a} > On-Prem {b} — 1 from hand)',
  retirePick: 'Click 1 On-Prem in hand (starting hand only, show to verify)',
  skipRetire: 'Skip retire',
  endTurn: '⏭ End turn → discard & draw 5',
  endTurnNeed: '⏭ End turn (need adoption)',
  mustAdopt: '⚠️ Retired: you must adopt ≥1 this turn (cannot end otherwise).',
  calcPre: 'Live calc: base + EC2 stack + ',
  calcMid: ' combos = ',
  calcUse: '⚡ usable',
  calcLeft: ' · adopts left ',
  botThinking: '🤖 {name} is building…',
  pause: '⏸ Pause',
  resume: '▶ Resume',
  fastOn: '⏩ Fast ON',
  fastOff: '⏩ Fast OFF',
  stepNow: '⏭ Step now',
  botHand: '🤖 {name} · {n} cards',
  resDeck: 'Resource deck {n}',
  disPile: 'Discard {n}',
  pileEmpty: 'Empty',
  retiredPile: 'Retired',
  vpAbout: '~{v} VP · {a} AWS',
  cdkTitle: '🛠 AWS CDK — 1 discard → deck top',
  overTitle: '🏆 Game over — last WA taken!',
  overWin: '(WINNER)',
  playAgain: '↻ Play again (PVE)',
  pvpn: 'PVP mode: same engine and action spec — just attach a WebSocket server (state is JSON-serializable).',
  zoomCap: ' · Esc/click outside to close',
  close: 'Close',
  step0: 'Retire', step1: 'Build', step2: 'Adopt', step3: 'Cleanup',
  stepTip0: 'Turn start, starting hand only. More Builder than On-Prem → exile 1',
  stepTip1: 'Play cards from hand to build architectures and combos',
  stepTip2: 'Once per turn. Pay ⚡ at console, WA, or blind',
  stepTip3: 'Discard everything played + in hand, draw 5',
  tipCredits: 'Base credits + combo bonuses of your architecture. Spent on adoptions.',
  tipAdopts: 'Adoptions left this turn. 1 by default, more via combos.',
  tipWa: 'WA cards left in the console. Game ends the moment the last one is taken.',
  tipPlayAll: 'Play the whole hand for max combo. No more retiring after this, so retire first if eligible.',
  tipRetire: 'Official: turn start, starting 5-card hand only. Hand Builder > On-Prem → exile 1 On-Prem. Adopt ≥1 after retiring.',
  tipEnd: 'Discard everything played + in hand (CFM is exiled), draw 5, pass the turn.',
  tipBlind: 'Take the top free-deck card at random. Costs 1 adoption, no peeking.',
  tipWaDeck: 'Top-down order (1VP first). Discounted price shows with Well-Architected Tool.',
  tipExp: 'Official mat: empty unless playing with add-ons/expansions.',
  lockPrep: 'Cannot buy during setup.',
  lockBot: 'Cannot buy on the bot turn.',
  lockAdopts: 'No adoptions left (combos can add more).',
  lockCredits: 'Not enough credits — have {have}⚡ / need {need}⚡.',
  lockEmptyFree: 'Free deck is empty.',
  lockWaEmpty: 'WA pile is empty.',
  obsTitle: '👁 Spectator',
  obsDraft: 'Drafting… (pick in the game view)',
  obsMyTurn: 'Your turn — go back to the 🎮 game view to play.',
  obsMeHand: 'Me · hand {n}',
  obsFree: 'Free {n}',
  obsPaid: 'Paid {n}',
  obsExp: 'Expansion · empty',
  obsOver: '{name} wins!',
  obsGoGame: '🎮 To game',
  obsVpRet: 'VP {v} · retired {r}',
  obsWa: 'WA {n}',
  modalTitle: '📖 Key Rules',
  modalEd: 'Based on the official rulebook',
  playerYou: 'You',
  playerBot: 'CPU-Bedrock',
};

export type StrKey = keyof typeof en;

const ko: Record<StrKey, string> = {
  nav_rules: '📖 핵심 룰',
  nav_guide_hide: '가이드 숨기기',
  nav_guide_show: '가이드 보기',
  nav_restart: '다시 시작',
  nav_observer: '👁 관전',
  nav_intro: '🏠 소개',
  nav_locale: '🌐 English',
  draftTitle: '☁️ 클라우드 도입 페이즈 — 무료 2장 선택',
  draftHuman: '무료 AWS 카드 2장을 골라 버린 더미로',
  draftPicked: '선택',
  draftBot: '(봇 생각 중…)',
  drafting: '🤖 드래프트 중…',
  consoleSub: '— 공식 동일: 무료 4 + 유료 1 (+ 확장팩용 1슬롯 비움)',
  free: '무료',
  paidFmt: '유료 ${c}⚡',
  blindCap: '🎲 블라인드 (도입 1회)',
  waPile: 'WA 더미 {n}장',
  waCost: '비용 {c}⚡ (기본 {b})',
  waSoldOut: '매진',
  expSlot: '확장팩용 슬롯',
  expSub: '기본 룰에서 비움',
  archOf: '🏗️ {name} 아키텍처',
  adoptsU: '도입',
  drawsU: '뽑기',
  waDisc: ' · WA 할인 적용!',
  archEmpty: '폐기(해당 시) → 핸드에서 카드를 내어 아키텍처 구성 ⬇ (또는 전체 내기로 콤보 극대화)',
  handOf: '🃏 내 핸드 ({n})',
  bvb: '빌더 {a} vs 온프렘 {b}',
  playAll: '▶ 전체 내기 (콤보!)',
  retireBtn: '♻ 온프렘 폐기 (핸드 빌더 {a} > 온프렘 {b} — 핸드에서 1장)',
  retirePick: '핸드에서 온프렘 1장 클릭 (시작핸드 한정·공개 확인)',
  skipRetire: '폐기 건너뛰기',
  endTurn: '⏭ 턴 종료 → 정리하고 5장 뽑기',
  endTurnNeed: '⏭ 턴 종료 (도입 필요)',
  mustAdopt: '⚠️ 폐기했으니 이번 턴 도입 ≥1 필수 (안 하면 턴 종료 불가).',
  calcPre: '실시간 계산: 기본 + EC2 스택 + ',
  calcMid: '개 콤보 = ',
  calcUse: '⚡ 사용 가능',
  calcLeft: ' · 남은 도입 ',
  botThinking: '🤖 {name} 아키텍처 구성 중…',
  pause: '⏸ 일시정지',
  resume: '▶ 계속하기',
  fastOn: '⏩ 빨리넘기기 ON',
  fastOff: '⏩ 빨리넘기기 OFF',
  stepNow: '⏭ 지금 넘기기',
  botHand: '🤖 {name} · 핸드 {n}장',
  resDeck: '자원 덱 {n}장',
  disPile: '버린 더미 {n}장',
  pileEmpty: '비었음',
  retiredPile: '제거됨',
  vpAbout: '보유 VP 약 {v} · AWS {a}장',
  cdkTitle: '🛠 AWS CDK — 버린 더미 1장 → 덱 맨 위로',
  overTitle: '🏆 게임 종료 — 마지막 WA 획득!',
  overWin: '(승리)',
  playAgain: '↻ 다시 하기 (PVE)',
  pvpn: 'PVP 모드: 같은 엔진·같은 액션 스펙으로 WebSocket 서버만 붙이면 즉시 확장 가능 (state JSON 직렬화 완료).',
  zoomCap: ' · Esc/바깥 클릭으로 닫기',
  close: '닫기',
  step0: '폐기', step1: '건축', step2: '도입', step3: '정리',
  stepTip0: '턴 시작·시작핸드 한정. 빌더 > 온프렘이면 1장 제거',
  stepTip1: '핸드에서 카드를 내어 아키텍처 구성·콤보 발동',
  stepTip2: '턴당 1회. ⚡를 내고 콘솔·WA·블라인드에서 가져옴',
  stepTip3: '낸 카드 + 남은 핸드를 버리고 5장 뽑기',
  tipCredits: '아키텍처의 기본 크레딧 + 콤보 보너스 합계. 카드 도입 때 지불에 사용합니다.',
  tipAdopts: '이번 턴 남은 도입 횟수. 기본 1회, 콤보(EC2 x3·CFM 등)로 추가됩니다.',
  tipWa: '콘솔에 남은 WA 카드 수. 마지막 1장이 팔리면 즉시 게임 종료·VP 합산.',
  tipPlayAll: '핸드를 전부 내어 콤보를 극대화합니다. 이후에는 폐기할 수 없으니, 폐기 조건이면 먼저 폐기하세요.',
  tipRetire: '공식 룰: 턴 시작·시작핸드 5장 한정. 핸드 빌더 > 온프렘이면 핸드에서 온프렘 1장 영구 제거. 제거 시 이번 턴 도입 ≥1 필수.',
  tipEnd: '낸 카드 + 남은 핸드를 전부 버린 더미로(CFM은 제거), 5장을 뽑고 턴을 넘깁니다.',
  tipBlind: '무료 덱 맨 위 1장을 무작위로 가져옵니다. 도입 1회를 소모하고, 카드를 보고 고를 수는 없습니다.',
  tipWaDeck: 'WA는 맨 위부터 순서대로(1VP 먼저). Well-Architected Tool을 냈으면 할인 가격이 표시됩니다.',
  tipExp: '매트 공식: 기본 룰에서는 비워두는 슬롯. add-on·확장팩을 쓸 때만 사용합니다.',
  lockPrep: '게임 준비 중에는 구매할 수 없습니다.',
  lockBot: '봇 턴에는 구매할 수 없습니다.',
  lockAdopts: '도입 횟수를 다 썼습니다 (콤보로 추가 가능).',
  lockCredits: '크레딧 부족 — 보유 {have}⚡ / 필요 {need}⚡.',
  lockEmptyFree: '무료 덱이 비었습니다.',
  lockWaEmpty: 'WA 더미가 비었습니다.',
  obsTitle: '👁 관전',
  obsDraft: '드래프트 중… (게임 화면에서 선택)',
  obsMyTurn: '나의 턴 — 🎮 게임으로 돌아가서 진행하세요.',
  obsMeHand: '나 · 핸드 {n}',
  obsFree: '무료 {n}',
  obsPaid: '유료 {n}',
  obsExp: '확장팩용 · 비움',
  obsOver: '{name} 승리!',
  obsGoGame: '🎮 게임으로',
  obsVpRet: 'VP {v} · 제거 {r}',
  obsWa: 'WA {n}장',
  modalTitle: '📖 핵심 룰 요약',
  modalEd: '공식 룰북 기반',
  playerYou: '나',
  playerBot: 'CPU-Bedrock',
};

export function tr(locale: Locale, key: StrKey, vars?: Vars): string {
  const table = locale === 'ko' ? ko : en;
  return fmt(table[key], vars);
}

// ---------- Structured logs (rendered in the viewer's locale) ----------
export interface LogEntry {
  key: string;
  vars?: Vars;
}

const LOG_TPL: Record<string, { ko: string; en: string }> = {
  gameStart: { ko: '게임 시작 — {n}인, WA {w}장', en: 'Game start — {n}P, {w} WA' },
  reshuffle: { ko: '{p} 버린 더미 셔플 → 덱으로', en: '{p} shuffles discard into deck' },
  gameOver: { ko: '게임 종료! 승리: {w}', en: 'Game over! Winner: {w}' },
  draftDone: { ko: '드래프트 완료 — 1턴 시작!', en: 'Draft done — Turn 1!' },
  draft: { ko: '{p} 드래프트로 가져옴 {c}', en: '{p} drafts {c}' },
  retire: { ko: '{p} 온프렘 폐기 ♻', en: '{p} retires On-Prem ♻' },
  adoptFree: { ko: '{p} 도입 {c}', en: '{p} adopts {c}' },
  adoptPaid: { ko: '{p} 유료 도입 {c}', en: '{p} paid-adopts {c}' },
  adoptWA: { ko: '{p} 획득 {v} 웰-아키텍티드!', en: '{p} claims {v} Well-Architected!' },
  blind: { ko: '{p} 블라인드로 뽑음 {c}', en: '{p} blind-picks {c}' },
  end: { ko: '{p} 턴 종료 (덱 {d} / 버린 더미 {x})', en: '{p} ends turn (deck {d} / discard {x})' },
  blocked: { ko: '⚠️ {p}: 폐기했으면 이번 턴에 최소 1장 도입 필수!', en: '⚠️ {p}: retired — must adopt ≥1 this turn!' },
  raw: { ko: '{t}', en: '{t}' },
};

export function tLog(entry: LogEntry, locale: Locale, cardNameOf?: (cardId: string) => string): string {
  const tpl = LOG_TPL[entry.key] ?? LOG_TPL.raw;
  const vars: Vars = { ...(entry.vars ?? {}) };
  if (typeof vars.c === 'string' && vars.c.startsWith('card:') && cardNameOf) {
    vars.c = cardNameOf(vars.c.slice(5));
  }
  return fmt(locale === 'ko' ? tpl.ko : tpl.en, vars);
}

export function logIcon(key: string): string {
  switch (key) {
    case 'adoptWA':
    case 'gameOver': return '🏆';
    case 'retire': return '♻';
    case 'adoptFree':
    case 'adoptPaid':
    case 'blind':
    case 'draft': return '📥';
    case 'end': return '⏭';
    case 'draftDone': return '☁️';
    case 'reshuffle': return '🔀';
    case 'blocked': return '';
    default: return '•';
  }
}

export function playerNames(locale: Locale): [string, string] {
  return locale === 'ko' ? ['나', 'CPU-Bedrock'] : ['You', 'CPU-Bedrock'];
}
