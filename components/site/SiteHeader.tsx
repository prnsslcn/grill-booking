import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-bold text-ink">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm text-white">
            G
          </span>
          <span>그릴 리조트</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/booking" className="rounded-lg px-3 py-2 text-muted hover:bg-line-soft hover:text-ink">
            예약하기
          </Link>
          <Link
            href="/booking/lookup"
            className="rounded-lg px-3 py-2 text-muted hover:bg-line-soft hover:text-ink"
          >
            예약조회
          </Link>
        </nav>
      </div>
    </header>
  );
}
