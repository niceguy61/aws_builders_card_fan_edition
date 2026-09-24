import { useEffect } from 'react';
import { useGame } from '../store/useGame';
import BuilderCard from '../components/BuilderCard';
import { calcBoard, scorePlayer } from '../game/engine';
import { botDraftPick } from '../game/bot';
import type { CardInstance } from '../game/engine';

// 매트 % 좌표 (mat-2p.png 8401x7201 기준 실측)
const Z = {
  freeDeck: { left: '27%', top: '7%', width: '9%', height: '17%' },
  waDeck: { left: '56%', top: '7%', width: '9%', height: '17%' },
  costDeck: { left: '66%', top: '7%', width: '9%', height: '17%' },
  slots: [
    { left: '18%', top: '27%', width: '9%', height: '15%' },
    { left: '28%', top: '27%', width: '9%', height: '15%' },
    { left: '38%', top: '27%', width: '9%', height: '15%' },
    { left: '48%', top: '27%', width: '9%', height: '15%' },
    { left: '58%', top: '27%', width: '9%', height: '15%' },
    { left: '68%', top: '27%', width: '9%', height: '15%' },
  ],
  arch: { left: '18%', top: '46%', width: '59%', height: '50%' },
  leftRes: { left: '2.5%', top: '34%', width: '13.5%', height: '10%' },
  leftPlayer: { left: '2.5%', top: '47%', width: '13.5%', height: '32%' },
  leftDiscard: { left: '2.5%', top: '82%', width: '13.5%', height: '14%' },
  leftChar: { left: '2.5%', top: '7%', width: '13.5%', height: '24%' },
  rightDiscard: { left: '82%', top: '7%', width: '15%', height: '12%' },
  rightPlayer: { left: '82%', top: '21%', width: '15%', height: '31%' },
  rightRes: { left: '82%', top: '55%', width: '15%', height: '11%' },
  rightChar: { left: '82%', top: '69%', width: '15%', height: '27%' },
};

