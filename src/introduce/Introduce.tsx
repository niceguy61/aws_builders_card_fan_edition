import { ruleSections } from '../components/Rulebook';
import { useLocale } from '../i18n';
import type { Locale } from '../i18n';

const BUY: [string, string][] = [
  ['미국', 'https://www.amazon.com/dp/B0F13C68J6'],
  ['독일', 'https://www.amazon.de/dp/B0F13C68J6'],
  ['프랑스', 'https://www.amazon.fr/dp/B0F13C68J6'],
  ['이탈리아', 'https://www.amazon.it/dp/B0F13C68J6'],
  ['스페인', 'https://www.amazon.es/dp/B0F13C68J6'],
  ['네덜란드', 'https://www.amazon.nl/dp/B0F13C68J6'],
  ['폴란드', 'https://www.amazon.pl/dp/B0F13C68J6'],
  ['스웨덴', 'https://www.amazon.se/dp/B0F13C68J6'],
  ['벨기에', 'https://www.amazon.com.be/dp/B0F13C68J6'],
  ['사우디', 'https://www.amazon.sa/dp/B0F13C68J6'],
  ['UAE', 'https://www.amazon.ae/dp/B0F13C68J6'],
  ['싱가포르', 'https://www.amazon.sg/dp/B0F13C68J6'],
  ['호주', 'https://www.amazon.com.au/dp/B0F13C68J6'],
  ['멕시코', 'https://www.amazon.com.mx/dp/B0F13C68J6'],
];

