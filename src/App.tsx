import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGame } from './store/useGame';
import BuilderCard from './components/BuilderCard';
import { RulesModal, Tip } from './components/Rulebook';
import { CARD_MAP, cardName } from './game/cards';
import { calcBoard, scorePlayer, canRetire, handCounts } from './game/engine';
import type { CardInstance } from './game/engine';
import { botDraftPick } from './game/bot';
import { useLocale, tr, tLog, logIcon, playerNames } from './i18n';
import type { StrKey } from './i18n';
import './App.css';

// 매트식 뒷면/더미 프리뷰
function PileBack({ label, count }: { label: string; count: number }) {
  return (
    <div className="deck-box">
      <div className="pile">
        <div className="bcard-back pile-size">
          <div className="back-aws">AWS</div>
          <svg viewBox="0 0 60 24" className="back-smile" aria-hidden="true">
            <path d="M6 6 Q30 24 54 8" stroke="#FF9900" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M47 4 L55 8 L48 14" stroke="#FF9900" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="pile-count">{count}</div>
        </div>
      </div>
      <div className="pile-label">{label}</div>
    </div>
  );
}
function MiniBackRow({ n }: { n: number }) {
  return (
    <div className="backs">
      {Array.from({ length: Math.min(n, 8) }).map((_, i) => <div key={i} className="bcard-back mini" />)}
      {n > 8 && <span className="pill">+{n - 8}</span>}
    </div>
  );
}
function MiniCard({ card }: { card: CardInstance }) {
  return (
    <div className="mini-wrap">
      <div className="mini-scale"><BuilderCard small card={card} /></div>
    </div>
  );
}
// P0-3: 롱프레스(600ms)/우클릭 방지로 확대 모달, 클릭은 기존 동작 유지
function Zoomable({ card, onZoom, children }: { card: CardInstance; onZoom: (c: CardInstance) => void; children: ReactNode }) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const startXY = useRef<[number, number] | null>(null);
  const clear = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } startXY.current = null; };
  const start = (e: React.PointerEvent) => {
    fired.current = false;
    clear();
    startXY.current = [e.clientX, e.clientY];
    timer.current = window.setTimeout(() => { fired.current = true; onZoom(card); }, 600);
  };
  const move = (e: React.PointerEvent) => {
    if (!startXY.current) return;
    const dx = e.clientX - startXY.current[0];
    const dy = e.clientY - startXY.current[1];
    if (dx * dx + dy * dy > 100) clear(); // 10px 이상 움직이면 취소
  };
  return (
    <div
      className="zoomable"
      onPointerDown={start}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerMove={move}
      onContextMenu={(e) => e.preventDefault()}
      onClickCapture={(e) => { if (fired.current) { e.stopPropagation(); e.preventDefault(); fired.current = false; } }}
    >
      {children}
    </div>
  );
}
// 잠긴 슬롯용 ? 뱃지 + 사유 툴팁
function SlotWrap({ reason, children }: { reason: string | null; children: ReactNode }) {
  return (
    <span className="slot-wrap">
      {reason && (
        <span className="slot-tip">
          <Tip text={reason}><span className="why-badge">?</span></Tip>
        </span>
      )}
      {children}
    </span>
  );
}

