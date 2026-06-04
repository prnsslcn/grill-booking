'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  PAYMENTS_FAKE,
  PayError,
  payAndConfirm,
  reserveSlotClient,
} from '@/lib/client/pay';
import { initTossWidgets, type TossWidgets } from '@/lib/client/toss-widget';
import { formatDateKorean, formatWon } from '@/lib/format';
import { PARTS, type Part } from '@/types/domain';

interface Props {
  selected: { slotId: string; facilityName: string; price: number; part: Part };
  date: string;
  guest: { name: string; phone: string; count: number };
  onSlotTaken: () => void;
}

function mapError(code: string): string {
  if (code === 'SLOT_TAKEN') return '선택하신 슬롯이 방금 마감되었습니다. 다시 선택해 주세요.';
  if (code === 'PRICE_NOT_SET') return '해당 시설은 현재 예약을 받지 않습니다.';
  return '결제 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

export function PaymentStep({ selected, date, guest, onSlotTaken }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const widgetsRef = useRef<TossWidgets | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);

  // real 모드: 위젯 렌더
  useEffect(() => {
    if (PAYMENTS_FAKE) return;
    let cancelled = false;
    (async () => {
      try {
        const widgets = await initTossWidgets(selected.price);
        if (cancelled) return;
        widgetsRef.current = widgets;
        await Promise.all([
          widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
          widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
        ]);
        if (!cancelled) setWidgetReady(true);
      } catch {
        if (!cancelled) setError('결제 위젯을 불러오지 못했습니다. 키 설정을 확인해 주세요.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected.price]);

  async function payFake() {
    setSubmitting(true);
    setError('');
    try {
      const { bookingNumber } = await payAndConfirm({
        slotId: selected.slotId,
        guestName: guest.name,
        guestPhone: guest.phone,
        guestCount: guest.count,
      });
      router.push(`/booking/complete?n=${encodeURIComponent(bookingNumber)}`);
    } catch (err) {
      const code = err instanceof PayError ? err.code : 'UNKNOWN';
      setError(mapError(code));
      if (code === 'SLOT_TAKEN') onSlotTaken();
    } finally {
      setSubmitting(false);
    }
  }

  async function payReal() {
    const widgets = widgetsRef.current;
    if (!widgets) return;
    setSubmitting(true);
    setError('');
    try {
      // 1) 선점 → orderId 확보
      const { orderId } = await reserveSlotClient({
        slotId: selected.slotId,
        guestName: guest.name,
        guestPhone: guest.phone,
        guestCount: guest.count,
      });
      // 2) 토스 결제창 호출(성공 시 successUrl로 리다이렉트 → 서버 confirm)
      await widgets.requestPayment({
        orderId,
        orderName: `${selected.facilityName} ${formatDateKorean(date)} ${PARTS[selected.part].label}`,
        successUrl: `${window.location.origin}/booking/success`,
        failUrl: `${window.location.origin}/booking/fail`,
        customerName: guest.name,
        customerMobilePhone: guest.phone.replace(/\D/g, ''),
      });
    } catch (err) {
      // 예약 실패(SLOT_TAKEN 등) 또는 사용자가 결제창을 닫음
      const code = err instanceof PayError ? err.code : '';
      if (code) {
        setError(mapError(code));
        if (code === 'SLOT_TAKEN') onSlotTaken();
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-ink">결제</h2>
      <Card className="divide-y divide-line">
        <Row label="시설" value={selected.facilityName} />
        <Row label="일시" value={`${formatDateKorean(date)} · ${PARTS[selected.part].label}`} />
        <Row label="예약자" value={`${guest.name} (${guest.count}명)`} />
        <div className="flex items-center justify-between p-5">
          <span className="font-semibold text-ink">결제 금액</span>
          <span className="text-xl font-extrabold text-ink">{formatWon(selected.price)}</span>
        </div>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      {PAYMENTS_FAKE ? (
        <>
          <div className="rounded-xl bg-[#fff5e5] px-4 py-3 text-sm text-[#c2780f]">
            <Badge tone="warning">개발 모드</Badge> 실제 결제 대신 테스트 결제로 진행됩니다.
          </div>
          <Button size="lg" onClick={payFake} disabled={submitting}>
            {submitting ? '처리 중…' : `${formatWon(selected.price)} 결제하기`}
          </Button>
        </>
      ) : (
        <>
          <div id="payment-method" />
          <div id="agreement" />
          <Button size="lg" onClick={payReal} disabled={submitting || !widgetReady}>
            {submitting ? '결제창 여는 중…' : widgetReady ? `${formatWon(selected.price)} 결제하기` : '위젯 불러오는 중…'}
          </Button>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-5">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
