import type { Metadata } from 'next';
import { Alfa_Slab_One } from 'next/font/google';

import './globals.css';
import 'lenis/dist/lenis.css';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { ScrollResetOnNavigate } from '@/components/site/ScrollResetOnNavigate';

// 캠프·그릴·숲 컨셉의 묵직한 슬랩 세리프. 영문 브랜드 워드마크에 사용(대소문자 구분).
const brandFont = Alfa_Slab_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-brand',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '알펜시아 BBQ — 예약',
  description:
    '대관령 알펜시아 BBQ — 야외 테이블·타프·카바나에서 즐기는 프리미엄 BBQ. 금·토 운영, 2부제 사전 예약.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full antialiased ${brandFont.variable}`}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="min-h-full">
        {/* 새로고침·재접속 시 항상 최상단에서 로드(브라우저 스크롤 복원 비활성화). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `history.scrollRestoration='manual';window.scrollTo(0,0);`,
          }}
        />
        <ScrollResetOnNavigate />
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
