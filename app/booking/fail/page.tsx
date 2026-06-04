import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SiteHeader } from '@/components/site/SiteHeader';

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; code?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <Card className="w-full p-6">
          <h1 className="text-lg font-bold text-ink">결제가 완료되지 않았습니다</h1>
          <p className="mt-2 text-sm text-muted">
            {message ?? '결제가 취소되었거나 실패했습니다.'}
          </p>
          <p className="mt-1 text-xs text-subtle">선점된 자리는 잠시 후 자동으로 해제됩니다.</p>
          <Link href="/booking" className="mt-5 block">
            <Button size="lg">다시 예약하기</Button>
          </Link>
        </Card>
      </main>
    </div>
  );
}
