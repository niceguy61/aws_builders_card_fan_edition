// AWS BuilderCards 2nd Edition - Card DB loader
// CANONICAL SOURCE: src/game/cards.json (single source of truth).
// Translators & distributors: edit ONLY cards.json name/description text pairs.
//   - Regenerate the translation sheet:  npm run cards:template
//   - Apply a filled sheet back to JSON: npm run cards:import
// Names stay English in both locales; KO/EN display text comes from the JSON pairs.
import DATA from './cards.json';
import type { Locale } from '../i18n';

export type FrameType = 'ON_PREM' | 'AWS_SERVICE' | 'WELL_ARCHITECTED';
export type BonusType =
  | 'DRAW_CARD'
  | 'CREDIT'
  | 'CLOUD_ADOPT'
  | 'CREDIT_PER_COMBINATION'
  | 'CREDIT_PER_COMPUTE_CONTAINER_CARD'
  | 'CREDIT_PER_OTHER_CARD'
  | 'CREDIT_AND_ADOPT'
  | 'DRAW_AND_ADOPT'
  | 'WA_COST_DISCOUNT'
  | 'RECOVER_TO_DECK_TOP';

export interface ComboDef {
  targetCardId?: string | string[];
  targetCategory?: string[];
  targetAnyOtherService?: boolean;
  condition?: string;
  bonusType: BonusType;
  bonusValue?: number;
  creditValue?: number;
  adoptValue?: number;
  drawValue?: number;
  discountRules?: { vp_1_cost_override: number; vp_3_cost_override: number };
  description: string;
}

export interface CardDef {
  cardId: string;
  name: string;
  category: string;
  frameType: FrameType;
  cost: number;
  baseCredits: number;
  quantityPerColor?: number;
  totalQuantity?: number;
  quantityInDeck?: number;
  maxQuantity?: number;
  victoryPoints?: number;
  combos: ComboDef[];
  stackable?: boolean;
  stackBonus?: any;
  restrictions?: { cannotStandaloneCombo?: string[] | boolean; description: string };
  turnEndAction?: { actionType: string; destinationLocation: string; description: string };
  description?: string;
  icon?: string; // public/icons/*.svg (AWS Architecture Icons, 필요한 36종만 포함)
  iconBg?: string; // 아이콘 SVG의 Icon-Architecture-BG fill에서 추출한 공식 배경색
}

interface RawText {
  ko: string;
  en: string;
}

interface RawCombo {
  bonusType: BonusType;
  bonusValue?: number;
  creditValue?: number;
  adoptValue?: number;
  drawValue?: number;
  discountRules?: { vp_1_cost_override: number; vp_3_cost_override: number };
  targetCardId?: string | string[];
  targetCategory?: string[];
  targetAnyOtherService?: boolean;
  condition?: string;
  description: RawText;
}

interface RawCard {
  cardId: string;
  name: RawText;
  category: string;
  frameType: FrameType;
  cost: number;
  baseCredits: number;
  victoryPoints?: number;
  quantityPerColor?: number;
  totalQuantity?: number;
  quantityInDeck?: number;
  maxQuantity?: number;
  stackable?: boolean;
  description: RawText;
  combos: RawCombo[];
  stackBonus?: any;
  restrictions?: any;
  turnEndAction?: any;
  icon?: string;
  iconBg?: string;
}

const RAW = (DATA as unknown as { cards: RawCard[] }).cards;

// {ko,en} description wrapper → plain string for one locale (arrays pass through)
function pickDesc<T>(o: T, lang: 'ko' | 'en'): T {
  const r = o as unknown as Record<string, unknown>;
  if (r && typeof r === 'object' && !Array.isArray(r) && 'description' in r) {
    return { ...(r as object), description: (r.description as RawText)[lang] } as T;
  }
  return o;
}

// KO view of the canonical JSON (engine + default UI)
export const CARD_DB: CardDef[] = RAW.map((r) => {
  const ko: Record<string, unknown> = {
    ...r,
    name: r.name.ko,
    description: r.description.ko,
    combos: r.combos.map((k) => ({ ...k, description: k.description.ko })),
  };
  if (ko.stackBonus !== undefined) ko.stackBonus = pickDesc(ko.stackBonus, 'ko');
  if (ko.restrictions !== undefined) ko.restrictions = pickDesc(ko.restrictions, 'ko');
  if (ko.turnEndAction !== undefined) ko.turnEndAction = pickDesc(ko.turnEndAction, 'ko');
  return ko as unknown as CardDef;
});

