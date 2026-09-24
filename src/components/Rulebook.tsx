import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocale, tr } from '../i18n';
import type { Locale } from '../i18n';

// 공식 룰북 (rules_2024 PDF + Quick Reference A5) 기반 핵심 요약
export interface RuleSection {
  title: string;
  body: string[];
}

export function ruleSections(locale: Locale): RuleSection[] {
  if (locale === 'en') {
    return [
      { title: '🎯 Goal', body: ['Collect Well-Architected (WA) cards for Victory Points (VP).', 'The game ends the moment the last WA card is taken → most VP wins, ties broken by most AWS cards.'] },
      { title: '🃏 Setup', body: ['10 on-prem + 2 free console picks → shuffle 12 into a deck, draw 5.', 'Console: 4 free slots + 1 paid slot. Duplicates stack, instant refill on buy.', 'WA pile: 1VP on top, 3VP below (2P: 4×1VP + 3×3VP).'] },
      { title: '🔄 Turn order (official)', body: ['① Retire: turn start, starting 5-card hand only. Hand Builder > On-Prem (3vs2, 4vs1) → exile 1 On-Prem from hand. Must adopt ≥1 after retiring.', '② Build: play cards to form architectures. Base credits + combos (⚡·draw·adopt).', '③ Adopt: 1 per turn by default. Pay ⚡ at console, WA, or blind. Bought cards go to discard.', '④ Cleanup: discard everything played + in hand (CFM is exiled), draw 5. Reshuffle discard when empty.'] },
      { title: '⚡ EC2 stacking', body: ['1× EC2 = 2⚡ · 2× = 5⚡ · 3× = 10⚡ + 1 adoption.'] },
      { title: '⚠️ Special cards', body: ['Fargate (0⚡): no solo combos, needs ECS/EKS.', 'EC2 Auto Scaling: no solo combos, 4⚡ on top of EC2.', 'Cloud Financial Mgmt: +1 adoption, exiled at turn end.', 'AWS CDK: 1 discard → deck top.', 'Well-Architected Tool: WA discount this turn (1VP=2⚡, 3VP=6⚡).'] },
      { title: '🏆 End & scoring', body: ['Last WA taken = immediate end. Total VP in deck, hand, and discard.'] },
    ];
  }
  return [
    {
      title: '🎯 목표',
      body: [
        'Well-Architected(WA) 카드를 모아 승점(VP)을 겨룹니다.',
        '마지막 WA 카드가 팔리는 즉시 게임 종료 → VP 합산, 동점이면 AWS 카드가 많은 쪽이 승리.',
      ],
    },
    {
      title: '🃏 준비',
      body: [
        '온프렘 10장 + 콘솔 무료 2픽 → 12장을 섞어 덱으로, 5장을 뽑고 시작.',
        '콘솔: 무료 4슬롯 + 유료 1슬롯. 같은 카드는 겹쳐 쌓이고, 사면 즉시 리필.',
        'WA 더미: 1VP가 위, 3VP가 아래 (2인: 1VP×4 + 3VP×3).',
      ],
    },
    {
      title: '🔄 턴 순서 (공식 순서)',
      body: [
        '① 폐기: 턴 시작·시작핸드 5장 한정. 핸드 빌더(AWS) > 온프렘(3vs2·4vs1)이면 핸드에서 온프렘 1장 영구 제거. 제거했으면 이번 턴 도입 ≥1 필수.',
        '② 건축: 핸드에서 카드를 내어 아키텍처 구성. 기본 크레딧 + 콤보(⚡·뽑기·도입) 발동. 낸 카드는 되돌릴 수 없음.',
        '③ 도입: 기본 1회. ⚡를 내고 콘솔(무료/유료)·WA·블라인드 중 가져옴. 산 카드는 버린 더미로.',
        '④ 정리: 낸 카드 + 남은 핸드를 전부 버린 더미로(CFM은 게임에서 제거), 5장 뽑기. 덱이 비면 버린 더미를 섞어 새 덱으로.',
      ],
    },
    {
      title: '⚡ EC2 스택',
      body: ['EC2 1장 = 2⚡ · 2장 = 5⚡ · 3장 = 10⚡ + 도입 1회.'],
    },
    {
      title: '⚠️ 특수 카드',
      body: [
        'Fargate(0⚡): 단독 콤보 불가, ECS/EKS와 함께만 발동.',
        'EC2 Auto Scaling: 단독 콤보 불가, EC2 위에서 4⚡.',
        'Cloud Financial Mgmt: 도입 +1, 턴 종료 시 게임에서 제거.',
        'AWS CDK: 버린 더미 1장을 덱 맨 위로.',
        'Well-Architected Tool: 이번 턴 WA 할인 (1VP=2⚡, 3VP=6⚡).',
      ],
    },
    {
      title: '🏆 종료·점수',
      body: ['마지막 WA 획득 = 즉시 종료. 덱·핸드·버린 더미의 WA를 합산.'],
    },
  ];
}

// Backwards-compatible alias (KO default)
export const RULEBOOK_SECTIONS: RuleSection[] = ruleSections('ko');

// P0-5: 호버 + 포커스 + 터치(탭 토글) 대응, 가장자리 플립
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<'c' | 'l' | 'r'>('c');
  const ref = useRef<HTMLSpanElement>(null);
  const place = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.left < 170) setAlign('l');
    else if (window.innerWidth - r.right < 170) setAlign('r');
    else setAlign('c');
  };
  return (
    <span
      ref={ref}
      className={`tip align-${align}${open ? ' open' : ''}`}
      tabIndex={0}
      onClick={(e) => {
        // 버튼·링크 클릭(구매 등)은 액션만, 그 외 탭은 툴팁 토글
        if ((e.target as HTMLElement).closest('button, a')) return;
        place();
        setOpen((o) => !o);
      }}
      onBlur={() => setOpen(false)}
      onMouseEnter={place}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(); setOpen((o) => !o); }
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      {children}
      <span className="tip-bubble">{text}</span>
    </span>
  );
}

export function RulesModal({ onClose }: { onClose: () => void }) {
  const locale = useLocale((s) => s.locale);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel rules-panel" onClick={(e) => e.stopPropagation()}>
        <h2>{tr(locale, 'modalTitle')} <span className="ed">{tr(locale, 'modalEd')}</span></h2>
        <div className="rules-body">
          {ruleSections(locale).map((s) => (
            <section key={s.title} className="rules-sec">
              <h3>{s.title}</h3>
              <ul>
                {s.body.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <button className="btn primary" onClick={onClose}>{tr(locale, 'close')}</button>
      </div>
    </div>
  );
}
