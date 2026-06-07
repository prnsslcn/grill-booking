import type { Metadata } from 'next';

import './globals.css';

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
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