export const CARD_MAP: Record<string, CardDef> = Object.fromEntries(CARD_DB.map((c) => [c.cardId, c]));

export interface EnText {
  name?: string;
  description?: string;
  combos?: string[];
  stackBonus?: string;
  restrictions?: string;
  turnEnd?: string;
}

function enExtra(o: unknown): string | undefined {
  const r = o as Record<string, unknown> | null | undefined;
  if (r && typeof r === 'object' && !Array.isArray(r) && 'description' in r) {
    return (r.description as RawText).en;
  }
  return undefined;
}

// EN view of the canonical JSON
export const EN_TEXT: Record<string, EnText> = Object.fromEntries(
  RAW.map((r) => {
    const e: EnText = {
      name: r.name.en,
      description: r.description.en,
      combos: r.combos.map((k) => k.description.en),
    };
    const sb = enExtra(r.stackBonus);
    if (sb !== undefined) e.stackBonus = sb;
    const rs = enExtra(r.restrictions);
    if (rs !== undefined) e.restrictions = rs;
    const te = enExtra(r.turnEndAction);
    if (te !== undefined) e.turnEnd = te;
    return [r.cardId, e];
  })
);

// Locale-aware card text (KO default fields above, EN originals from the JSON)
export function cardName(def: CardDef, locale: Locale): string {
  if (locale === 'en') return EN_TEXT[def.cardId]?.name ?? def.name;
  return def.name;
}
export function cardDesc(def: CardDef, locale: Locale): string {
  if (locale === 'en') return EN_TEXT[def.cardId]?.description ?? def.description ?? '';
  return def.description ?? '';
}
export function comboDesc(def: CardDef, idx: number, locale: Locale): string {
  if (locale === 'en') return EN_TEXT[def.cardId]?.combos?.[idx] ?? def.combos[idx]?.description ?? '';
  return def.combos[idx]?.description ?? '';
}

export const ONPREM_STARTER: string[] = [
  'ONPREM_SAN',
  'ONPREM_BARE_METAL',
  'ONPREM_BARE_METAL',
  'ONPREM_BARE_METAL',
  'ONPREM_VM',
  'ONPREM_DB_SERVER',
  'ONPREM_NETWORKING',
  'ONPREM_DOC_STORE',
  'ONPREM_DW',
  'ONPREM_ID_PROVIDER',
];

export const COST_CARD_IDS = [
  'AWS_WELL_ARCHITECTED_TOOL',
  'AWS_CLOUD_FINANCIAL_MANAGEMENT',
  'AWS_EC2_AUTO_SCALING',
  'AWS_CLOUDFORMATION',
  'AWS_SYSTEMS_MANAGER',
  'AWS_CDK',
];

export const COST_QUANTITY: Record<string, number> = {
  AWS_WELL_ARCHITECTED_TOOL: 2,
  AWS_CLOUD_FINANCIAL_MANAGEMENT: 2,
  AWS_EC2_AUTO_SCALING: 2,
  AWS_CLOUDFORMATION: 3,
  AWS_SYSTEMS_MANAGER: 2,
  AWS_CDK: 4,
};

export const FREE_CARD_IDS = CARD_DB.filter(
  (c) => c.frameType === 'AWS_SERVICE' && c.cost === 0
).map((c) => c.cardId);

export function categoryColor(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('compute')) return '#EC7211';
  if (c.includes('storage')) return '#7AA116';
  if (c.includes('database')) return '#C925D1';
  if (c.includes('network')) return '#8C4FFF';
  if (c.includes('analytic')) return '#E01E5A';
  if (c.includes('application')) return '#E01E5A';
  if (c.includes('management') || c.includes('governance')) return '#D13212';
  if (c.includes('security')) return '#DD344C';
  if (c.includes('container')) return '#E8680C';
  if (c.includes('developer')) return '#20786B';
  if (c.includes('financial')) return '#067165';
  if (c.includes('marketplace')) return '#9D2BEB';
  if (c.includes('on-prem')) return '#D9A514';
  if (c.includes('well')) return '#FF9900';
  return '#232F3E';
}

export function isOnPrem(cardId: string) {
  return CARD_MAP[cardId]?.frameType === 'ON_PREM';
}
export function isAWS(cardId: string) {
  return CARD_MAP[cardId]?.frameType === 'AWS_SERVICE';
}
