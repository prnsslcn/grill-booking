import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: '아세아 그릴 리조트 — 예약',
  description:
    '고기세트가 포함된 타프 텐트·캐빈 하우스·트레일러를 온라인으로 예약하세요. 금·토 운영, 2부제.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
