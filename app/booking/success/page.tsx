'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SiteHeader } from '@/components/site/SiteHeader';
import { confirmPaymentClient } from '@/lib/client/pay';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      const p = new URLSearchParams(window.location.search);
      const paymentKey = p.get('paymentKey');
      const orderId = p.get('orderId');
      const amount = Number(p.get('amount'));
      if (!paymentKey || !orderId || !Number.isInteger(amount)) {
        throw new Error('INVALID');
      }
      // 서버에서 토스 승인 재검증 + 예약 확정
      await confirmPaymentClient({ paymentKey, orderId, amount });
      router.replace(`/booking/complete?n=${encodeURIComponent(orderId)}`);
    };
    run().catch((e: unknown) => {
      setError(
        e instanceof Error && e.message === 'INVALID'
          ? '결제 정보가 올바르지 않습니다.'
          : '결제 승인에 실패했습니다. 결제가 이뤄졌다면 자동으로 환불됩니다.',
      );
    });
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        {!error ? (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
            <p className="mt-5 text-muted">결제를 확인하고 있습니다…</p>
          </>
        ) : (
          <Card className="w-full p-6">
            <h1 className="text-lg font-bold text-ink">결제를 완료하지 못했습니다</h1>
            <p className="mt-2 text-sm text-muted">{error}</p>
            <Link href="/booking" className="mt-5 block">
              <Button size="lg">다시 예약하기</Button>
            </Link>
          </Card>
        )}
      </main>
    </div>
  );
}
