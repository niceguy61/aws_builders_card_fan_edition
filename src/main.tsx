import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App.tsx'
import Observer from './observer/Observer.tsx'
import Introduce from './introduce/Introduce.tsx'

function Root() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // #observer: 매트 배경 관전 뷰 / #introduce: 소개 페이지 (같은 탭·같은 스토어)
  const view = hash === '#observer' ? <Observer /> : hash === '#introduce' ? <Introduce /> : <App />;
  return (
    <StrictMode>
      {/* P0-6: OS 모션 감소 설정을 framer-motion에 전달 */}
      <MotionConfig reducedMotion="user">{view}</MotionConfig>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />)