function ObsCard({ card, scale = 0.42 }: { card: CardInstance; scale?: number }) {
  return (
    <div className="obs-card" style={{ width: 187 * scale, height: 283 * scale }}>
      <div style={{ scale: String(scale), transformOrigin: 'top left', width: 187 }}>
        <BuilderCard small card={card} />
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="obs-tag">{children}</span>;
}

export default function Observer() {
  const g = useGame((s) => s.g);
  const draftPick = useGame((s) => s.draftPick);
  const botStep = useGame((s) => s.botStep);
  const me = g.players[g.current];
  const human = g.players[0];
  const bot = g.players[1] ?? g.players[0];
  const board = calcBoard(me?.played ?? []);
  const sH = scorePlayer(human);
  const sB = scorePlayer(bot);

  // 게임 뷰와 동일한 자동 진행 (봇 턴·봇 드래프트)
  useEffect(() => {
    if (g.phase === 'DRAFT' && me?.isBot) {
      const t = setTimeout(() => {
        const pick = botDraftPick(g as any, g.current);
        if (pick) draftPick(pick);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [g, me, draftPick]);
  useEffect(() => {
    if (g.phase === 'PLAY' && !g.gameOver && me?.isBot) {
      const t = setTimeout(() => botStep(), 1400);
      return () => clearTimeout(t);
    }
  }, [g, me, botStep]);

  const goGame = () => { window.location.hash = ''; };
  const cur = me;

  return (
    <div className="obs">
      <div className="obs-stage">
        <img src="/mat/mat-2p.png" className="obs-mat" alt="2P game mat" draggable={false} />

        {/* 콘솔 덱 */}
        <div className="obs-zone" style={Z.freeDeck}><Tag>무료 {g.freeDeck.length}</Tag></div>
        <div className="obs-zone" style={Z.costDeck}><Tag>유료 {g.costDeck.length}</Tag></div>
        <div className="obs-zone" style={Z.waDeck}>
          {g.waStack[0] && <ObsCard card={{ uid: 'ob-wa', cardId: g.waStack[0] }} scale={0.32} />}
          <Tag>WA {g.waStack.length}</Tag>
        </div>

        {/* 슬롯 4+1 (+확장팩 1 비움) */}
        {g.consoleFree.slice(0, 4).map((p, i) => (
          <div className="obs-zone" key={p.cardId + i} style={Z.slots[i]}>
            <ObsCard card={{ uid: `ob-s${i}`, cardId: p.cardId }} />
            {p.count > 1 && <Tag>x{p.count}</Tag>}
          </div>
        ))}
        <div className="obs-zone" style={Z.slots[4]}>
          {g.consoleCost && <ObsCard card={{ uid: 'ob-cost', cardId: g.consoleCost.cardId }} />}
        </div>
        <div className="obs-zone" style={Z.slots[5]}><Tag>확장팩용 · 비움</Tag></div>

        {/* 아키텍처 (현재 턴 플레이어) */}
        <div className="obs-zone obs-arch" style={Z.arch}>
          <div className="obs-fan">
            {(cur?.played ?? []).map((c) => <ObsCard key={c.uid} card={c} scale={0.36} />)}
          </div>
          <Tag>{cur?.name} {board.credits}⚡ · 도입 {cur?.adoptsLeft}</Tag>
        </div>

        {/* 왼쪽 = 나 */}
        <div className="obs-zone" style={Z.leftRes}><Tag>자원 {human.resourceDeck.length}</Tag></div>
        <div className="obs-zone obs-col" style={Z.leftPlayer}>
          <div className="obs-fan">
            {human.hand.map((c) => <ObsCard key={c.uid} card={c} scale={0.3} />)}
          </div>
          <Tag>나 · 핸드 {human.hand.length}</Tag>
        </div>
        <div className="obs-zone" style={Z.leftDiscard}>
          {human.discard.length > 0 && <ObsCard card={human.discard[human.discard.length - 1]} scale={0.32} />}
          <Tag>버림 {human.discard.length}</Tag>
        </div>
        <div className="obs-zone" style={Z.leftChar}>
          <Tag>나 VP {sH.vp} · 제거 {human.retired.length}</Tag>
        </div>

        {/* 오른쪽 = 봇 */}
        <div className="obs-zone" style={Z.rightRes}><Tag>자원 {bot.resourceDeck.length}</Tag></div>
        <div className="obs-zone obs-col" style={Z.rightPlayer}>
          <div className="obs-fan">
            {bot.hand.map((c) => <ObsCard key={c.uid} card={c} scale={0.3} />)}
          </div>
          <Tag>{bot.name} · 핸드 {bot.hand.length}</Tag>
        </div>
        <div className="obs-zone" style={Z.rightDiscard}>
          {bot.discard.length > 0 && <ObsCard card={bot.discard[bot.discard.length - 1]} scale={0.32} />}
          <Tag>버림 {bot.discard.length}</Tag>
        </div>
        <div className="obs-zone" style={Z.rightChar}>
          <Tag>{bot.name} VP {sB.vp} · 제거 {bot.retired.length}</Tag>
        </div>

        {g.gameOver && (
          <div className="obs-over">
            🏆 {g.players.find((p) => p.id === g.winnerId)?.name} 승리!
          </div>
        )}
      </div>

      <aside className="obs-side">
        <h2>👁 관전</h2>
        <div className="pill">{g.turnNumber}턴 · {me?.name}</div>
        <div className="pill gold">⚡ {me?.credits ?? 0}</div>
        <div className="pill blue">도입 {me?.adoptsLeft ?? 0}</div>
        <div className="pill vp">🏆 WA {g.waStack.length}</div>
        {g.phase === 'DRAFT' && <div className="hint">드래프트 중… (게임 화면에서 선택)</div>}
        {g.phase === 'PLAY' && !me?.isBot && !g.gameOver && (
          <div className="hint">나의 턴 — 🎮 게임으로 돌아가서 진행하세요.</div>
        )}
        <div className="obs-feed">
          {(g.lastEvents ?? []).map((e, i) => <div key={i} className="combo-chip">✦ {e.text}</div>)}
        </div>
        <div className="log obs-log">
          {[...g.log].slice(-10).reverse().map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <button className="btn primary" onClick={goGame}>🎮 게임으로</button>
      </aside>
    </div>
  );
}
