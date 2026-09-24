import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGame } from './store/useGame';
import BuilderCard from './components/BuilderCard';
import { RulesModal, Tip } from './components/Rulebook';
import { CARD_MAP } from './game/cards';
import { calcBoard, scorePlayer, canRetire, handCounts } from './game/engine';
import type { CardInstance } from './game/engine';
import { botDraftPick } from './game/bot';
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

  useEffect(() => { start([false, true]); }, [start]);

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
  // P0-1: 턴 스테퍼 상태 (폐기→건축→도입→정리)
  const adoptUsed = (me as any)?._adoptUsed ?? 0;
  const stepStates = g.phase === 'PLAY' && !g.gameOver ? [
    {
      label: '폐기',
      state: (me?.retiredThisTurn || (me as any)?._retireDone || (me?.played.length ?? 0) > 0)
        ? 'done' : (me && canRetire(me) ? 'active' : 'todo'),
      tip: '턴 시작·시작핸드 한정. 빌더 > 온프렘이면 핸드에서 1장 제거',
    },
    {
      label: '건축',
      state: (me?.played.length ?? 0) > 0 ? 'done' : (!me || canRetire(me) ? 'todo' : 'active'),
      tip: '핸드에서 카드를 내어 아키텍처 구성·콤보 발동',
    },
    {
      label: '도입',
      state: adoptUsed > 0 ? 'done' : ((me?.played.length ?? 0) > 0 ? 'active' : 'todo'),
      tip: '턴당 1회. ⚡를 내고 콘솔·WA·블라인드에서 가져옴',
    },
    {
      label: '정리',
      state: (me?.adoptsLeft ?? 1) <= 0 ? 'active' : 'todo',
      tip: '낸 카드 + 남은 핸드를 버리고 5장 뽑기',
    },
  ] : [];
  // 비활성 회색 처리 대신 사유 표시: null이면 구매 가능
  const lockReason = (cost: number): string | null => {
    if (g.phase !== 'PLAY' || g.gameOver) return '게임 준비 중에는 구매할 수 없습니다.';
    if (me?.isBot) return '봇 턴에는 구매할 수 없습니다.';
    if ((me?.adoptsLeft ?? 0) <= 0) return '도입 횟수를 다 썼습니다 (콤보로 추가 가능).';
    if ((me?.credits ?? 0) < cost) return `크레딧 부족 — 보유 ${me?.credits ?? 0}⚡ / 필요 ${cost}⚡.`;
    return null;
  };

  return (
    <div className="table">
      <header className="hud">
        <div className="brand">☁️ <b>AWS 빌더카드</b> <span className="ed">2판 · PVE</span></div>
        <div className="hud-stats">
          <span className="pill">{g.turnNumber}턴 · <span className="tone-dot" style={{ background: me?.tone }} />{me?.name} {me?.isBot ? '🤖' : ''}</span>
          <Tip text="아키텍처의 기본 크레딧 + 콤보 보너스 합계. 카드 도입 때 지불에 사용합니다."><span className="pill gold">⚡ {me?.credits ?? 0}</span></Tip>
          <Tip text="이번 턴 남은 도입 횟수. 기본 1회, 콤보(EC2 x3·CFM 등)로 추가됩니다."><span className="pill blue">도입 {me?.adoptsLeft ?? 0}</span></Tip>
          <Tip text="콘솔에 남은 WA 카드 수. 마지막 1장이 팔리면 즉시 게임 종료·VP 합산."><span className="pill vp">🏆 WA {g.waStack.length}</span></Tip>
        </div>
        <div className="hud-actions">
          <button className="btn primary" onClick={() => setShowRules(true)}>📖 핵심 룰</button>
          <button className="btn ghost" onClick={() => { window.location.hash = '#introduce'; }}>🏠 소개</button>
          <button className="btn ghost" onClick={() => { window.location.hash = '#observer'; }}>👁 관전</button>
          <button className="btn ghost" onClick={() => setShowHelp((v) => !v)}>{showHelp ? '가이드 숨기기' : '가이드 보기'}</button>
          <button className="btn ghost" onClick={() => start([false, true])}>다시 시작</button>
        </div>
      </header>

      {showHelp && (
        <div className="guide">
          <b>공식 룰 (rules_2024 PDF · 퀵레퍼런스 A5):</b> ① <b>폐기 (턴 시작·시작핸드 5장 한정)</b> — 핸드에 빌더(AWS)가 온프렘보다 많으면(3vs2·4vs1) 핸드에서 온프렘 1장 영구 제거, 제거했으면 이번 턴 도입 ≥1 필수 → ② 건축 (아키텍처·⚡콤보) → ③ 도입 (턴당 1장) → ④ 정리 (5장 뽑기). <b>EC2 x2=5⚡, x3=10⚡+1도입</b> · 마지막 WA 즉시 종료.
        </div>
      )}

      {g.phase === 'DRAFT' && (
        <div className="overlay">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel">
            <h2>☁️ 클라우드 도입 페이즈 — 무료 2장 선택</h2>
            <p>{me?.name} {me?.isBot ? '(봇 생각 중…)' : '무료 AWS 카드 2장을 골라 버린 더미로'} · 선택 {me?.draftPicks}/2</p>
            {!me?.isBot && (
              <div className="market">
                {g.consoleFree.map((p) => (
                  <button key={p.cardId} className="market-pile" onClick={() => draftPick(p.cardId)}>
                    <BuilderCard small card={{ uid: p.cardId, cardId: p.cardId }} />
                    <span className="count">x{p.count} · 무료</span>
                  </button>
                ))}
              </div>
            )}
            {me?.isBot && (
              <>
                <div className="thinking">🤖 드래프트 중…</div>
                <div className="controls bot-controls">
                  <button className="btn ghost" onClick={() => setBotPaused((v) => !v)}>{botPaused ? '▶ 계속하기' : '⏸ 일시정지'}</button>
                  <button className={`btn ghost${botFast ? ' toggled' : ''}`} onClick={() => setBotFast((v) => !v)}>⏩ 빨리넘기기 {botFast ? 'ON' : 'OFF'}</button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Console market — 매트식: 덱 → 슬롯 즉시 리필 */}
      <section className={`console ${mustAdopt && adoptUsed === 0 ? 'need-adopt' : ''}`}>
        <div className="console-title">🖥️ AWS 콘솔 <span>— 공식 동일: 무료 4 + 유료 1 (+ 확장팩용 1슬롯 비움)</span></div>
        <div className="decks">
          <Tip text="무료 덱(뒷면). 슬롯에서 사면 여기서 즉시 리필됩니다. 클릭하면 블라인드로 1장 가져옵니다(도입 1회 소모).">
          <button
            className={`market-pile ${!lockReason(0) && g.freeDeck.length > 0 ? 'afford' : 'locked'}`}
            onClick={buyBlind}>
            <SlotWrap reason={g.freeDeck.length === 0 ? '무료 덱이 비었습니다.' : lockReason(0)}>
            <PileBack label={`무료 덱 ${g.freeDeck.length}장`} count={g.freeDeck.length} />
            </SlotWrap>
            <span className="deck-cap">🎲 블라인드 (도입 1회)</span>
          </button>
          </Tip>
          <Tip text="유료 덱(뒷면). 유료 슬롯에서 사면 여기서 즉시 리필됩니다."><div><PileBack label={`유료 덱 ${g.costDeck.length}장`} count={g.costDeck.length} /></div></Tip>
          <Tip text="WA는 맨 위부터 순서대로(1VP 먼저). Well-Architected Tool을 냈으면 할인 가격이 표시됩니다.">
          <button
            className={`market-pile ${!lockReason(topWA === 'WA_1VP' ? board.wa1Cost : board.wa3Cost) ? 'afford' : 'locked'}`}
            onClick={buyWA}>
            <SlotWrap reason={!topWA ? 'WA 더미가 비었습니다.' : lockReason(topWA === 'WA_1VP' ? board.wa1Cost : board.wa3Cost)}>
            <div className="deck-box">
              {topWA
                ? <Zoomable card={{ uid: 'wa-deck', cardId: topWA }} onZoom={setZoom}><MiniCard card={{ uid: 'wa-deck', cardId: topWA }} /></Zoomable>
                : <div className="pile-empty">WA 매진</div>}
              <div className="pile-label">WA 더미 {g.waStack.length}장</div>
            </div>
            </SlotWrap>
            <span className="deck-cap">{topWA ? `비용 ${topWA === 'WA_1VP' ? board.wa1Cost : board.wa3Cost}⚡ (기본 ${topWA === 'WA_1VP' ? 4 : 8})` : '매진'}</span>
          </button>
          </Tip>
        </div>
        <div className="refill-line">▼ 구매 즉시 리필됨 ▼</div>
        <div className="market">
          <AnimatePresence>
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
                  <span className="count">x{p.count} · {def.cost === 0 ? '무료' : `$${def.cost}⚡`}</span>
                </motion.button>
                </SlotWrap>
              );
            })}
          </AnimatePresence>
          {g.consoleCost && (() => {
            const costDef = CARD_MAP[g.consoleCost.cardId];
            const costReason = lockReason(costDef.cost);
            return (
              <SlotWrap reason={costReason}>
              <button className={`market-pile paid ${!costReason ? 'afford' : 'locked'}`} onClick={buyCost} aria-disabled={!!costReason}>
                <Zoomable card={{ uid: 'cost', cardId: g.consoleCost.cardId }} onZoom={setZoom}>
                <BuilderCard small card={{ uid: 'cost', cardId: g.consoleCost.cardId }} />
                </Zoomable>
                <span className="count">유료 ${costDef.cost}⚡</span>
              </button>
              </SlotWrap>
            );
          })()}
          <Tip text="매트 공식: 기본 룰에서는 비워두는 슬롯. add-on·확장팩을 쓸 때만 사용합니다.">
          <div className="slot-empty" aria-disabled="true">
            <div>확장팩용 슬롯</div>
            <div className="slot-sub">기본 룰에서 비움</div>
          </div>
          </Tip>
        </div>
      </section>

      {/* Combo feed — poker tension */}
      <AnimatePresence>
        {g.lastEvents?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="combo-feed">
            {g.lastEvents.map((e, i) => <span key={i} className="combo-chip">✦ {e.text}</span>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* P0-1: 턴 스테퍼 */}
      {stepStates.length > 0 && (
        <div className="stepper" role="list" aria-label="턴 단계">
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
        <div className="zone-title">🏗️ {me?.name} 아키텍처 <span className="ed">Architecture Building Area</span> — <b>{board.credits}⚡</b> · 도입 {board.adopts} · 뽑기 {board.draws}
          {board.wa1Cost < 4 && <span className="disc"> · WA 할인 적용!</span>}
        </div>
        <div className="cards">
          <AnimatePresence>
            {(me?.played ?? []).map((c) => (
              <Zoomable key={c.uid} card={c} onZoom={setZoom}>
              <BuilderCard small card={c} />
              </Zoomable>
            ))}
          </AnimatePresence>
          {(me?.played ?? []).length === 0 && <div className="empty arch-empty">폐기(해당 시) → 핸드에서 카드를 내어 아키텍처 구성 ⬇ (또는 전체 내기로 콤보 극대화)</div>}
        </div>
      </section>

      {/* Players — 매트식 양옆 플레이어 구역 */}
      <div className="players">
      {/* Human hand */}
      {!me?.isBot && g.phase === 'PLAY' && !g.gameOver && (
        <section className="zone hand pzone">
          <div className="zone-title">🃏 내 핸드 ({human.hand.length}) · 빌더 {human.hand.filter((c) => CARD_MAP[c.cardId]?.frameType === 'AWS_SERVICE').length} vs 온프렘 {human.hand.filter((c) => CARD_MAP[c.cardId]?.frameType === 'ON_PREM').length}</div>
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
          <div className="hint">실시간 계산: 기본 + EC2 스택 + {humanBoard.events.length}개 콤보 = <b>{human.credits}⚡ 사용 가능</b> · 남은 도입 {human.adoptsLeft}</div>
          <div className="piles">
            <PileBack label={`자원 덱 ${human.resourceDeck.length}장`} count={human.resourceDeck.length} />
            <div className="deck-box">
              {human.discard.length
                ? <Zoomable card={human.discard[human.discard.length - 1]} onZoom={setZoom}><MiniCard card={human.discard[human.discard.length - 1]} /></Zoomable>
                : <div className="pile-empty">비었음</div>}
              <div className="pile-label">버린 더미 {human.discard.length}장</div>
            </div>
            <div className="deck-box">
              <div className="pile-empty">♻ {human.retired.length}장</div>
              <div className="pile-label">제거됨</div>
            </div>
          </div>
        </section>
      )}
        <section className="zone pzone">
          <div className="zone-title"><span className="tone-dot" style={{ background: bot?.tone }} />🤖 {bot?.name} · 핸드 {bot?.hand.length}장</div>
          {me?.isBot && g.phase === 'PLAY' && !g.gameOver && (
            <>
              <div className="thinking">🤖 {me.name} 아키텍처 구성 중…</div>
              {!botPaused && <div className="bot-progress" aria-hidden="true"><div className="bar" /></div>}
              <div className="controls bot-controls">
                <button className="btn ghost" onClick={() => setBotPaused((v) => !v)}>{botPaused ? '▶ 계속하기' : '⏸ 일시정지'}</button>
                <button className={`btn ghost${botFast ? ' toggled' : ''}`} onClick={() => setBotFast((v) => !v)}>⏩ 빨리넘기기 {botFast ? 'ON' : 'OFF'}</button>
                <button className="btn ghost" onClick={() => botStep()}>⏭ 지금 넘기기</button>
              </div>
            </>
          )}
          <MiniBackRow n={bot?.hand.length ?? 0} />
          <div className="piles">
            <PileBack label={`자원 덱 ${bot?.resourceDeck.length ?? 0}장`} count={bot?.resourceDeck.length ?? 0} />
            <div className="deck-box">
              {(bot?.discard.length ?? 0) > 0
                ? <Zoomable card={bot!.discard[bot!.discard.length - 1]} onZoom={setZoom}><MiniCard card={bot!.discard[bot!.discard.length - 1]} /></Zoomable>
                : <div className="pile-empty">비었음</div>}
              <div className="pile-label">버린 더미 {bot?.discard.length ?? 0}장</div>
            </div>
            <div className="deck-box">
              <div className="pile-empty">♻ {bot?.retired.length ?? 0}장</div>
              <div className="pile-label">제거됨</div>
            </div>
          </div>
          <div className="hint">보유 VP 약 {scorePlayer(bot ?? g.players[0]).vp} · AWS {scorePlayer(bot ?? g.players[0]).awsCount}장</div>
        </section>
      </div>

      {/* P0-1: 하단 고정 액션바 */}
      {!me?.isBot && g.phase === 'PLAY' && !g.gameOver && (
        <div className="actionbar">
          <Tip text="핸드를 전부 내어 콤보를 극대화합니다. 이후에는 폐기할 수 없으니, 폐기 조건이면 먼저 폐기하세요."><button className="btn primary" onClick={playAll}>▶ 전체 내기 (콤보!)</button></Tip>
          {retireOk && !retireMode && <Tip text="공식 룰: 턴 시작·시작핸드 5장 한정. 핸드 빌더 > 온프렘이면 핸드에서 온프렘 1장 영구 제거. 제거 시 이번 턴 도입 ≥1 필수."><button className="btn warn" onClick={() => setRetireMode(true)}>♻ 온프렘 폐기 (핸드 빌더 {hc.builder} &gt; 온프렘 {hc.onprem} — 핸드에서 1장)</button></Tip>}
          {retireMode && <span className="pill">핸드에서 온프렘 1장 클릭 (시작핸드 한정·공개 확인)</span>}
          {retireMode && <button className="btn ghost" onClick={() => { setRetireMode(false); skipRetire(); }}>폐기 건너뛰기</button>}
          {mustAdopt && adoptUsed === 0
            ? <Tip text="폐기했으니 도입을 최소 1회 해야 턴을 종료할 수 있습니다. 콘솔에서 카드를 가져오세요."><button className="btn gold locked" aria-disabled="true" onClick={endTurn}>⏭ 턴 종료 (도입 필요)</button></Tip>
            : <Tip text="낸 카드 + 남은 핸드를 전부 버린 더미로(CFM은 제거), 5장을 뽑고 턴을 넘깁니다."><button className="btn gold" onClick={endTurn}>⏭ 턴 종료 → 정리하고 5장 뽑기</button></Tip>}
        </div>
      )}

      {/* P0-4: 구조화 로그 */}
      <section className="log">
        {[...g.log].slice(-30).reverse().map((l, i) => {
          const hot = l.includes('획득') || l.includes('WA');
          const icon = l.includes('획득') ? '🏆'
            : l.includes('폐기') ? '♻'
            : l.includes('도입') || l.includes('가져옴') || l.includes('블라인드') ? '📥'
            : l.includes('턴 종료') ? '⏭'
            : l.includes('드래프트') ? '☁️'
            : l.includes('셔플') ? '🔀'
            : l.includes('⚠️') ? '' : '•';
          return <div key={i} className={hot ? 'log-hot' : ''}>{icon} {l}</div>;
        })}
      </section>

      {/* CDK modal */}
      {cdkMode && (
        <div className="overlay">
          <div className="panel">
            <h3>🛠 AWS CDK — 버린 더미 1장 → 덱 맨 위로</h3>
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
            <div className="zoom-cap">{CARD_MAP[zoom.cardId]?.name} · Esc/바깥 클릭으로 닫기</div>
            <button className="btn ghost" onClick={() => setZoom(null)}>닫기</button>
          </div>
        </div>
      )}

      {/* Game over */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {g.gameOver && (
        <div className="overlay">
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel big">
            <h1>🏆 게임 종료 — 마지막 WA 획득!</h1>
            {g.players.map((p) => {
              const s = scorePlayer(p);
              const win = p.id === g.winnerId;
              return <div key={p.id} className={`score ${win ? 'win' : ''}`}>{win ? '👑 ' : ''}{p.name} — {s.vp} VP · AWS 카드 {s.awsCount}장 {win && '(승리)'}</div>;
            })}
            <button className="btn primary" onClick={() => start([false, true])}>↻ 다시 하기 (PVE)</button>
            <p className="pvpn">PVP 모드: 같은 엔진·같은 액션 스펙으로 WebSocket 서버만 붙이면 즉시 확장 가능 (state JSON 직렬화 완료).</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
