import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-5xl px-5 py-10 text-sm text-subtle">
        <p className="font-semibold text-muted">그릴 리조트</p>
        <p className="mt-2 leading-relaxed">
          운영일 금·토 / 1부 17:00~19:00 · 2부 19:30~21:30
          <br />
          전액 선결제 · 환불 규정은 예약 시 안내됩니다.
        </p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-subtle">© 2026 ABC Works Global. All rights reserved.</p>
          <Link href="/admin/login" className="text-xs text-subtle hover:text-muted hover:underline">
            관리자 로그인
          </Link>
        </div>
      </div>
    </footer>
  );
}