export default function App() {
  const g = useGame((s) => s.g);
  const start = useGame((s) => s.start);
  const draftPick = useGame((s) => s.draftPick);
  const playCard = useGame((s) => s.playCard);
  const playAll = useGame((s) => s.playAll);
  const retire = useGame((s) => s.retire);
  const skipRetire = useGame((s) => s.skipRetire);
  const buyFree = useGame((s) => s.buyFree);
  const buyCost = useGame((s) => s.buyCost);
  const buyWA = useGame((s) => s.buyWA);
  const buyBlind = useGame((s) => s.buyBlind);
  const cdkRecover = useGame((s) => s.cdkRecover);
  const endTurn = useGame((s) => s.endTurn);
  const botStep = useGame((s) => s.botStep);
  const cdkMode = useGame((s) => s.cdkMode);

  const [retireMode, setRetireMode] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [zoom, setZoom] = useState<CardInstance | null>(null);
  // P0-7: 봇 턴 제어
  const [botPaused, setBotPaused] = useState(false);
  const [botFast, setBotFast] = useState(false);

  // P0-3: Esc로 확대 닫기
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);
  const prevWA = useRef(g.waStack.length);
  // P0-6: 모션 감소 선호 시 confetti 중단
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const me = g.players[g.current];
  const human = g.players[0];
  const board = useMemo(() => calcBoard(me?.played ?? []), [me]);
  const humanBoard = useMemo(() => calcBoard(human?.played ?? []), [human]);

  useEffect(() => { const [n0, n1] = playerNames(useLocale.getState().locale); start([false, true], [n0, n1]); }, [start]);

  // ?demo=board: 스크린샷용 오토파일럿 (드래프트 픽 + 전체 내기 1회, 이후 정지)
  const demoDone = useRef(false);
  useEffect(() => {
    if (!window.location.search.includes('demo=board') || demoDone.current) return;
    if (g.phase === 'DRAFT' && !me?.isBot) {
      const t = setTimeout(() => {
        const first = g.consoleFree[0]?.cardId;
        if (first) draftPick(first);
      }, 600);
      return () => clearTimeout(t);
    }
    if (g.phase === 'PLAY' && !g.gameOver && !me?.isBot && me.hand.length > 0 && me.played.length === 0) {
      const t = setTimeout(() => { playAll(); demoDone.current = true; }, 600);
      return () => clearTimeout(t);
    }
  }, [g, me, draftPick, playAll]);

  // Bot draft automation
  useEffect(() => {
    if (g.phase === 'DRAFT' && me?.isBot) {
      if (botPaused) return;
      const t = setTimeout(() => {
        const pick = botDraftPick(g as any, g.current);
        if (pick) draftPick(pick);
      }, botFast ? 250 : 700);
      return () => clearTimeout(t);
    }
  }, [g, me, draftPick, botPaused, botFast]);

  // Bot turn automation
  useEffect(() => {
    if (g.phase === 'PLAY' && !g.gameOver && me?.isBot) {
      if (botPaused) return;
      const t = setTimeout(() => botStep(), botFast ? 350 : 1400);
      return () => clearTimeout(t);
    }
  }, [g, me, botStep, botPaused, botFast]);

  // WA confetti
  useEffect(() => {
    if (g.waStack.length < prevWA.current && !reducedMotion) {
      confetti({ particleCount: 160, spread: 75, origin: { y: 0.3 }, colors: ['#FF9900', '#FFD700', '#ffffff'] });
    }
    prevWA.current = g.waStack.length;
  }, [g.waStack.length, reducedMotion]);

  // Combo confetti (poker win feel, no gambling)
  useEffect(() => {
    if (g.lastEvents?.length >= 2 && !reducedMotion) {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 }, scalar: 0.9 });
    }
  }, [g.lastEvents, reducedMotion]);

  const retireOk = me && !me.isBot && !me.retiredThisTurn && canRetire(me);
  const hc = me ? handCounts(me) : { builder: 0, onprem: 0 };
  const mustAdopt = !!me && !me.isBot && me.retiredThisTurn;
  const bot = g.players.find((p) => p.isBot) ?? g.players[1];
  const topWA = g.waStack[0];
  const locale = useLocale((s) => s.locale);
  const toggleLocale = useLocale((s) => s.toggle);
  const t = (k: StrKey, v?: Record<string, string | number>) => tr(locale, k, v);
  const cardNameOf = (id: string) => { const d = CARD_MAP[id]; return d ? cardName(d, locale) : id; };
  // P0-1: 턴 스테퍼 상태 (폐기→건축→도입→정리)
  const adoptUsed = (me as any)?._adoptUsed ?? 0;
  const stepStates = g.phase === 'PLAY' && !g.gameOver ? [
    {
      label: t('step0'),
      state: (me?.retiredThisTurn || (me as any)?._retireDone || (me?.played.length ?? 0) > 0)
        ? 'done' : (me && canRetire(me) ? 'active' : 'todo'),
      tip: t('stepTip0'),
    },
    {
      label: t('step1'),
      state: (me?.played.length ?? 0) > 0 ? 'done' : (!me || canRetire(me) ? 'todo' : 'active'),
      tip: t('stepTip1'),
    },
    {
      label: t('step2'),
      state: adoptUsed > 0 ? 'done' : ((me?.played.length ?? 0) > 0 ? 'active' : 'todo'),
      tip: t('stepTip2'),
    },
    {
      label: t('step3'),
      state: (me?.adoptsLeft ?? 1) <= 0 ? 'active' : 'todo',
      tip: t('stepTip3'),
    },
  ] : [];
  // 비활성 회색 처리 대신 사유 표시: null이면 구매 가능
  const lockReason = (cost: number): string | null => {
    if (g.phase !== 'PLAY' || g.gameOver) return t('lockPrep');
    if (me?.isBot) return t('lockBot');
    if ((me?.adoptsLeft ?? 0) <= 0) return t('lockAdopts');
    if ((me?.credits ?? 0) < cost) return t('lockCredits', { have: me?.credits ?? 0, need: cost });
    return null;
  };
  const restart = () => { const [n0, n1] = playerNames(locale); start([false, true], [n0, n1]); };

  return (
    <div className="table">
      <header className="hud">
        <div className="brand">☁️ <b>AWS {locale === 'ko' ? '빌더카드' : 'BuilderCards'}</b> <span className="ed">{locale === 'ko' ? '2판 · PVE' : '2nd Ed · PVE'}</span></div>
        <div className="hud-stats">
          <span className="pill">{locale === 'ko' ? `${g.turnNumber}턴` : `Turn ${g.turnNumber}`} · <span className="tone-dot" style={{ background: me?.tone }} />{me?.name} {me?.isBot ? '🤖' : ''}</span>
          <Tip text={t('tipCredits')}><span className="pill gold">⚡ {me?.credits ?? 0}</span></Tip>
          <Tip text={t('tipAdopts')}><span className="pill blue">{locale === 'ko' ? `도입 ${me?.adoptsLeft ?? 0}` : `Adopt ${me?.adoptsLeft ?? 0}`}</span></Tip>
          <Tip text={t('tipWa')}><span className="pill vp">🏆 WA {g.waStack.length}</span></Tip>
        </div>
        <div className="hud-actions">
          <button className="btn primary" onClick={() => setShowRules(true)}>{t('nav_rules')}</button>
          <button className="btn ghost" onClick={() => { window.location.hash = '#introduce'; }}>{t('nav_intro')}</button>
          <button className="btn ghost" onClick={() => { window.location.hash = '#observer'; }}>{t('nav_observer')}</button>
          <button className="btn ghost" onClick={toggleLocale}>{t('nav_locale')}</button>
          <button className="btn ghost" onClick={() => setShowHelp((v) => !v)}>{showHelp ? t('nav_guide_hide') : t('nav_guide_show')}</button>
          <button className="btn ghost" onClick={restart}>{t('nav_restart')}</button>
        </div>
      </header>

      {showHelp && (
        <div className="guide">
          {locale === 'ko' ? (
            <><b>공식 룰 (rules_2024 PDF · 퀵레퍼런스 A5):</b> ① <b>폐기 (턴 시작·시작핸드 5장 한정)</b> — 핸드에 빌더(AWS)가 온프렘보다 많으면(3vs2·4vs1) 핸드에서 온프렘 1장 영구 제거, 제거했으면 이번 턴 도입 ≥1 필수 → ② 건축 (아키텍처·⚡콤보) → ③ 도입 (턴당 1장) → ④ 정리 (5장 뽑기). <b>EC2 x2=5⚡, x3=10⚡+1도입</b> · 마지막 WA 즉시 종료.</>
          ) : (
            <><b>Official rules (rules_2024 PDF · Quick Reference A5):</b> ① <b>Retire (turn start, starting 5-card hand only)</b> — hand Builder (AWS) more than On-Prem (3vs2, 4vs1) → exile 1 On-Prem from hand, then adopt ≥1 this turn → ② Build (architectures · ⚡combos) → ③ Adopt (1/turn) → ④ Cleanup (draw 5). <b>EC2 x2=5⚡, x3=10⚡+1 adoption</b> · ends on last WA.</>
          )}
        </div>
      )}

      {g.phase === 'DRAFT' && (
        <div className="overlay">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel">
            <h2>{t('draftTitle')}</h2>
            <p>{me?.name} {me?.isBot ? t('draftBot') : t('draftHuman')} · {me?.draftPicks}/2 {t('draftPicked')}</p>
            {!me?.isBot && (
              <div className="market">
                {g.consoleFree.map((p) => (
                  <button key={p.cardId} className="market-pile" onClick={() => draftPick(p.cardId)}>
                    <BuilderCard small card={{ uid: p.cardId, cardId: p.cardId }} />
                    <span className="count">x{p.count} · {t('free')}</span>
                  </button>
                ))}
              </div>
            )}
            {me?.isBot && (
              <>
                <div className="thinking">{t('drafting')}</div>
                <div className="controls bot-controls">
                  <button className="btn ghost" onClick={() => setBotPaused((v) => !v)}>{botPaused ? t('resume') : t('pause')}</button>
                  <button className={`btn ghost${botFast ? ' toggled' : ''}`} onClick={() => setBotFast((v) => !v)}>{botFast ? t('fastOn') : t('fastOff')}</button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Console market — 매트식: 덱 → 슬롯 즉시 리필 */}
      <section className={`console ${mustAdopt && adoptUsed === 0 ? 'need-adopt' : ''}`}>
        <div className="console-title">🖥️ AWS {locale === 'ko' ? '콘솔' : 'Console'} <span>{t('consoleSub')}</span></div>
        <div className="decks">
          <Tip text={t('tipBlind')}>
          <button
            className={`market-pile ${!lockReason(0) && g.freeDeck.length > 0 ? 'afford' : 'locked'}`}
            onClick={buyBlind}>
            <SlotWrap reason={g.freeDeck.length === 0 ? t('lockEmptyFree') : lockReason(0)}>
            <PileBack label={t('blindDeck', { n: g.freeDeck.length })} count={g.freeDeck.length} />
            </SlotWrap>
            <span className="deck-cap">{t('blindCap')}</span>
          </button>
          </Tip>
          <Tip text={t('tipPaidDeck')}>
          <div><PileBack label={t('paidDeck', { n: g.costDeck.length })} count={g.costDeck.length} /></div>
          </Tip>
          <Tip text={t('tipWaDeck')}>
          <button
            className={`market-pile ${!lockReason(topWA === 'WA_1VP' ? board.wa1Cost : board.wa3Cost) ? 'afford' : 'locked'}`}
            onClick={buyWA}>
            <SlotWrap reason={!topWA ? t('lockWaEmpty') : lockReason(topWA === 'WA_1VP' ? board.wa1Cost : board.wa3Cost)}>
            <div className="deck-box">
              {topWA
                ? <Zoomable card={{ uid: 'wa-deck', cardId: topWA }} onZoom={setZoom}><MiniCard card={{ uid: 'wa-deck', cardId: topWA }} /></Zoomable>
                : <div className="pile-empty">{t('waSoldOut')}</div>}
              <div className="pile-label">{t('waPile', { n: g.waStack.length })}</div>
            </div>
            </SlotWrap>
            <span className="deck-cap">{topWA ? t('waCost', { c: topWA === 'WA_1VP' ? board.wa1Cost : board.wa3Cost, b: topWA === 'WA_1VP' ? 4 : 8 }) : t('waSoldOut')}</span>
          </button>
          </Tip>
        </div>
        <div className="refill-line">{t('refillLine')}</div>
        <div className="market">
            {g.consoleFree.map((p) => {
              const def = CARD_MAP[p.cardId];
              const reason = lockReason(def.cost);
              return (
                <SlotWrap key={p.cardId} reason={reason}>
                <motion.button layout className={`market-pile ${!reason ? 'afford' : 'locked'}`}
                  onClick={() => buyFree(p.cardId)} aria-disabled={!!reason}>
                  <Zoomable card={{ uid: p.cardId, cardId: p.cardId }} onZoom={setZoom}>
                  <BuilderCard small card={{ uid: p.cardId, cardId: p.cardId }} />
                  </Zoomable>
                  <span className="count">x{p.count} · {def.cost === 0 ? t('free') : t('paidFmt', { c: def.cost })}</span>
                </motion.button>
                </SlotWrap>
              );
            })}
          {g.consoleCost && (() => {
            const costDef = CARD_MAP[g.consoleCost.cardId];
            const costReason = lockReason(costDef.cost);
            return (
              <SlotWrap reason={costReason}>
              <button className={`market-pile paid ${!costReason ? 'afford' : 'locked'}`} onClick={buyCost} aria-disabled={!!costReason}>
                <Zoomable card={{ uid: 'cost', cardId: g.consoleCost.cardId }} onZoom={setZoom}>
                <BuilderCard small card={{ uid: 'cost', cardId: g.consoleCost.cardId }} />
                </Zoomable>
                <span className="count">{t('paidFmt', { c: costDef.cost })}</span>
              </button>
              </SlotWrap>
            );
          })()}
          <Tip text={t('tipExp')}>
          <div className="slot-empty" aria-disabled="true">
            <div>{t('expSlot')}</div>
            <div className="slot-sub">{t('expSub')}</div>
          </div>
          </Tip>
        </div>
      </section>

      {/* Combo feed — poker tension */}
      <AnimatePresence>
        {g.lastEvents?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="combo-feed">
            {g.lastEvents.map((e, i) => <span key={i} className="combo-chip">✦ {locale === 'ko' ? e.text : (e.en ?? e.text)}</span>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* P0-1: 턴 스테퍼 */}
      {stepStates.length > 0 && (
        <div className="stepper" role="list" aria-label={locale === 'ko' ? '턴 단계' : 'Turn phases'}>
          {stepStates.map((s, i) => (
            <Fragment key={s.label}>
              {i > 0 && <span className="step-arrow">→</span>}
              <Tip text={s.tip}>
                <span role="listitem" className={`step ${s.state}`}>{s.state === 'done' ? '✓ ' : ''}{i + 1}. {s.label}</span>
              </Tip>
            </Fragment>
          ))}
        </div>
      )}

      {/* Architecture area — 매트 중앙 */}
      <section className="zone arch">
        <div className="zone-title">{t('archOf', { name: me?.name ?? '' })} <span className="ed">Architecture Building Area</span> — <b>{board.credits}⚡</b> · {t('adoptsU')} {board.adopts} · {t('drawsU')} {board.draws}
          {board.wa1Cost < 4 && <span className="disc">{t('waDisc')}</span>}
        </div>
        <div className="cards">
          <AnimatePresence>
            {(me?.played ?? []).map((c) => (
              <Zoomable key={c.uid} card={c} onZoom={setZoom}>
              <BuilderCard small card={c} />
              </Zoomable>
            ))}
          </AnimatePresence>
          {(me?.played ?? []).length === 0 && <div className="empty arch-empty">{t('archEmpty')}</div>}
        </div>
      </section>

      {/* Players — 매트식 양옆 플레이어 구역 */}
      <div className="players">
      {/* Human hand */}
      {!me?.isBot && g.phase === 'PLAY' && !g.gameOver && (
        <section className="zone hand pzone">
          <div className="zone-title">{t('handOf', { n: human.hand.length })} · {t('bvb', { a: human.hand.filter((c) => CARD_MAP[c.cardId]?.frameType === 'AWS_SERVICE').length, b: human.hand.filter((c) => CARD_MAP[c.cardId]?.frameType === 'ON_PREM').length })}</div>
          <div className="cards fan">
            {human.hand.map((c) => (
              <Zoomable key={c.uid} card={c} onZoom={setZoom}>
              <BuilderCard small card={c}
                glow={retireMode && CARD_MAP[c.cardId]?.frameType === 'ON_PREM'}
                onClick={() => {
                  if (retireMode && CARD_MAP[c.cardId]?.frameType === 'ON_PREM') { retire(c.uid); setRetireMode(false); }
                  else if (!retireMode) playCard(c.uid);
                }} />
              </Zoomable>
            ))}
          </div>
          <div className="hint">{t('calcPre')}{humanBoard.events.length}{t('calcMid')}<b>{human.credits}{t('calcUse')}</b>{t('calcLeft')}{human.adoptsLeft}</div>
          <div className="piles">
            <PileBack label={t('resDeck', { n: human.resourceDeck.length })} count={human.resourceDeck.length} />
            <div className="deck-box">
              {human.discard.length
                ? <Zoomable card={human.discard[human.discard.length - 1]} onZoom={setZoom}><MiniCard card={human.discard[human.discard.length - 1]} /></Zoomable>
                : <div className="pile-empty">{t('pileEmpty')}</div>}
              <div className="pile-label">{t('disPile', { n: human.discard.length })}</div>
            </div>
            <div className="deck-box">
              <div className="pile-empty">{t('retiredCount', { n: human.retired.length })}</div>
              <div className="pile-label">{t('retiredPile')}</div>
            </div>
          </div>
        </section>
      )}
        <section className="zone pzone">
          <div className="zone-title"><span className="tone-dot" style={{ background: bot?.tone }} />{t('botHand', { name: bot?.name ?? '', n: bot?.hand.length ?? 0 })}</div>
          {me?.isBot && g.phase === 'PLAY' && !g.gameOver && (
            <>
              <div className="thinking">{t('botThinking', { name: me.name })}</div>
              {!botPaused && <div className="bot-progress" aria-hidden="true"><div className="bar" /></div>}
              <div className="controls bot-controls">
                <button className="btn ghost" onClick={() => setBotPaused((v) => !v)}>{botPaused ? t('resume') : t('pause')}</button>
                <button className={`btn ghost${botFast ? ' toggled' : ''}`} onClick={() => setBotFast((v) => !v)}>{botFast ? t('fastOn') : t('fastOff')}</button>
                <button className="btn ghost" onClick={() => botStep()}>{t('stepNow')}</button>
              </div>
            </>
          )}
          <MiniBackRow n={bot?.hand.length ?? 0} />
          <div className="piles">
            <PileBack label={t('resDeck', { n: bot?.resourceDeck.length ?? 0 })} count={bot?.resourceDeck.length ?? 0} />
            <div className="deck-box">
              {(bot?.discard.length ?? 0) > 0
                ? <Zoomable card={bot!.discard[bot!.discard.length - 1]} onZoom={setZoom}><MiniCard card={bot!.discard[bot!.discard.length - 1]} /></Zoomable>
                : <div className="pile-empty">{t('pileEmpty')}</div>}
              <div className="pile-label">{t('disPile', { n: bot?.discard.length ?? 0 })}</div>
            </div>
            <div className="deck-box">
              <div className="pile-empty">{t('retiredCount', { n: bot?.retired.length ?? 0 })}</div>
              <div className="pile-label">{t('retiredPile')}</div>
            </div>
          </div>
          <div className="hint">{t('vpAbout', { v: scorePlayer(bot ?? g.players[0]).vp, a: scorePlayer(bot ?? g.players[0]).awsCount })}</div>
        </section>
      </div>

      {/* P0-1: 하단 고정 액션바 */}
      {!me?.isBot && g.phase === 'PLAY' && !g.gameOver && (
        <div className="actionbar">
          <Tip text={t('tipPlayAll')}><button className="btn primary" onClick={playAll}>{t('playAll')}</button></Tip>
          {retireOk && !retireMode && <Tip text={t('tipRetire')}><button className="btn warn" onClick={() => setRetireMode(true)}>{t('retireBtn', { a: hc.builder, b: hc.onprem })}</button></Tip>}
          {retireMode && <span className="pill">{t('retirePick')}</span>}
          {retireMode && <button className="btn ghost" onClick={() => { setRetireMode(false); skipRetire(); }}>{t('skipRetire')}</button>}
          {mustAdopt && adoptUsed === 0
            ? <Tip text={t('mustAdopt')}><button className="btn gold locked" aria-disabled="true" onClick={endTurn}>{t('endTurnNeed')}</button></Tip>
            : <Tip text={t('tipEnd')}><button className="btn gold" onClick={endTurn}>{t('endTurn')}</button></Tip>}
        </div>
      )}

      {/* P0-4: 구조화 로그 */}
      <section className="log">
        {[...g.log].slice(-30).reverse().map((l, i) => {
          const hot = l.key === 'adoptWA' || l.key === 'gameOver';
          return <div key={i} className={hot ? 'log-hot' : ''}>{logIcon(l.key)} {tLog(l, locale, cardNameOf)}</div>;
        })}
      </section>

      {/* CDK modal */}
      {cdkMode && (
        <div className="overlay">
          <div className="panel">
            <h3>{t('cdkTitle')}</h3>
            <div className="cards">
              {human.discard.map((c) => (
                <Zoomable key={c.uid} card={c} onZoom={setZoom}>
                <BuilderCard small card={c} onClick={() => cdkRecover(c.uid)} />
                </Zoomable>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* P0-3: 카드 확대 */}
      {zoom && (
        <div className="overlay" onClick={() => setZoom(null)}>
          <div className="zoom-panel" onClick={(e) => e.stopPropagation()}>
            <BuilderCard card={zoom} />
            <div className="zoom-cap">{cardNameOf(zoom.cardId)}{t('zoomCap')}</div>
            <button className="btn ghost" onClick={() => setZoom(null)}>{t('close')}</button>
          </div>
        </div>
      )}

      {/* Game over */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {g.gameOver && (
        <div className="overlay">
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel big">
            <h1>{t('overTitle')}</h1>
            {g.players.map((p) => {
              const s = scorePlayer(p);
              const win = p.id === g.winnerId;
              return <div key={p.id} className={`score ${win ? 'win' : ''}`}>{win ? '👑 ' : ''}{t('overScore', { name: p.name, v: s.vp, a: s.awsCount, win: win ? t('overWin') : '' })}</div>;
            })}
            <button className="btn primary" onClick={restart}>{t('playAgain')}</button>
            <p className="pvpn">{t('pvpn')}</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