const BUY_EN = ['USA', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Poland', 'Sweden', 'Belgium', 'Saudi Arabia', 'UAE', 'Singapore', 'Australia', 'Mexico'];

const LEARN: [string, string, string][] = [
  ['공식 페이지', 'https://aws.amazon.com/gametech/buildercards/', '게임·확장팩·매트 다운로드 총집합'],
  ['기본 룰 PDF', 'https://pages.awscloud.com/rs/112-TZM-766/images/AWS-buildercards-rules_2024.pdf', '공식 룰북 (온라인 최신판)'],
  ['빌더 가이드라인', 'https://pages.awscloud.com/rs/112-TZM-766/images/awsi-2025-AWSBuilderCards-BuildersGuideline.pdf', '아키텍처·콤보 판정 기준 (2025-04-02)'],
  ['퀵레퍼런스 A5', 'https://pages.awscloud.com/rs/112-TZM-766/images/AWS-BuilderCards-Quickreference-A5.pdf', '한 장 요약 판'],
  ['플레이 방법 영상', 'https://www.youtube.com/watch?v=bYCsNjrcTbE', '클라우드 도입 턴 배우기'],
];

const LEARN_EN: [string, string, string][] = [
  ['Official page', 'https://aws.amazon.com/gametech/buildercards/', 'Game, expansions, mat downloads'],
  ['Base rules PDF', 'https://pages.awscloud.com/rs/112-TZM-766/images/AWS-buildercards-rules_2024.pdf', 'Official rulebook (online edition)'],
  ['Builder Guideline', 'https://pages.awscloud.com/rs/112-TZM-766/images/awsi-2025-AWSBuilderCards-BuildersGuideline.pdf', 'Architecture & combo rulings (2025-04-02)'],
  ['Quick Reference A5', 'https://pages.awscloud.com/rs/112-TZM-766/images/AWS-BuilderCards-Quickreference-A5.pdf', 'One-page summary'],
  ['How-to-play video', 'https://www.youtube.com/watch?v=bYCsNjrcTbE', 'Learn the cloud-adoption turn'],
];

const BLOGS: [string, string, string][] = [
  ['AWS News (2024-11-11)', 'https://aws.amazon.com/blogs/aws/aws-buildercards-second-edition-available-at-reinvent-2024-and-online/', '2판 발표: 밸런스 조정·TCO 폐지 요약'],
  ['DevelopersIO (일본어)', 'https://dev.classmethod.jp/articles/aws-builderCards-updates-reinvent2024/', '2판 변경점 정리'],
  ['AWS Builders Flash (일본어)', 'https://aws.amazon.com/jp/builders-flash/202405/japanese-builder-cards/', '일본어판 빌더카드 소개'],
];

const BLOGS_EN: [string, string, string][] = [
  ['AWS News (2024-11-11)', 'https://aws.amazon.com/blogs/aws/aws-buildercards-second-edition-available-at-reinvent-2024-and-online/', '2nd Edition launch: balance tuning, TCO removal'],
  ['DevelopersIO (Japanese)', 'https://dev.classmethod.jp/articles/aws-builderCards-updates-reinvent2024/', '2nd Edition changes roundup'],
  ['AWS Builders Flash (Japanese)', 'https://aws.amazon.com/jp/builders-flash/202405/japanese-builder-cards/', 'Japanese BuilderCards intro'],
];

const TIMELINE: [string, string][] = [
  ['초판 (1st Edition)', 'TCO(검정 코스트) + 크레딧(주황) 듀얼 재화로 즐기는 덱빌딩 등장. 온프레미스에서 클라우드로 현대화하며 Well-Architected 포인트를 겨루는 기본 틀 확립.'],
  ['2판 (re:Invent 2024)', 'TCO 폐지·단일 크레딧으로 단순화. 온프렘 전용 카테고리, Virtual Machine 콤보 추가. Resilience 확장팩·애드온 전개, 룰은 온라인 우선으로 지속 업데이트.'],
  ['빌더 가이드라인 (2025-04-02)', '아키텍처·1:1 콤보·스택 판정 기준 문서화. 토너먼트급 판정 표준.'],
  ['팬 에디션 (본 프로젝트)', '오프라인과 동일한 룰의 웹 구현. PVE vs CPU 봇 → PVP 확장 로드맵, 매트 배경 관전 뷰 포함.'],
];

const TIMELINE_EN: [string, string][] = [
  ['1st Edition', 'Deck-building with dual currency: TCO (black) + credits (orange). Modernize from on-premises to cloud for Well-Architected points.'],
  ['2nd Edition (re:Invent 2024)', 'TCO removed, single credit. Dedicated on-prem category, Virtual Machine combo. Resilience expansion + add-ons, online-first rules.'],
  ['Builder Guideline (2025-04-02)', 'Architecture, 1:1 combo, and stack rulings documented. Tournament-grade standard.'],
  ['Fan Edition (this project)', 'Web implementation with offline-identical rules. PVE vs CPU bot → PVP roadmap, mat-background spectator view.'],
];

function LinkGrid({ items }: { items: [string, string, string?][] }) {
  return (
    <div className="intro-grid">
      {items.map(([t, href, d]) => (
        <a key={t + href} className="intro-card" href={href} target="_blank" rel="noreferrer">
          <b>{t}</b>
          {d && <span>{d}</span>}
        </a>
      ))}
    </div>
  );
}

function T(locale: Locale) {
  const ko = locale === 'ko';
  return {
    brandSub: ko ? '2판 · 비공식 웹 구현' : '2nd Ed · unofficial web port',
    goGame: ko ? '🎮 게임하기' : '🎮 Play',
    goObserver: ko ? '👁 관전' : '👁 Spectate',
    goLocale: ko ? '🌐 English' : '🌐 한국어',
    heroSubA: ko
      ? '온프레미스에서 시작해 AWS 아키텍처를 쌓고,'
      : 'Start on-premises, build AWS architectures,',
    heroSubB: ko
      ? 'Well-Architected 포인트를 겨루는 덱빌딩 카드 게임의 웹 구현입니다.'
      : 'and compete for Well-Architected points — on the web.',
    ctaPlay: ko ? '🎮 바로 플레이 (PVE)' : '🎮 Play now (PVE)',
    ctaObs: ko ? '👁 매트 관전 뷰' : '👁 Mat spectator view',
    fanT: ko ? '📢 팬 에디션 고지' : '📢 Fan-edition notice',
    fanB: ko ? (
      <>본 프로젝트는 <b>비공식 팬 메이드 디지털 에디션</b>입니다. AWS 및 관련 상표·카드 아트는 Amazon.com, Inc. 또는 계열사의 자산이며, 본 프로젝트는 AWS와 무관합니다. 실물 카드는 아래 공식 판매처에서 구매해 주세요.</>
    ) : (
      <>This project is an <b>unofficial fan-made digital edition</b>. AWS trademarks and card artwork belong to Amazon.com, Inc. or its affiliates; this project is not affiliated with AWS. Please buy physical cards from the official sellers below.</>
    ),
    histT: ko ? '🕘 AWS BuilderCards 역사' : '🕘 AWS BuilderCards history',
    buyT: ko ? '🛒 실물 게임 구매처 (Amazon)' : '🛒 Buy the physical game (Amazon)',
    learnT: ko ? '📚 룰·가이드 배우기' : '📚 Rules & guides',
    blogT: ko ? '✍️ 관련 블로그' : '✍️ Related blogs',
    rulesT: ko ? '🎯 이 팬 에디션의 핵심 룰 (공식 동일)' : '🎯 Key rules of this fan edition (official-identical)',
    again: ko ? '🎮 게임 시작하기' : '🎮 Start playing',
    feedback: ko ? '피드백' : 'Feedback',
    contact: ko ? '문의' : 'Contact',
    survey: ko ? '공식 설문' : 'Official survey',
  };
}

export default function Introduce() {
  const goGame = () => { window.location.hash = ''; };
  const goObserver = () => { window.location.hash = '#observer'; };
  const locale = useLocale((s) => s.locale);
  const toggleLocale = useLocale((s) => s.toggle);
  const t = T(locale);
  const ko = locale === 'ko';
  const buy = BUY.map(([_, href], i) => [(ko ? BUY[i][0] : BUY_EN[i]), href, 'amazon'] as [string, string, string]);
  return (
    <div className="table intro">
      <header className="hud">
        <div className="brand">☁️ <b>AWS {ko ? '빌더카드' : 'BuilderCards'} {ko ? '팬 에디션' : 'Fan Edition'}</b> <span className="ed">{t.brandSub}</span></div>
        <div className="hud-actions">
          <button className="btn primary" onClick={goGame}>{t.goGame}</button>
          <button className="btn ghost" onClick={goObserver}>{t.goObserver}</button>
          <button className="btn ghost" onClick={toggleLocale}>{t.goLocale}</button>
        </div>
      </header>

      <section className="intro-hero">
        <h1>AWS BuilderCards<br />2nd Edition — Fan Edition</h1>
        <p>{t.heroSubA}<br />{t.heroSubB}</p>
        <div className="intro-cta">
          <button className="btn primary" onClick={goGame}>{t.ctaPlay}</button>
          <button className="btn ghost" onClick={goObserver}>{t.ctaObs}</button>
        </div>
      </section>

      <section className="zone fan-box">
        <div className="zone-title">{t.fanT}</div>
        <p>{t.fanB}</p>
      </section>

      <section className="zone">
        <div className="zone-title">{t.histT}</div>
        <div className="timeline">
          {(ko ? TIMELINE : TIMELINE_EN).map(([ti, d]) => (
            <div key={ti} className="tl-row">
              <b>{ti}</b>
              <span>{d}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="zone">
        <div className="zone-title">{t.buyT}</div>
        <LinkGrid items={buy} />
      </section>

      <section className="zone">
        <div className="zone-title">{t.learnT}</div>
        <LinkGrid items={ko ? LEARN : LEARN_EN} />
      </section>

      <section className="zone">
        <div className="zone-title">{t.blogT}</div>
        <LinkGrid items={ko ? BLOGS : BLOGS_EN} />
      </section>

      <section className="zone">
        <div className="zone-title">{t.rulesT}</div>
        <div className="rules-body">
          {ruleSections(locale).map((s) => (
            <div key={s.title} className="rules-sec">
              <h3>{s.title}</h3>
              <ul>{s.body.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="intro-cta">
          <button className="btn primary" onClick={goGame}>{t.again}</button>
        </div>
      </section>

      <footer className="intro-foot">
        Fan-made project. Not affiliated with Amazon Web Services.
        {t.feedback}: <a href="https://pulse.aws/survey/UCQCKELH" target="_blank" rel="noreferrer">{t.survey}</a>
        {' · '}{t.contact}: <a href="mailto:aws-buildercards@amazon.com">aws-buildercards@amazon.com</a>
      </footer>
    </div>
  );
}
