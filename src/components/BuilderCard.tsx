import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CARD_MAP, categoryColor, cardName, cardDesc, comboDesc, EN_TEXT } from '../game/cards';
import type { CardInstance } from '../game/engine';
import { useLocale } from '../i18n';
import { CreditIcon, DrawIcon, AdoptIcon, effectFx, effectCond } from './EffectIcons';

interface Props {
  card: CardInstance;
  small?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  glow?: boolean;
}

// 실제 렌더 폭을 캔버스로 실측해 글자를 줄이는 훅 — 무조건 한 줄, 말줄임 없음
function useFitFont(text: string, base: number, min: number, dep: boolean, reserve = 0, extraDep: unknown = null) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(base);
  useLayoutEffect(() => {
    let raf = 0;
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const avail = el.clientWidth - reserve;
      if (!avail) return;
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return;
      const cs = getComputedStyle(el);
      let s = base;
      while (s > min) {
        ctx.font = `${cs.fontWeight} ${s}px ${cs.fontFamily}`;
        if (ctx.measureText(text).width <= avail) break;
        s -= 0.5;
      }
      setSize(s);
    };
    measure();
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [text, base, min, dep, reserve, extraDep]);
  return { ref, size };
}

// 테마색 + 흰색 믹스 (배너 구름 = 배경색의 옅은 틴트, 실물 카드처럼)
function mixWhite(hex: string, amt: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const m = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${m((n >> 16) & 255)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`;
}

// 테마색 + 검정 믹스 (온프렘 상승 화살표용 진한 틴트)
function mixBlack(hex: string, amt: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const m = (c: number) => Math.round(c * (1 - amt));
  return `rgb(${m((n >> 16) & 255)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`;
}

// 온프렘 9종 흰색 라인 아이콘 (실물 카드 스타일)
function OnPremIcon({ cardId }: { cardId: string }) {
  const g = { fill: 'none', stroke: '#fff', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const dot = { fill: '#fff', stroke: 'none' };
  let body: ReactNode = null;
  switch (cardId) {
    case 'ONPREM_SAN':
      body = (<g {...g}><rect x="9" y="7" width="30" height="34" rx="2" /><line x1="9" y1="18" x2="39" y2="18" /><line x1="9" y1="29" x2="39" y2="29" /><circle cx="15" cy="12.5" r="1.4" {...dot} /><circle cx="15" cy="23.5" r="1.4" {...dot} /><circle cx="15" cy="34.5" r="1.4" {...dot} /><line x1="21" y1="12.5" x2="33" y2="12.5" /><line x1="21" y1="23.5" x2="33" y2="23.5" /><line x1="21" y1="34.5" x2="33" y2="34.5" /></g>);
      break;
    case 'ONPREM_BARE_METAL':
      body = (<g {...g}><rect x="15" y="5" width="18" height="38" rx="2" /><line x1="15" y1="15" x2="33" y2="15" /><line x1="15" y1="25" x2="33" y2="25" /><line x1="15" y1="35" x2="33" y2="35" /><circle cx="20" cy="10" r="1.4" {...dot} /><circle cx="20" cy="20" r="1.4" {...dot} /><circle cx="20" cy="30" r="1.4" {...dot} /></g>);
      break;
    case 'ONPREM_VM':
      body = (<g {...g}>
        {[4, 14, 24, 34].map((y) => (
          <g key={y}><rect x="8" y={y} width="32" height="8" rx="1.5" /><line x1="14" y1={y + 4} x2="28" y2={y + 4} /><circle cx="34" cy={y + 4} r="1.3" {...dot} /></g>
        ))}
      </g>);
      break;
    case 'ONPREM_DB_SERVER':
      body = (<g {...g}><ellipse cx="24" cy="11" rx="12" ry="5" /><path d="M12 11 v26 c0 2.8 5.4 5 12 5 s12 -2.2 12 -5 v-26" /><path d="M12 24 c0 2.8 5.4 5 12 5 s12 -2.2 12 -5" /></g>);
      break;
    case 'ONPREM_NETWORKING':
      body = (<g {...g}><circle cx="24" cy="11" r="5" /><circle cx="11" cy="36" r="5" /><circle cx="37" cy="36" r="5" /><line x1="21" y1="15" x2="14" y2="31" /><line x1="27" y1="15" x2="34" y2="31" /><line x1="16" y1="36" x2="32" y2="36" /></g>);
      break;
    case 'ONPREM_DOC_STORE':
      body = (<g {...g}><path d="M14 5 h13 l9 9 v29 h-22 z" /><path d="M27 5 v9 h9" /><line x1="19" y1="24" x2="31" y2="24" /><line x1="19" y1="30" x2="31" y2="30" /><line x1="19" y1="36" x2="28" y2="36" /></g>);
      break;
    case 'ONPREM_DW':
      body = (<g {...g}><ellipse cx="24" cy="12" rx="14" ry="5" /><path d="M10 12 v24 c0 2.8 6.3 5 14 5 s14 -2.2 14 -5 v-24" /><path d="M10 22 c0 2.8 6.3 5 14 5 s14 -2.2 14 -5" /><path d="M10 30 c0 2.8 6.3 5 14 5 s14 -2.2 14 -5" /></g>);
      break;
    case 'ONPREM_ID_PROVIDER':
      body = (<g {...g}><rect x="9" y="11" width="30" height="26" rx="2" /><circle cx="18" cy="21" r="4" /><path d="M12 32 c1-4 4-6 6-6 s5 2 6 6" /><line x1="28" y1="19" x2="34" y2="19" /><line x1="28" y1="25" x2="34" y2="25" /><line x1="28" y1="31" x2="32" y2="31" /></g>);
      break;
    default:
      body = (<g {...g}><rect x="10" y="10" width="28" height="28" rx="2" /></g>);
  }
  return (<svg viewBox="0 0 48 48" className="op-icon" aria-hidden="true">{body}</svg>);
}

// buildercards.aws/<slug> style URL like the physical cards
function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/^(amazon|aws)\s+/, '')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Deterministic pseudo-QR (decorative, matches the physical card footer feel)
function pseudoQR(seed: string, n = 13): boolean[] {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rand = () => { h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) cells.push(rand() > 0.52);
  const finder = (cx: number, cy: number) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const edge = x === 0 || x === 6 || y === 0 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      cells[(cy + y) * n + (cx + x)] = edge || core;
    }
  };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  return cells;
}

// Highlight bare numbers as orange mini badges like the physical card (②, ⑥)
function renderCombo(text: string) {
  return text.split(/(\d+)/g).map((part, i) =>
    /^\d+$/.test(part)
      ? <span key={i} className="mini-num">{part}</span>
      : <span key={i}>{part}</span>
  );
}

export default function BuilderCard({ card, small, onClick, disabled, glow }: Props) {
  const def = CARD_MAP[card.cardId];
  if (!def) return null;
  const isOnPrem = def.frameType === 'ON_PREM';
  // 온프렘은 플레이어 색상, AWS/WA는 아이콘 공식 배경색, 없으면 카테고리 매핑
  const theme = card.tone ?? def.iconBg ?? categoryColor(def.category);
  const w = small ? 187 : 235;
  const h = small ? 283 : 355;
  const qr = pseudoQR(card.cardId);
  const qn = 13;
  const locale = useLocale((s) => s.locale);
  const dispName = cardName(def, locale);
  // 실물 카드처럼 QR/URL 항시 표시 (온프렘은 buildercards.aws/migration, slug는 영문 고정)
  const cardUrl = isOnPrem ? 'https://buildercards.aws/migration' : `https://buildercards.aws/${slugify(EN_TEXT[def.cardId]?.name ?? def.name)}`;
  const [waImgOk, setWaImgOk] = useState(true);
  // 제목·카테고리 모두 실측 기반 축소 — 무조건 한 줄, 말줄임 없음
  // (WA 사진→템플릿 폴백처럼 뒤늦게 붙어도 extraDep 변화로 재측정)
  const titleFit = useFitFont(dispName, small ? 16 : 18, 7, !!small, 0, `${waImgOk}${locale}`);
  const ribbonFit = useFitFont(def.category.toLowerCase(), 9, 6, !!small, 13, `${waImgOk}${locale}`);
  const isWA = card.cardId === 'WA_1VP' || card.cardId === 'WA_3VP';
  // WA 카드는 실물 원본 스캔을 그대로 사용 (레이어 템플릿 아님)
  if (isWA && waImgOk) {
    return (
      <motion.div
        layout
        initial={{ y: 26, opacity: 0, rotateY: 90, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, rotateY: 0, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.9 }}
        whileHover={disabled ? undefined : { y: -8, scale: 1.04 }}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        onClick={disabled ? undefined : onClick}
        className={`bcard wa-photo ${disabled ? 'is-disabled' : ''} ${glow ? 'is-glow' : ''}`}
        style={{ width: w, height: h, cursor: onClick && !disabled ? 'pointer' : 'default' }}
      >
        <img
          src={card.cardId === 'WA_1VP' ? '/cards/wa-1vp.png' : '/cards/wa-3vp.png'}
          alt={dispName} draggable={false}
          onError={() => setWaImgOk(false)}
        />
      </motion.div>
    );
  }
  const themeSoft = mixWhite(theme, 0.45);
  const themeDeep = mixBlack(theme, 0.22);
  // 실물 카드: 온프렘 카테고리 글씨는 다크 슬레이트, 우상단 회색 S(Starter) 뱃지
  const ribbonColor = isOnPrem ? '#414D5C' : theme;
  return (
    <motion.div
      layout
      initial={{ y: 26, opacity: 0, rotateY: 90, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, rotateY: 0, scale: 1 }}
      exit={{ y: 20, opacity: 0, scale: 0.9 }}
      whileHover={disabled ? undefined : { y: -8, scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      onClick={disabled ? undefined : onClick}
      className={`bcard ${small ? 'sm' : 'lg'} ${disabled ? 'is-disabled' : ''} ${glow ? 'is-glow' : ''}`}
      style={{ width: w, height: h, ['--theme' as any]: theme, ['--theme-soft' as any]: themeSoft, cursor: onClick && !disabled ? 'pointer' : 'default' }}
    >
      <div className="bcard-head">
        <div className="bcard-title" ref={titleFit.ref} style={{ fontSize: titleFit.size }}>{dispName}</div>
        {def.frameType === 'ON_PREM'
          ? <div className="bcard-cost gray">S</div>
          : (def.cost > 0 && <div className="bcard-cost">{def.cost}</div>)}
      </div>
      <div className={`bcard-banner ${isOnPrem ? 'plain' : ''}`} style={{ background: theme }}>
        <div className="bcard-ribbon" ref={ribbonFit.ref} style={{ color: ribbonColor, borderColor: theme, fontSize: ribbonFit.size }}>{def.category}</div>
        {isOnPrem ? (
          <svg className="banner-arrows" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path d="M6 54 L24 20 L42 54" fill="none" stroke={themeDeep} strokeWidth="8" opacity="0.6" />
            <path d="M36 58 L62 10 L88 58" fill="none" stroke={themeDeep} strokeWidth="9" opacity="0.5" />
            <path d="M74 54 L90 26 L106 54" fill="none" stroke={themeDeep} strokeWidth="8" opacity="0.6" />
          </svg>
        ) : (
          <svg className="banner-clouds" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <g fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" transform="translate(2,12) scale(1.02)" strokeWidth="2" opacity="0.55" />
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" transform="translate(52,12) scale(1.32)" strokeWidth="1.6" opacity="0.38" />
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" transform="translate(28,32) scale(0.72)" strokeWidth="2.4" opacity="0.45" />
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" transform="translate(72,32) scale(0.84)" strokeWidth="2" opacity="0.4" />
            </g>
          </svg>
        )}
        <div className="bcard-frame-wrap">
          <div className={`bcard-frame ${isOnPrem ? 'bare' : ''}`}>
            {def.icon ? (
              <img src={def.icon} alt={dispName} draggable={false}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            ) : isOnPrem ? (
              <OnPremIcon cardId={card.cardId} />
            ) : (
              <span className="frame-emoji">🏆</span>
            )}
          </div>
        </div>
      </div>
      <div className="bcard-credit">
        <span className="chip">{def.baseCredits}</span>
        {def.victoryPoints ? <span className="vp">★{def.victoryPoints}VP</span> : null}
      </div>
      <div className="bcard-combo">
        {(def.combos ?? []).map((c, idx) => {
          if (idx >= 2) return null;
          const fx = effectFx(c);
          // 아이콘형 효과: 아이콘 + 조건 (데이터 기반, 번역표 무관)
          // 텍스트형 효과(WA 할인·CDK 회수): 번역 문구 그대로
          const body = fx.length > 0 ? (
            <span className="fx-line">
              {fx.map((f, j) => (
                f.kind === 'credit' ? <CreditIcon key={j} v={f.value} />
                : f.kind === 'draw' ? <DrawIcon key={j} v={f.value} />
                : <AdoptIcon key={j} v={f.value} />
              ))}
              {effectCond(c, locale) && <span className="fx-cond">{effectCond(c, locale)}</span>}
            </span>
          ) : renderCombo(comboDesc(def, idx, locale));
          return (
            <div key={idx}>
              {idx > 0 && <div className="combo-divider" />}
              <div className="combo-line">{body}</div>
            </div>
          );
        })}
        {(def.combos ?? []).length === 0 && (
          <div className="combo-line dim">
            {def.frameType === 'ON_PREM'
              ? (locale === 'ko' ? '크레딧 없음.' : 'No credits.')
              : renderCombo(cardDesc(def, locale) || (locale === 'ko' ? '콤보 없음 — 기본 크레딧.' : 'No combo — base credits.'))}
          </div>
        )}
      </div>
      <div className="bcard-foot">
        <a className="foot-qr-link" href={cardUrl} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()} title={`${cardUrl} (새 창)`}>
          <svg className="foot-qr" viewBox={`0 0 ${qn} ${qn}`} aria-hidden="true">
            {qr.map((on, i) => on ? (
              <rect key={i} x={i % qn} y={Math.floor(i / qn)} width={1} height={1} fill="#111" />
            ) : null)}
          </svg>
        </a>
        <div className="foot-text">
          <div className="foot-line"><b>{dispName}</b> - {cardDesc(def, locale)}</div>
          <div className="foot-url">◆ {cardUrl.replace('https://', '')}</div>
        </div>
      </div>
    </motion.div>
  );
}
