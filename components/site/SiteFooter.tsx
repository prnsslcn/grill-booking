import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-5xl px-5 py-10 text-sm text-subtle">
        <p className="font-semibold text-muted">알펜시아 BBQ</p>
        <p className="mt-2 leading-relaxed">
          운영일 금·토 (성수기 주중 운영(수 휴무) · 동계 휴장) / 1부 17:00~19:00 · 2부 19:30~21:30
          <br />
          전액 선결제 · 회차당 2시간 · 환불 규정은 예약 시 안내됩니다.
          <br />
          예약·문의 010-3045-2994 (11:00~19:00)
        </p>

        {/* 전자상거래법 제10조 사업자 정보 — 평소 접어두고, 클릭 시 펼침(정보 접근 가능하므로 법적 OK) */}
        <details className="group mt-6 border-t border-line pt-5">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-xs text-subtle marker:hidden [&::-webkit-details-marker]:hidden">
            사업자정보
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              className="transition-transform duration-200 group-open:rotate-180"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </summary>
          <div className="mt-3 text-xs leading-relaxed text-subtle">
            <p>주식회사 에이비씨웍스글로벌 | 대표 황혜진 | 사업자등록번호 442-87-01602</p>
            <p>통신판매업신고 제2021-서울강서-1055호</p>
            <p>서울특별시 강서구 마곡중앙로 171, 5층 513호 씨(마곡동)</p>
            <p>
              이메일{' '}
              <a href="mailto:campingclub2020@naver.com" className="hover:text-muted hover:underline">
                campingclub2020@naver.com
              </a>
            </p>
          </div>
        </details>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Link href="/terms" className="text-muted hover:underline">
            이용약관
          </Link>
          <Link href="/privacy" className="font-semibold text-muted hover:underline">
            개인정보처리방침
          </Link>
          <Link href="/refund-policy" className="text-muted hover:underline">
            취소·환불정책
          </Link>
        </div>

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
