import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-5xl px-5 py-10 text-sm text-subtle">
        <p className="font-semibold text-muted">알펜시아 BBQ</p>
        <p className="mt-2 leading-relaxed">
          운영일 금·토 (성수기 주중 운영 · 동계 휴장) / 1부 17:00~19:00 · 2부 19:30~21:30
          <br />
          전액 선결제 · 회차당 2시간 · 환불 규정은 예약 시 안내됩니다.
          <br />
          예약·문의 033-339-0616 / 033-339-0664 (11:00~19:00)
        </p>

        {/* 전자상거래법 제10조 사업자 정보. 통신판매업 신고번호는 신고 후 추가. */}
        <div className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-subtle">
          <p>주식회사 에이비씨웍스글로벌 | 대표 황혜진 | 사업자등록번호 442-87-01602</p>
          <p>서울특별시 강서구 마곡중앙로 171, 5층 513호 씨(마곡동)</p>
          <p>
            이메일{' '}
            <a href="mailto:campingclub2020@naver.com" className="hover:text-muted hover:underline">
              campingclub2020@naver.com
            </a>{' '}
            | 개인정보보호책임자 황혜진
          </p>
          {/* TODO: 통신판매업 신고 후 신고번호 추가 (예: 통신판매업신고 제2025-서울강서-XXXX호) */}
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
