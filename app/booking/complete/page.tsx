import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SiteHeader } from '@/components/site/SiteHeader';

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-2xl text-accent">
          ✓
        </div>
        <h1 className="mt-5 text-2xl font-bold text-ink">예약이 확정되었습니다</h1>
        <p className="mt-2 text-muted">예약 내역은 문자로도 안내됩니다.</p>

        {n && (
          <Card className="mt-6 w-full p-5">
            <p className="text-sm text-muted">예약번호</p>
            <p className="mt-1 text-lg font-bold tracking-wide text-ink">{n}</p>
            <p className="mt-2 text-xs text-subtle">
              예약 조회·취소 시 예약번호와 연락처가 필요합니다.
            </p>
          </Card>
        )}

        <div className="mt-6 flex w-full gap-2">
          <Link href="/booking/lookup" className="flex-1">
            <Button variant="secondary" size="lg">
              예약 조회
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="ghost" size="lg">
              홈으로
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
